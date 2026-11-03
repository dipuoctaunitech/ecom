import { productImageApiPath } from "@/lib/images"
import {
  isAllowedImageContentType,
  isAllowedQrContentType,
  isAllowedReceiptContentType,
  isStoreFloorStaffOnly,
  MAX_UPLOAD_BYTES,
  requireSellerSession,
  requireUserSession,
  sanitizeUploadFilename,
} from "@/lib/auth-guards"
import { getClientIp } from "@/lib/client-ip"
import { rateLimit } from "@/lib/rate-limit"
import { assertBuyerCanUploadReceipt } from "@/lib/receipts"
import { putStoredObject } from "@/lib/object-store"
import { canManageStoreCatalog } from "@/lib/store"
import { NextResponse } from "next/server"

const UPLOAD_RATE_LIMIT = 20
const UPLOAD_WINDOW_MS = 60_000

type UploadPurpose = "product" | "qr" | "receipt" | "category" | "service"

function parsePurpose(value: FormDataEntryValue | null): UploadPurpose {
  if (
    value === "qr" ||
    value === "receipt" ||
    value === "category" ||
    value === "service"
  ) {
    return value
  }
  return "product"
}

function inferContentType(file: File): string {
  if (file.type) return file.type.split(";")[0]?.trim().toLowerCase() ?? ""
  const name = file.name.toLowerCase()
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  if (name.endsWith(".webp")) return "image/webp"
  if (name.endsWith(".gif")) return "image/gif"
  if (name.endsWith(".mp4")) return "video/mp4"
  if (name.endsWith(".webm")) return "video/webm"
  if (name.endsWith(".mov")) return "video/quicktime"
  return ""
}

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Upload the file through the app. Refresh the page and try again." },
      { status: 400 }
    )
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 })
  }

  const purpose = parsePurpose(form.get("purpose"))
  const filename = file.name || "upload"
  const contentType = inferContentType(file)
  const fileSize = file.size

  const session =
    purpose === "receipt" || purpose === "category" || purpose === "service"
      ? await requireUserSession()
      : await requireSellerSession()

  if (!session) {
    return NextResponse.json(
      {
        error:
          purpose === "receipt"
            ? "Sign in to upload a payment receipt."
            : purpose === "category"
              ? "Sign in to upload a category image."
              : purpose === "service"
                ? "Sign in to upload a service image."
                : "Unauthorized. Only sellers can upload product media.",
      },
      { status: 403 }
    )
  }

  if (purpose === "service") {
    const canManageStore = await canManageStoreCatalog(session.user.id)
    if (!canManageStore) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Only admins and store managers can upload service images.",
        },
        { status: 403 }
      )
    }
  }

  let storeCategoryUpload = false
  if (purpose === "category") {
    const scopeRaw = String(form.get("categoryScope") ?? "").toLowerCase()
    const wantsStoreScope = scopeRaw === "store"
    const canManageStore = await canManageStoreCatalog(session.user.id)
    const floorStaffOnly = await isStoreFloorStaffOnly(session.user.id)
    const isSeller =
      session.user.role === "SELLER" && !floorStaffOnly

    if (wantsStoreScope) {
      if (!canManageStore) {
        return NextResponse.json(
          {
            error:
              "Unauthorized. Only admins and store managers can upload shop category images.",
          },
          { status: 403 }
        )
      }
      storeCategoryUpload = true
    } else if (!isSeller) {
      // Admins uploading without an explicit scope still land in store/
      if (!canManageStore) {
        return NextResponse.json(
          {
            error:
              "Unauthorized. Only sellers, admins, and store managers can upload category images.",
          },
          { status: 403 }
        )
      }
      storeCategoryUpload = true
    }
  }

  const clientIp = getClientIp(request)
  const { allowed } = rateLimit(
    `upload:${session.user.id}:${clientIp}`,
    UPLOAD_RATE_LIMIT,
    UPLOAD_WINDOW_MS
  )

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Try again later." },
      { status: 429 }
    )
  }

  const pathTraversal =
    filename.includes("..") ||
    filename.startsWith("/") ||
    filename.includes("\\")

  if (pathTraversal) {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 })
  }

  const contentTypeAllowed =
    purpose === "qr" || purpose === "category" || purpose === "service"
      ? isAllowedQrContentType(contentType)
      : purpose === "receipt"
        ? isAllowedReceiptContentType(contentType)
        : isAllowedImageContentType(contentType)

  if (!contentTypeAllowed) {
    return NextResponse.json(
      {
        error:
          purpose === "qr"
            ? "Payment QR must be a JPEG, PNG, WebP, or GIF image."
            : purpose === "category" || purpose === "service"
              ? "Image must be a JPEG, PNG, WebP, or GIF."
              : purpose === "receipt"
                ? "Payment receipt must be a JPEG, PNG, WebP, or GIF image."
                : "Only supported image and video uploads are allowed.",
      },
      { status: 400 }
    )
  }

  if (!Number.isFinite(fileSize) || fileSize > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File size must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.` },
      { status: 400 }
    )
  }

  if (purpose === "receipt") {
    try {
      await assertBuyerCanUploadReceipt(
        session.user.id,
        String(form.get("orderId") ?? ""),
        String(form.get("sellerId") ?? "")
      )
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "You cannot upload a receipt for this order.",
        },
        { status: 403 }
      )
    }
  }

  try {
    const safeFilename = sanitizeUploadFilename(filename)
    const key =
      purpose === "qr"
        ? `sellers/${session.user.id}/qr-${Date.now()}-${safeFilename}`
        : purpose === "category"
          ? storeCategoryUpload
            ? `store/categories/${Date.now()}-${safeFilename}`
            : `sellers/${session.user.id}/categories/${Date.now()}-${safeFilename}`
          : purpose === "service"
            ? `store/services/${Date.now()}-${safeFilename}`
            : purpose === "receipt"
              ? `receipts/${session.user.id}/${Date.now()}-${safeFilename}`
              : `products/${Date.now()}-${safeFilename}`

    const body = Buffer.from(await file.arrayBuffer())
    await putStoredObject(key, body, contentType)

    const publicUrl = productImageApiPath(key)
    return NextResponse.json({ publicUrl, maxBytes: MAX_UPLOAD_BYTES })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to store upload" }, { status: 500 })
  }
}

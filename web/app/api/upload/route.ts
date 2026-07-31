import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3Client } from "@/lib/s3"
import { productImageApiPath } from "@/lib/images"
import {
  isAllowedImageContentType,
  MAX_UPLOAD_BYTES,
  requireSellerSession,
  sanitizeUploadFilename,
} from "@/lib/auth-guards"
import { getClientIp } from "@/lib/client-ip"
import { rateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

const UPLOAD_RATE_LIMIT = 20
const UPLOAD_WINDOW_MS = 60_000

export async function POST(request: Request) {
  const session = await requireSellerSession()

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Only sellers can upload product media." },
      { status: 403 }
    )
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

  let filename = ""
  let contentType = ""
  let fileSize = 0
  try {
    const body = await request.json()
    filename = typeof body.filename === "string" ? body.filename : ""
    contentType = typeof body.contentType === "string" ? body.contentType : ""
    fileSize = typeof body.fileSize === "number" ? body.fileSize : 0
  } catch {
    filename = ""
  }

  const pathTraversal =
    filename.includes("..") ||
    filename.startsWith("/") ||
    filename.includes("\\")

  if (pathTraversal) {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 })
  }

  if (!isAllowedImageContentType(contentType)) {
    return NextResponse.json(
      { error: "Only supported image and video uploads are allowed." },
      { status: 400 }
    )
  }

  if (
    !Number.isFinite(fileSize) ||
    fileSize <= 0 ||
    fileSize > MAX_UPLOAD_BYTES
  ) {
    return NextResponse.json(
      { error: `File size must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.` },
      { status: 400 }
    )
  }

  try {
    const safeFilename = sanitizeUploadFilename(filename)
    const key = `products/${Date.now()}-${safeFilename}`
    const normalizedContentType =
      contentType.split(";")[0]?.trim().toLowerCase() ?? ""

    const command = new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET_NAME!,
      Key: key,
      ContentType: normalizedContentType,
      ContentLength: fileSize,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 })
    const publicUrl = productImageApiPath(key)

    return NextResponse.json({ url, publicUrl, maxBytes: MAX_UPLOAD_BYTES })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}

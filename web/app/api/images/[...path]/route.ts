import { getServerSession } from "next-auth"
import { safeImageResponseContentType } from "@/lib/auth-guards"
import { authOptions } from "@/lib/auth"
import { getStoredObject } from "@/lib/object-store"
import { canAccessReceiptObject } from "@/lib/receipts"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const key = path.join("/")

  const isProductMedia = key.startsWith("products/")
  const isSellerQr = key.startsWith("sellers/")
  const isReceipt = key.startsWith("receipts/")
  const isStoreMedia = key.startsWith("store/")
  if (
    (!isProductMedia && !isSellerQr && !isReceipt && !isStoreMedia) ||
    key.includes("..") ||
    key.includes("\\")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (isReceipt) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null
    let access: { allowed: boolean; reason: string } = {
      allowed: false,
      reason: "unauthenticated",
    }
    if (userId) {
      access = await canAccessReceiptObject(userId, key)
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!access.allowed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  try {
    const stored = await getStoredObject(key)
    if (!stored) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const contentType = safeImageResponseContentType(stored.contentType)

    return new NextResponse(Buffer.from(stored.body), {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Cache-Control": isReceipt
          ? "private, no-store"
          : "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("Product media fetch error:", error)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

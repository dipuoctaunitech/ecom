import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/s3"
import { safeImageResponseContentType } from "@/lib/auth-guards"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const key = path.join("/")

  if (
    !key.startsWith("products/") ||
    key.includes("..") ||
    key.includes("\\")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.MINIO_BUCKET_NAME!,
        Key: key,
      })
    )

    if (!response.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const bytes = await response.Body.transformToByteArray()
    const contentType = safeImageResponseContentType(response.ContentType)

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("Product media fetch error:", error)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

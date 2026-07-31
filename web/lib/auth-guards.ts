import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Any authenticated user (buyer/seller/admin). */
export async function requireUserSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  })

  if (!dbUser) {
    return null
  }

  return session
}

/** Validates JWT role and re-checks the database to prevent stale-token privilege use. */
export async function requireSellerSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "SELLER") {
    return null
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== "SELLER") {
    return null
  }

  return session
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

const PRODUCT_MEDIA_PATH = /^\/api\/images\/products\/[a-zA-Z0-9._/-]+$/

export function isValidProductImageUrl(url: string): boolean {
  return PRODUCT_MEDIA_PATH.test(url)
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
])

export function isAllowedImageContentType(contentType: string): boolean {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? ""
  return ALLOWED_IMAGE_TYPES.has(normalized) || ALLOWED_VIDEO_TYPES.has(normalized)
}

export function sanitizeUploadFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "upload"
  return base.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100) || "upload"
}

export function safeImageResponseContentType(
  contentType: string | undefined
): string {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase() ?? ""
  if (
    ALLOWED_IMAGE_TYPES.has(normalized) ||
    ALLOWED_VIDEO_TYPES.has(normalized)
  ) {
    return normalized
  }
  return "application/octet-stream"
}

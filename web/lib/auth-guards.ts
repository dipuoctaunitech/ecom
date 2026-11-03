import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Any authenticated user (buyer/seller/admin/delivery). */
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

/**
 * Groomer/doctor accounts use platform role SELLER for store staff walls,
 * but must not get marketplace seller APIs (/seller products, QR, discounts).
 */
export async function isStoreFloorStaffOnly(userId: string): Promise<boolean> {
  const membership = await prisma.storeMember.findFirst({
    where: {
      userId,
      role: { in: ["GROOMER", "DOCTOR"] },
    },
    select: { id: true },
  })
  return Boolean(membership)
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

  if (await isStoreFloorStaffOnly(session.user.id)) {
    return null
  }

  return session
}

export async function requireDeliverySession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "DELIVERY") {
    return null
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== "DELIVERY") {
    return null
  }

  return session
}

/**
 * In-store staff wall: ADMIN and SELLER (owner / manager / groomer / doctor).
 * Buyers and delivery are excluded.
 */
export async function requireStoreStaffSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "SELLER") {
    return null
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SELLER")) {
    return null
  }

  return session
}

/** Store MANAGER membership (platform role is still SELLER). */
export async function requireManagerSession() {
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

  const membership = await prisma.storeMember.findFirst({
    where: { userId: session.user.id, role: "MANAGER" },
    select: { id: true },
  })

  if (!membership) {
    return null
  }

  return session
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

const PRODUCT_MEDIA_PATH = /^\/api\/images\/products\/[a-zA-Z0-9._/-]+$/
const SELLER_QR_PATH = /^\/api\/images\/sellers\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/
const SELLER_CATEGORY_IMAGE_PATH =
  /^\/api\/images\/sellers\/[a-zA-Z0-9._-]+\/categories\/[a-zA-Z0-9._-]+$/
const STORE_CATEGORY_IMAGE_PATH =
  /^\/api\/images\/store\/categories\/[a-zA-Z0-9._-]+$/
const STORE_SERVICE_IMAGE_PATH =
  /^\/api\/images\/store\/services\/[a-zA-Z0-9._-]+$/
const UNSPLASH_IMAGE_URL = /^https:\/\/images\.unsplash\.com\/.+/
const RECEIPT_PATH = /^\/api\/images\/receipts\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/

export function isValidProductImageUrl(url: string): boolean {
  return PRODUCT_MEDIA_PATH.test(url)
}

export function isValidSellerQrUrl(url: string): boolean {
  return SELLER_QR_PATH.test(url)
}

export function isValidCategoryImageUrl(url: string, sellerId?: string): boolean {
  if (!SELLER_CATEGORY_IMAGE_PATH.test(url)) return false
  if (!sellerId) return true
  return url.startsWith(`/api/images/sellers/${sellerId}/categories/`)
}

/** Store-wide Shop by Category covers (uploaded or seeded Unsplash). */
export function isValidStoreCategoryImageUrl(url: string): boolean {
  return STORE_CATEGORY_IMAGE_PATH.test(url) || UNSPLASH_IMAGE_URL.test(url)
}

/** Bookable service covers (uploaded or seeded Unsplash). */
export function isValidServiceImageUrl(url: string): boolean {
  return STORE_SERVICE_IMAGE_PATH.test(url) || UNSPLASH_IMAGE_URL.test(url)
}

export function isValidReceiptUrl(url: string, userId?: string): boolean {
  if (!RECEIPT_PATH.test(url)) return false
  if (!userId) return true
  return url.startsWith(`/api/images/receipts/${userId}/`)
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

export function isAllowedQrContentType(contentType: string): boolean {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? ""
  return ALLOWED_IMAGE_TYPES.has(normalized)
}

export function isAllowedReceiptContentType(contentType: string): boolean {
  return isAllowedQrContentType(contentType)
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

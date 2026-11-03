'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { DiscountType, OrderStatus } from "@prisma/client"
import {
  assertValidCategoryName,
  assertValidDiscountInput,
  assertValidGstNumber,
  assertValidProductFields,
  toCategorySlug,
} from "@/lib/validation"
import { setOrderStatus } from "@/lib/orders"
import {
  isStoreFloorStaffOnly,
  isValidCategoryImageUrl,
  isValidSellerQrUrl,
} from "@/lib/auth-guards"
import { resolveProductImageUrl } from "@/lib/images"
import { assertValidLoyaltyPoints } from "@/lib/product-meta"
import { markOrderSellerPaymentReceived } from "@/lib/payments"

async function requireSeller() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "SELLER") {
    throw new Error("Unauthorized. Seller access required.")
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== "SELLER") {
    throw new Error("Unauthorized. Seller access required.")
  }

  if (await isStoreFloorStaffOnly(session.user.id)) {
    throw new Error(
      "Unauthorized. Groomer and doctor accounts cannot access marketplace seller tools."
    )
  }

  return session
}

async function requireProductOwnership(productId: string, sellerId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId },
  })

  if (!product) {
    throw new Error("Product not found or access denied.")
  }

  return product
}

export type SellerCategory = {
  id: string
  name: string
  slug: string
  image: string | null
  productCount: number
  isOwn: boolean
}

async function uniqueCategorySlug(base: string): Promise<string> {
  const taken = await prisma.category.findUnique({
    where: { slug: base },
    select: { id: true },
  })
  if (!taken) return base

  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`
    const clash = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!clash) return candidate
  }

  return `${base}-${Date.now().toString(36)}`
}

async function assertSellerCanUseCategory(
  categoryId: string | null | undefined,
  sellerId: string
) {
  if (!categoryId) return null

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, sellerId: true },
  })

  if (!category) {
    throw new Error("Category not found.")
  }

  if (category.sellerId && category.sellerId !== sellerId) {
    throw new Error("That category is not available to your shop.")
  }

  return category
}

export async function getSellerCategories(): Promise<SellerCategory[]> {
  const session = await requireSeller()

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ sellerId: null }, { sellerId: session.user.id }],
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  })

  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      productCount: category._count.products,
      isOwn: category.sellerId === session.user.id,
    }))
    .sort(
      (a, b) =>
        Number(b.isOwn) - Number(a.isOwn) || a.name.localeCompare(b.name)
    )
}

export async function createSellerCategory(data: {
  name: string
  image: string
}) {
  const session = await requireSeller()
  const name = assertValidCategoryName(data.name)

  if (!isValidCategoryImageUrl(data.image, session.user.id)) {
    throw new Error("Upload a category image through the app.")
  }

  const existing = await prisma.category.findFirst({
    where: {
      sellerId: session.user.id,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  })
  if (existing) {
    throw new Error("You already have a category with that name.")
  }

  const slug = await uniqueCategorySlug(toCategorySlug(name))

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      image: data.image,
      sellerId: session.user.id,
    },
    include: { _count: { select: { products: true } } },
  })

  revalidatePath("/seller")
  revalidatePath("/")
  return {
    success: true as const,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      productCount: category._count.products,
      isOwn: true,
    } satisfies SellerCategory,
  }
}

export async function deleteSellerCategory(categoryId: string) {
  const session = await requireSeller()

  const category = await prisma.category.findFirst({
    where: { id: categoryId, sellerId: session.user.id },
    select: { id: true },
  })

  if (!category) {
    throw new Error("Category not found or access denied.")
  }

  await prisma.category.delete({ where: { id: categoryId } })

  revalidatePath("/seller")
  revalidatePath("/")
  return { success: true }
}

// ─── Products ───────────────────────────────────────────────────────────────

export type SellerProduct = {
  id: string
  title: string
  description: string
  brand: string
  animals: string[]
  tags: string[]
  price: number
  compareAtPrice: number | null
  loyaltyPoints: number
  stock: number
  images: string[]
  locationName: string | null
  locationAddress: string | null
  locationCity: string | null
  locationCountry: string | null
  categories: { id: string; name: string }[]
  unitsSold: number
  revenue: number
  createdAt: string
  updatedAt: string
}

export async function getSellerProducts(): Promise<SellerProduct[]> {
  const session = await requireSeller()

  const products = await prisma.product.findMany({
    where: { sellerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { select: { id: true, name: true } },
      orderItems: {
        select: {
          quantity: true,
          priceAtPurchase: true,
        },
      },
    },
  })

  return products.map((product) => {
    const unitsSold = product.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    )
    const revenue = product.orderItems.reduce(
      (sum, item) => sum + item.quantity * Number(item.priceAtPurchase),
      0
    )

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      brand: product.brand,
      animals: product.animals,
      tags: product.tags,
      price: Number(product.price),
      compareAtPrice:
        product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
      loyaltyPoints: product.loyaltyPoints,
      stock: product.stock,
      images: product.images,
      locationName: product.locationName,
      locationAddress: product.locationAddress,
      locationCity: product.locationCity,
      locationCountry: product.locationCountry,
      categories: product.categories,
      unitsSold,
      revenue: Math.round(revenue * 100) / 100,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }
  })
}

export async function updateSellerProduct(
  productId: string,
  data: {
    price?: number
    compareAtPrice?: number | null
    loyaltyPoints?: number
    stock?: number
    brand?: string
    animals?: string[]
    tags?: string[]
    description?: string
    categoryIds?: string[]
    locationName?: string | null
    locationAddress?: string | null
    locationCity?: string | null
    locationCountry?: string | null
  }
) {
  const session = await requireSeller()
  const existing = await requireProductOwnership(productId, session.user.id)

  if (data.categoryIds !== undefined) {
    const categoryIds = Array.from(
      new Set(data.categoryIds.map((id) => id.trim()).filter(Boolean))
    )
    if (categoryIds.length === 0) {
      throw new Error("Select at least one category.")
    }
    for (const categoryId of categoryIds) {
      await assertSellerCanUseCategory(categoryId, session.user.id)
    }
  }

  if (data.price !== undefined && (!Number.isFinite(data.price) || data.price < 0)) {
    throw new Error("Price must be a non-negative number.")
  }

  if (
    data.compareAtPrice !== undefined &&
    data.compareAtPrice !== null &&
    (!Number.isFinite(data.compareAtPrice) || data.compareAtPrice < 0)
  ) {
    throw new Error("Compare-at price must be a non-negative number.")
  }

  const nextPrice =
    data.price !== undefined ? data.price : Number(existing.price)
  const nextCompareAt =
    data.compareAtPrice !== undefined
      ? data.compareAtPrice
      : existing.compareAtPrice != null
        ? Number(existing.compareAtPrice)
        : null

  if (nextCompareAt !== null && nextCompareAt <= nextPrice) {
    throw new Error("Compare-at price must be higher than the selling price.")
  }

  if (
    data.stock !== undefined &&
    (!Number.isInteger(data.stock) || data.stock < 0)
  ) {
    throw new Error("Quantity must be a non-negative integer.")
  }

  const loyaltyPoints =
    data.loyaltyPoints !== undefined
      ? assertValidLoyaltyPoints(data.loyaltyPoints)
      : undefined

  let listingMeta:
    | {
        description?: string
        brand: string
        animals: string[]
        tags: string[]
      }
    | undefined

  if (
    data.brand !== undefined ||
    data.animals !== undefined ||
    data.tags !== undefined ||
    data.description !== undefined
  ) {
    const validated = assertValidProductFields({
      title: existing.title,
      description: data.description ?? existing.description,
      brand: data.brand ?? existing.brand,
      animals: data.animals ?? existing.animals,
      tags: data.tags ?? existing.tags,
    })
    listingMeta = {
      ...(data.description !== undefined && {
        description: validated.description,
      }),
      brand: validated.brand,
      animals: validated.animals,
      tags: validated.tags,
    }
  }

  const categoryIds =
    data.categoryIds !== undefined
      ? Array.from(
          new Set(data.categoryIds.map((id) => id.trim()).filter(Boolean))
        )
      : undefined

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.price !== undefined && { price: data.price }),
      ...(data.compareAtPrice !== undefined && {
        compareAtPrice: data.compareAtPrice,
      }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(loyaltyPoints !== undefined && { loyaltyPoints }),
      ...(listingMeta && listingMeta),
      ...(categoryIds !== undefined && {
        categories: { set: categoryIds.map((id) => ({ id })) },
      }),
      ...(data.locationName !== undefined && {
        locationName: data.locationName,
      }),
      ...(data.locationAddress !== undefined && {
        locationAddress: data.locationAddress,
      }),
      ...(data.locationCity !== undefined && { locationCity: data.locationCity }),
      ...(data.locationCountry !== undefined && {
        locationCountry: data.locationCountry,
      }),
    },
  })

  revalidatePath("/seller")
  revalidatePath("/")
  revalidatePath("/items")
  return { success: true }
}

export type SellerDeliverySettings = {
  standardDeliveryEnabled: boolean
  expressDeliveryEnabled: boolean
  pickupEnabled: boolean
  standardDeliveryDays: number
  expressDeliveryDays: number
  standardDeliveryFee: number
  expressDeliveryFee: number
}

async function getOrCreateSellerSettings(sellerId: string) {
  const existing = await prisma.sellerSettings.findUnique({
    where: { sellerId },
  })

  if (existing) return existing

  return prisma.sellerSettings.create({
    data: { sellerId },
  })
}

export async function getSellerDeliverySettings(): Promise<SellerDeliverySettings> {
  const session = await requireSeller()
  const settings = await getOrCreateSellerSettings(session.user.id)

  return {
    standardDeliveryEnabled: settings.standardDeliveryEnabled,
    expressDeliveryEnabled: settings.expressDeliveryEnabled,
    pickupEnabled: settings.pickupEnabled,
    standardDeliveryDays: settings.standardDeliveryDays,
    expressDeliveryDays: settings.expressDeliveryDays,
    standardDeliveryFee: Number(settings.standardDeliveryFee),
    expressDeliveryFee: Number(settings.expressDeliveryFee),
  }
}

export async function updateSellerDeliverySettings(
  data: SellerDeliverySettings
) {
  const session = await requireSeller()

  await prisma.sellerSettings.upsert({
    where: { sellerId: session.user.id },
    create: { sellerId: session.user.id, ...data },
    update: data,
  })

  revalidatePath("/seller")
  return { success: true }
}

export type SellerQrSettings = {
  qrCodeUrl: string | null
  gstNumber: string | null
}

export async function getSellerQrSettings(): Promise<SellerQrSettings> {
  const session = await requireSeller()
  const settings = await getOrCreateSellerSettings(session.user.id)

  return {
    qrCodeUrl: settings.qrCodeUrl
      ? resolveProductImageUrl(settings.qrCodeUrl)
      : null,
    gstNumber: settings.gstNumber,
  }
}

export async function updateSellerGstNumber(gstNumber: string) {
  const session = await requireSeller()
  const normalized = assertValidGstNumber(gstNumber, {
    required: true,
    label: "Seller GST number",
  })

  await prisma.sellerSettings.upsert({
    where: { sellerId: session.user.id },
    create: { sellerId: session.user.id, gstNumber: normalized },
    update: { gstNumber: normalized },
  })

  revalidatePath("/seller")
  revalidatePath("/checkout")
  return { success: true, gstNumber: normalized }
}

export async function updateSellerQrCode(qrCodeUrl: string | null) {
  const session = await requireSeller()

  if (qrCodeUrl !== null && !isValidSellerQrUrl(qrCodeUrl)) {
    throw new Error("Payment QR must be uploaded through the app.")
  }

  await prisma.sellerSettings.upsert({
    where: { sellerId: session.user.id },
    create: { sellerId: session.user.id, qrCodeUrl },
    update: { qrCodeUrl },
  })

  revalidatePath("/seller")
  revalidatePath("/checkout")
  return { success: true }
}

export type SellerDiscountCode = {
  id: string
  code: string
  type: DiscountType
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
}

export async function getSellerDiscountCodes(): Promise<SellerDiscountCode[]> {
  const session = await requireSeller()

  const codes = await prisma.discountCode.findMany({
    where: { sellerId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return codes.map((code) => ({
    id: code.id,
    code: code.code,
    type: code.type,
    value: Number(code.value),
    minOrderAmount: code.minOrderAmount ? Number(code.minOrderAmount) : null,
    maxUses: code.maxUses,
    usedCount: code.usedCount,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    isActive: code.isActive,
  }))
}

export async function createSellerDiscountCode(data: {
  code: string
  type: DiscountType
  value: number
  minOrderAmount?: number
  maxUses?: number
  expiresAt?: string
}) {
  const session = await requireSeller()

  const normalizedCode = data.code.trim().toUpperCase()
  if (!normalizedCode) {
    throw new Error("Discount code is required.")
  }

  const existing = await prisma.discountCode.findUnique({
    where: { code: normalizedCode },
  })
  if (existing) {
    throw new Error("This discount code is already in use.")
  }

  assertValidDiscountInput(data)

  await prisma.discountCode.create({
    data: {
      code: normalizedCode,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      sellerId: session.user.id,
    },
  })

  revalidatePath("/seller")
  return { success: true }
}

export async function toggleSellerDiscountCode(id: string, isActive: boolean) {
  const session = await requireSeller()

  const code = await prisma.discountCode.findFirst({
    where: { id, sellerId: session.user.id },
  })

  if (!code) {
    throw new Error("Discount code not found.")
  }

  await prisma.discountCode.update({
    where: { id },
    data: { isActive },
  })

  revalidatePath("/seller")
  return { success: true }
}

// ─── Shipping / Orders ──────────────────────────────────────────────────────

export type SellerOrderListItem = {
  id: string
  status: OrderStatus
  totalAmount: number
  sellerTotal: number
  canUpdateStatus: boolean
  createdAt: string
  receiptUrl: string | null
  paymentReceived: boolean
  paymentReceivedAt: string | null
  buyer: {
    id: string
    email: string | null
    name: string | null
  }
  items: {
    id: string
    quantity: number
    priceAtPurchase: number
    product: {
      id: string
      title: string
    }
  }[]
}

export type PaginatedSellerOrders = {
  orders: SellerOrderListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getSellerOrders(
  page = 1,
  pageSize = 10
): Promise<PaginatedSellerOrders> {
  const session = await requireSeller()
  const sellerId = session.user.id

  const safePage = Math.max(1, page)
  const safePageSize = Math.min(Math.max(1, pageSize), 50)
  const skip = (safePage - 1) * safePageSize

  const sellerOrderFilter = {
    items: { some: { product: { sellerId } } },
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: sellerOrderFilter,
      skip,
      take: safePageSize,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: {
          select: { id: true, email: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, sellerId: true },
            },
          },
        },
        payments: {
          where: { sellerId },
        },
      },
    }),
    prisma.order.count({ where: sellerOrderFilter }),
  ])

  return {
    orders: orders.map((order) => {
      const sellerItems = order.items.filter(
        (item) => item.product.sellerId === sellerId
      )
      const sellerTotal = sellerItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.priceAtPurchase),
        0
      )
      const payment = order.payments[0]
      const canUpdateStatus = order.items.every(
        (item) => item.product.sellerId === sellerId
      )

      return {
        id: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        sellerTotal: Math.round(sellerTotal * 100) / 100,
        canUpdateStatus,
        createdAt: order.createdAt.toISOString(),
        receiptUrl: payment?.receiptUrl
          ? resolveProductImageUrl(payment.receiptUrl)
          : null,
        paymentReceived: payment?.paymentReceived ?? false,
        paymentReceivedAt: payment?.paymentReceivedAt?.toISOString() ?? null,
        buyer: order.buyer,
        items: sellerItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          priceAtPurchase: Number(item.priceAtPurchase),
          product: {
            id: item.product.id,
            title: item.product.title,
          },
        })),
      }
    }),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  }
}

export async function updateSellerOrderStatus(
  orderId: string,
  status: OrderStatus
) {
  const session = await requireSeller()
  const sellerId = session.user.id

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { sellerId } } },
    },
    include: {
      items: {
        include: {
          product: { select: { sellerId: true } },
        },
      },
    },
  })

  if (!order) {
    throw new Error("Order not found or access denied.")
  }

  const ownsAllItems = order.items.every(
    (item) => item.product.sellerId === sellerId
  )
  if (!ownsAllItems) {
    throw new Error(
      "This order includes other sellers' items. Only an admin can change its status."
    )
  }

  await setOrderStatus(orderId, status)

  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/")
  return { success: true }
}

export async function markSellerPaymentReceived(orderId: string) {
  const session = await requireSeller()
  const sellerId = session.user.id

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { sellerId } } },
    },
    select: { id: true },
  })

  if (!order) {
    throw new Error("Order not found or access denied.")
  }

  await markOrderSellerPaymentReceived({
    orderId,
    sellerId,
    markedByUserId: sellerId,
    markedByRole: "SELLER",
  })

  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/orders")
  revalidatePath("/account")

  return { success: true }
}

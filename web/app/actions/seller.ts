'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { DiscountType, OrderStatus } from "@prisma/client"
import { assertValidDiscountInput } from "@/lib/validation"
import { setOrderStatus } from "@/lib/orders"

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

export type SellerProduct = {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice: number | null
  stock: number
  images: string[]
  locationName: string | null
  locationAddress: string | null
  locationCity: string | null
  locationCountry: string | null
  category: { id: string; name: string } | null
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
      category: { select: { id: true, name: true } },
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
      price: Number(product.price),
      compareAtPrice:
        product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
      stock: product.stock,
      images: product.images,
      locationName: product.locationName,
      locationAddress: product.locationAddress,
      locationCity: product.locationCity,
      locationCountry: product.locationCountry,
      category: product.category,
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
    stock?: number
    locationName?: string | null
    locationAddress?: string | null
    locationCity?: string | null
    locationCountry?: string | null
  }
) {
  const session = await requireSeller()
  const existing = await requireProductOwnership(productId, session.user.id)

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
    throw new Error("Stock must be a non-negative integer.")
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.price !== undefined && { price: data.price }),
      ...(data.compareAtPrice !== undefined && {
        compareAtPrice: data.compareAtPrice,
      }),
      ...(data.stock !== undefined && { stock: data.stock }),
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
  revalidatePath("/")
  return { success: true }
}

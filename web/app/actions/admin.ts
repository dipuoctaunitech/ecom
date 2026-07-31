'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { setOrderStatus } from "@/lib/orders"
import {
  DiscountType,
  OrderStatus,
  Role,
  TicketPriority,
  TicketStatus,
} from "@prisma/client"
import {
  assertValidDiscountInput,
  assertValidPassword,
  assertValidProductFields,
} from "@/lib/validation"

/** Returned and refunded orders are money given back, so they are not revenue. */
const REVENUE_EXCLUDED_STATUSES: OrderStatus[] = ["REFUNDED", "RETURNED"]

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const jwtRole = session?.user?.role ?? null
  let dbRole: string | null = null
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    dbRole = dbUser?.role ?? null
  }

  if (!session || jwtRole !== "ADMIN" || dbRole !== "ADMIN") {
    throw new Error("Unauthorized. Admin access required.")
  }
  return session
}

// ─── Users / RBAC ───────────────────────────────────────────────────────────

export async function updateUserRole(userId: string, newRole: Role) {
  const session = await requireAdmin()

  const assignableRoles: Role[] = ["BUYER", "SELLER"]
  if (!assignableRoles.includes(newRole)) {
    throw new Error("Only BUYER and SELLER roles can be assigned.")
  }

  if (userId === session.user.id && newRole !== "ADMIN") {
    throw new Error("You cannot change your own admin status.")
  }

  // No code path can grant ADMIN back, so demoting one here is irreversible
  // without direct database access. The UI hides this, but server actions are
  // callable directly and must enforce it themselves.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!target) {
    throw new Error("User not found.")
  }

  if (target.role === "ADMIN") {
    throw new Error("Admin accounts are protected and cannot be reassigned.")
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  })

  revalidatePath("/admin")
  return { success: true }
}

export async function createSeller(data: {
  name: string
  email: string
  password: string
}) {
  await requireAdmin()

  const name = data.name.trim()
  const email = data.email.trim().toLowerCase()
  const password = data.password

  if (!name) {
    throw new Error("Seller name is required.")
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.")
  }

  assertValidPassword(password)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("A user with this email already exists.")
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const seller = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SELLER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  revalidatePath("/admin")
  return { success: true, seller }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export type AdminKPIs = {
  totalUsers: number
  totalSellers: number
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  lowStockCount: number
  openTickets: number
  activePromotions: number
}

export type TopProduct = {
  productId: string
  title: string
  unitsSold: number
  revenue: number
}

export type AdminAnalytics = AdminKPIs & {
  topProducts: TopProduct[]
  ordersByStatus: Record<OrderStatus, number>
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  await requireAdmin()

  const settings = await getOrCreateStoreSettings()

  const [
    totalUsers,
    totalSellers,
    totalOrders,
    revenueResult,
    lowStockCount,
    openTickets,
    activePromotions,
    topItems,
    statusGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: { _all: true },
      where: { status: { notIn: REVENUE_EXCLUDED_STATUSES } },
    }),
    prisma.product.count({
      where: { stock: { lte: settings.lowStockAlertThreshold } },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.discountCode.count({
      where: { isActive: true, sellerId: null },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      where: { order: { status: { notIn: REVENUE_EXCLUDED_STATUSES } } },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ])

  const totalRevenue = Number(revenueResult._sum.totalAmount ?? 0)
  const revenueOrderCount = revenueResult._count._all
  const productIds = topItems.map((item) => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p.title]))

  // Revenue is the sum of unit price times quantity. Prisma's aggregate cannot
  // express that product, so the rows are fetched once and reduced here.
  const topProductItems = await prisma.orderItem.findMany({
    where: {
      productId: { in: productIds },
      order: { status: { notIn: REVENUE_EXCLUDED_STATUSES } },
    },
    select: { productId: true, quantity: true, priceAtPurchase: true },
  })

  const revenueByProduct = new Map<string, number>()
  for (const item of topProductItems) {
    revenueByProduct.set(
      item.productId,
      (revenueByProduct.get(item.productId) ?? 0) +
        item.quantity * Number(item.priceAtPurchase)
    )
  }

  const topProducts: TopProduct[] = topItems.map((item) => ({
    productId: item.productId,
    title: productMap.get(item.productId) ?? "Unknown product",
    unitsSold: item._sum.quantity ?? 0,
    revenue:
      Math.round((revenueByProduct.get(item.productId) ?? 0) * 100) / 100,
  }))

  const ordersByStatus = {
    PENDING: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    RETURNED: 0,
    REFUNDED: 0,
  } satisfies Record<OrderStatus, number>

  for (const group of statusGroups) {
    ordersByStatus[group.status] = group._count.status
  }

  return {
    totalUsers,
    totalSellers,
    totalOrders,
    totalRevenue,
    averageOrderValue:
      revenueOrderCount > 0 ? totalRevenue / revenueOrderCount : 0,
    lowStockCount,
    openTickets,
    activePromotions,
    topProducts,
    ordersByStatus,
  }
}

/** @deprecated Use getAdminAnalytics */
export async function getAdminKPIs(): Promise<AdminKPIs> {
  const analytics = await getAdminAnalytics()
  return {
    totalUsers: analytics.totalUsers,
    totalSellers: analytics.totalSellers,
    totalOrders: analytics.totalOrders,
    totalRevenue: analytics.totalRevenue,
    averageOrderValue: analytics.averageOrderValue,
    lowStockCount: analytics.lowStockCount,
    openTickets: analytics.openTickets,
    activePromotions: analytics.activePromotions,
  }
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export type AdminOrderListItem = {
  id: string
  status: OrderStatus
  totalAmount: number
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

export type PaginatedOrders = {
  orders: AdminOrderListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getAdminOrders(
  page = 1,
  pageSize = 10
): Promise<PaginatedOrders> {
  await requireAdmin()

  const safePage = Math.max(1, page)
  const safePageSize = Math.min(Math.max(1, pageSize), 50)
  const skip = (safePage - 1) * safePageSize

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
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
              select: { id: true, title: true },
            },
          },
        },
      },
    }),
    prisma.order.count(),
  ])

  return {
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      buyer: order.buyer,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceAtPurchase: Number(item.priceAtPurchase),
        product: item.product,
      })),
    })),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin()

  await setOrderStatus(orderId, status)

  revalidatePath("/admin")
  revalidatePath("/seller")
  revalidatePath("/")
  return { success: true }
}

// ─── Products & Inventory ───────────────────────────────────────────────────

export type AdminProduct = {
  id: string
  title: string
  price: number
  stock: number
  lowStockThreshold: number
  category: { id: string; name: string } | null
  seller: { id: string; name: string | null; email: string | null }
  variants: { id: string; label: string; stock: number; price: number | null }[]
  isLowStock: boolean
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  productCount: number
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  await requireAdmin()
  const settings = await getOrCreateStoreSettings()

  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      category: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true, email: true } },
      variants: { select: { id: true, label: true, stock: true, price: true } },
    },
  })

  return products.map((product) => ({
    id: product.id,
    title: product.title,
    price: Number(product.price),
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    category: product.category,
    seller: product.seller,
    variants: product.variants.map((v) => ({
      id: v.id,
      label: v.label,
      stock: v.stock,
      price: v.price ? Number(v.price) : null,
    })),
    isLowStock: product.stock <= settings.lowStockAlertThreshold,
  }))
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  await requireAdmin()

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  })

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    productCount: cat._count.products,
  }))
}

export async function updateAdminProduct(
  productId: string,
  data: {
    title?: string
    price?: number
    stock?: number
    categoryId?: string | null
    lowStockThreshold?: number
  }
) {
  await requireAdmin()

  if (data.title !== undefined) {
    assertValidProductFields({
      title: data.title,
      description: "placeholder",
    })
  }

  if (
    data.price !== undefined &&
    (!Number.isFinite(data.price) || data.price < 0)
  ) {
    throw new Error("Price must be a non-negative number.")
  }

  if (
    data.stock !== undefined &&
    (!Number.isInteger(data.stock) || data.stock < 0)
  ) {
    throw new Error("Stock must be a non-negative integer.")
  }

  if (
    data.lowStockThreshold !== undefined &&
    (!Number.isInteger(data.lowStockThreshold) || data.lowStockThreshold < 0)
  ) {
    throw new Error("Low stock threshold must be a non-negative integer.")
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.lowStockThreshold !== undefined && {
        lowStockThreshold: data.lowStockThreshold,
      }),
    },
  })

  revalidatePath("/admin")
  return { success: true }
}

export async function createAdminCategory(name: string) {
  await requireAdmin()

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  if (!slug) {
    throw new Error("Invalid category name.")
  }

  await prisma.category.create({
    data: { name: name.trim(), slug },
  })

  revalidatePath("/admin")
  return { success: true }
}

// ─── CRM ────────────────────────────────────────────────────────────────────

export type AdminCustomer = {
  id: string
  name: string | null
  email: string | null
  role: Role
  orderCount: number
  totalSpent: number
  lastOrderAt: string | null
}

export type AdminSupportTicket = {
  id: string
  subject: string
  message: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  await requireAdmin()

  const buyers = await prisma.user.findMany({
    where: { role: "BUYER" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      orders: {
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { email: "asc" },
  })

  return buyers.map((buyer) => ({
    id: buyer.id,
    name: buyer.name,
    email: buyer.email,
    role: buyer.role,
    orderCount: buyer.orders.length,
    totalSpent: buyer.orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    ),
    lastOrderAt: buyer.orders[0]?.createdAt.toISOString() ?? null,
  }))
}

export async function getCustomerOrders(userId: string) {
  await requireAdmin()

  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { select: { title: true } } },
      },
    },
  })

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      title: item.product.title,
      quantity: item.quantity,
      priceAtPurchase: Number(item.priceAtPurchase),
    })),
  }))
}

export async function getAdminSupportTickets(): Promise<AdminSupportTicket[]> {
  await requireAdmin()

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
    user: ticket.user,
  }))
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: TicketStatus
) {
  await requireAdmin()

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status },
  })

  revalidatePath("/admin")
  return { success: true }
}

// ─── Marketing ──────────────────────────────────────────────────────────────

export type AdminDiscountCode = {
  id: string
  code: string
  type: DiscountType
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
}

export async function getAdminDiscountCodes(): Promise<AdminDiscountCode[]> {
  await requireAdmin()

  const codes = await prisma.discountCode.findMany({
    where: { sellerId: null },
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
    startsAt: code.startsAt?.toISOString() ?? null,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    isActive: code.isActive,
  }))
}

export async function createDiscountCode(data: {
  code: string
  type: DiscountType
  value: number
  minOrderAmount?: number
  maxUses?: number
  expiresAt?: string
}) {
  await requireAdmin()

  const normalizedCode = data.code.trim().toUpperCase()
  if (!normalizedCode) {
    throw new Error("Discount code is required.")
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
    },
  })

  revalidatePath("/admin")
  return { success: true }
}

export async function toggleDiscountCode(id: string, isActive: boolean) {
  await requireAdmin()

  await prisma.discountCode.update({
    where: { id },
    data: { isActive },
  })

  revalidatePath("/admin")
  return { success: true }
}

// ─── Settings ───────────────────────────────────────────────────────────────

export type StoreSettingsData = {
  paymentGateway: string
  paymentEnabled: boolean
  defaultShippingRate: number
  freeShippingThreshold: number | null
  taxRate: number
  lowStockAlertThreshold: number
  loyaltyPointsEnabled: boolean
}

async function getOrCreateStoreSettings() {
  const existing = await prisma.storeSettings.findUnique({
    where: { id: "default" },
  })

  if (existing) return existing

  return prisma.storeSettings.create({
    data: { id: "default" },
  })
}

export async function getStoreSettings(): Promise<StoreSettingsData> {
  await requireAdmin()
  const settings = await getOrCreateStoreSettings()

  return {
    paymentGateway: settings.paymentGateway,
    paymentEnabled: settings.paymentEnabled,
    defaultShippingRate: Number(settings.defaultShippingRate),
    freeShippingThreshold: settings.freeShippingThreshold
      ? Number(settings.freeShippingThreshold)
      : null,
    taxRate: Number(settings.taxRate),
    lowStockAlertThreshold: settings.lowStockAlertThreshold,
    loyaltyPointsEnabled: settings.loyaltyPointsEnabled,
  }
}

export async function updateStoreSettings(data: StoreSettingsData) {
  await requireAdmin()

  await prisma.storeSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  })

  revalidatePath("/admin")
  return { success: true }
}

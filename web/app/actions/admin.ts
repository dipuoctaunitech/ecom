'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { setOrderStatus } from "@/lib/orders"
import { markOrderSellerPaymentReceived } from "@/lib/payments"
import { resolveProductImageUrl } from "@/lib/images"
import {
  DiscountType,
  OrderStatus,
  Role,
  TicketPriority,
  TicketStatus,
  type PaymentMarkedByRole,
  type StaffType,
  type StoreMemberRole,
} from "@prisma/client"
import {
  assertValidCategoryName,
  assertValidDiscountInput,
  assertValidPassword,
  assertValidProductFields,
  toCategorySlug,
} from "@/lib/validation"
import { requireActiveStore } from "@/lib/store"

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

  const assignableRoles: Role[] = ["BUYER", "SELLER", "DELIVERY"]
  if (!assignableRoles.includes(newRole)) {
    throw new Error("Only BUYER, SELLER, and DELIVERY roles can be assigned.")
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

  if (newRole === "BUYER" || newRole === "DELIVERY") {
    const productCount = await prisma.product.count({
      where: { sellerId: userId },
    })
    if (productCount > 0) {
      throw new Error(
        "This seller still has products. Remove them before changing their role."
      )
    }
  }

  if (target.role === "DELIVERY" && newRole !== "DELIVERY") {
    const openDeliveries = await prisma.order.count({
      where: {
        deliveryBoyId: userId,
        status: { notIn: ["DELIVERED", "RETURNED", "REFUNDED"] },
      },
    })
    if (openDeliveries > 0) {
      throw new Error(
        "Reassign open deliveries before changing this delivery account."
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: newRole },
    })

    if (newRole === "SELLER") {
      await tx.sellerSettings.upsert({
        where: { sellerId: userId },
        create: { sellerId: userId },
        update: {},
      })
    }

    if (newRole !== "DELIVERY") {
      await tx.order.updateMany({
        where: {
          deliveryBoyId: userId,
          status: { in: ["DELIVERED", "RETURNED", "REFUNDED"] },
        },
        data: { deliveryBoyId: null },
      })
    }
  })

  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/")
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

  const passwordHash = await bcrypt.hash(password, 12)

  const seller = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SELLER",
      sellerSettings: { create: {} },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/")
  return { success: true, seller }
}

export type AdminSellerRow = {
  id: string
  name: string | null
  email: string | null
  productCount: number
  hasQrCode: boolean
}

export type AdminBuyerRow = {
  id: string
  name: string | null
  email: string | null
}

export async function getAdminSellers(): Promise<{
  sellers: AdminSellerRow[]
  buyers: AdminBuyerRow[]
}> {
  await requireAdmin()

  const [sellers, buyers] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "SELLER",
        // Groomers / doctors are staff accounts, not marketplace sellers.
        NOT: {
          storeMembers: {
            some: { role: { in: ["GROOMER", "DOCTOR"] } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { products: true } },
        sellerSettings: { select: { qrCodeUrl: true } },
      },
      orderBy: { email: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "BUYER" },
      select: { id: true, name: true, email: true },
      orderBy: { email: "asc" },
    }),
  ])

  return {
    sellers: sellers.map((seller) => ({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      productCount: seller._count.products,
      hasQrCode: Boolean(seller.sellerSettings?.qrCodeUrl),
    })),
    buyers,
  }
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

export type AdminOrderPayment = {
  sellerId: string
  sellerName: string
  sellerTotal: number
  qrCodeUrl: string | null
  receiptUrl: string | null
  paymentReceived: boolean
  paymentReceivedAt: string | null
  paymentMarkedByRole: PaymentMarkedByRole | null
}

export type AdminOrderListItem = {
  id: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  deliveryBoyId: string | null
  deliveryBoyName: string | null
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
      sellerId: string
    }
  }[]
  payments: AdminOrderPayment[]
}

export type AdminDeliveryBoyRow = {
  id: string
  name: string | null
  email: string | null
  activeAssignments: number
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
        deliveryBoy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                sellerId: true,
                seller: {
                  select: {
                    name: true,
                    email: true,
                    sellerSettings: { select: { qrCodeUrl: true } },
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
    }),
    prisma.order.count(),
  ])

  return {
    orders: orders.map((order) => {
      const totalsBySeller = new Map<string, number>()
      for (const item of order.items) {
        const line =
          item.quantity * Number(item.priceAtPurchase)
        totalsBySeller.set(
          item.product.sellerId,
          (totalsBySeller.get(item.product.sellerId) ?? 0) + line
        )
      }

      const paymentBySeller = new Map(
        order.payments.map((payment) => [payment.sellerId, payment])
      )

      const sellerMeta = new Map<
        string,
        { name: string; qrCodeUrl: string | null }
      >()
      for (const item of order.items) {
        if (sellerMeta.has(item.product.sellerId)) continue
        sellerMeta.set(item.product.sellerId, {
          name:
            item.product.seller.name?.trim() ||
            item.product.seller.email?.split("@")[0] ||
            "Seller",
          qrCodeUrl: item.product.seller.sellerSettings?.qrCodeUrl
            ? resolveProductImageUrl(
                item.product.seller.sellerSettings.qrCodeUrl
              )
            : null,
        })
      }

      const payments: AdminOrderPayment[] = [...totalsBySeller.entries()].map(
        ([sellerId, sellerTotal]) => {
          const payment = paymentBySeller.get(sellerId)
          const meta = sellerMeta.get(sellerId)
          return {
            sellerId,
            sellerName: meta?.name ?? "Seller",
            sellerTotal: Math.round(sellerTotal * 100) / 100,
            qrCodeUrl: meta?.qrCodeUrl ?? null,
            receiptUrl: payment?.receiptUrl
              ? resolveProductImageUrl(payment.receiptUrl)
              : null,
            paymentReceived: payment?.paymentReceived ?? false,
            paymentReceivedAt:
              payment?.paymentReceivedAt?.toISOString() ?? null,
            paymentMarkedByRole: payment?.paymentMarkedByRole ?? null,
          }
        }
      )

      return {
        id: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
        deliveryBoyId: order.deliveryBoyId,
        deliveryBoyName:
          order.deliveryBoy?.name?.trim() ||
          order.deliveryBoy?.email?.split("@")[0] ||
          null,
        buyer: order.buyer,
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          priceAtPurchase: Number(item.priceAtPurchase),
          product: {
            id: item.product.id,
            title: item.product.title,
            sellerId: item.product.sellerId,
          },
        })),
        payments,
      }
    }),
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
  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/")
  return { success: true }
}

export async function createDeliveryBoy(data: {
  name: string
  email: string
  password: string
}) {
  await requireAdmin()

  const name = data.name.trim()
  const email = data.email.trim().toLowerCase()
  const password = data.password

  if (!name) {
    throw new Error("Delivery name is required.")
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.")
  }

  assertValidPassword(password)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("A user with this email already exists.")
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const deliveryBoy = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "DELIVERY",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/")
  return { success: true, deliveryBoy }
}

export async function getAdminDeliveryBoys(): Promise<AdminDeliveryBoyRow[]> {
  await requireAdmin()

  const deliveryBoys = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          deliveryOrders: {
            where: {
              status: { notIn: ["DELIVERED", "RETURNED", "REFUNDED"] },
            },
          },
        },
      },
    },
    orderBy: { email: "asc" },
  })

  return deliveryBoys.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    activeAssignments: row._count.deliveryOrders,
  }))
}

/** Default Mon–Sat hours so new staff appear on the roster immediately. */
const DEFAULT_STAFF_WEEKDAY_ROSTER = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 6, startTime: "10:00", endTime: "14:00", slotDurationMins: 30 },
] as const

export type AdminStaffRow = {
  id: string
  userId: string | null
  name: string
  email: string | null
  title: string | null
  type: StaffType
  isActive: boolean
  hasLogin: boolean
}

/**
 * Create a groomer or clinic doctor login linked to the active store.
 * Matches seed: SELLER user + StoreMember + StaffMember + weekday roster.
 */
export async function createStoreStaff(data: {
  name: string
  email: string
  password: string
  type: StaffType
  title?: string
}) {
  await requireAdmin()

  const name = data.name.trim()
  const email = data.email.trim().toLowerCase()
  const password = data.password
  const title = data.title?.trim() || null
  const type = data.type

  if (type !== "GROOMER" && type !== "DOCTOR") {
    throw new Error("Staff type must be GROOMER or DOCTOR.")
  }

  if (!name) {
    throw new Error("Name is required.")
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.")
  }

  assertValidPassword(password)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("A user with this email already exists.")
  }

  const store = await requireActiveStore()
  const passwordHash = await bcrypt.hash(password, 12)
  const defaultTitle =
    title || (type === "GROOMER" ? "Groomer" : "Veterinarian")
  const storeRole = type as StoreMemberRole

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "SELLER",
        sellerSettings: { create: {} },
      },
      select: { id: true, name: true, email: true },
    })

    await tx.storeMember.create({
      data: {
        storeId: store.id,
        userId: user.id,
        role: storeRole,
      },
    })

    const staff = await tx.staffMember.create({
      data: {
        storeId: store.id,
        userId: user.id,
        type,
        name,
        title: defaultTitle,
        weeklyRoster: {
          create: DEFAULT_STAFF_WEEKDAY_ROSTER.map((row) => ({ ...row })),
        },
      },
      select: {
        id: true,
        name: true,
        title: true,
        type: true,
        isActive: true,
      },
    })

    return { user, staff }
  })

  revalidatePath("/admin")
  revalidatePath("/groomer")
  revalidatePath("/doctor")
  revalidatePath("/store")
  revalidatePath("/grooming")
  revalidatePath("/clinic")
  revalidatePath("/")

  return {
    success: true,
    staff: {
      id: created.staff.id,
      userId: created.user.id,
      name: created.staff.name,
      email: created.user.email,
      title: created.staff.title,
      type: created.staff.type,
      isActive: created.staff.isActive,
      hasLogin: true,
    } satisfies AdminStaffRow,
  }
}

export async function getAdminStoreStaff(): Promise<AdminStaffRow[]> {
  await requireAdmin()
  const store = await requireActiveStore()

  const staff = await prisma.staffMember.findMany({
    where: {
      storeId: store.id,
      type: { in: ["GROOMER", "DOCTOR"] },
    },
    select: {
      id: true,
      userId: true,
      name: true,
      title: true,
      type: true,
      isActive: true,
      user: { select: { email: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })

  return staff.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.user?.email ?? null,
    title: row.title,
    type: row.type,
    isActive: row.isActive,
    hasLogin: Boolean(row.userId),
  }))
}

export async function setStoreStaffActive(
  staffId: string,
  isActive: boolean
) {
  await requireAdmin()
  const store = await requireActiveStore()

  const staff = await prisma.staffMember.findFirst({
    where: {
      id: staffId,
      storeId: store.id,
      type: { in: ["GROOMER", "DOCTOR"] },
    },
    select: { id: true },
  })

  if (!staff) {
    throw new Error("Staff member not found.")
  }

  await prisma.staffMember.update({
    where: { id: staffId },
    data: { isActive },
  })

  revalidatePath("/admin")
  revalidatePath("/groomer")
  revalidatePath("/doctor")
  revalidatePath("/store")
  revalidatePath("/grooming")
  revalidatePath("/clinic")
  revalidatePath("/")
  return { success: true }
}

export async function assignOrderDeliveryBoy(
  orderId: string,
  deliveryBoyId: string | null
) {
  await requireAdmin()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  })
  if (!order) {
    throw new Error("Order not found.")
  }

  if (deliveryBoyId) {
    const deliveryBoy = await prisma.user.findFirst({
      where: { id: deliveryBoyId, role: "DELIVERY" },
      select: { id: true },
    })
    if (!deliveryBoy) {
      throw new Error("Delivery account not found.")
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryBoyId },
  })

  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/seller")
  revalidatePath("/account")
  revalidatePath("/orders")
  return { success: true as const }
}

export async function markAdminPaymentReceived(
  orderId: string,
  sellerId: string
) {
  const session = await requireAdmin()

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { sellerId } } },
    },
    select: { id: true },
  })

  if (!order) {
    throw new Error("Order not found or has no items from that seller.")
  }

  await markOrderSellerPaymentReceived({
    orderId,
    sellerId,
    markedByUserId: session.user.id,
    markedByRole: "ADMIN",
  })

  return { success: true as const }
}

// ─── Products & Inventory ───────────────────────────────────────────────────

export type AdminProduct = {
  id: string
  title: string
  price: number
  stock: number
  lowStockThreshold: number
  categories: { id: string; name: string }[]
  animals: string[]
  seller: { id: string; name: string | null; email: string | null }
  variants: { id: string; label: string; stock: number; price: number | null }[]
  isLowStock: boolean
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  sortOrder: number
  productCount: number
  sellerId: string | null
  sellerName: string | null
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  await requireAdmin()
  const settings = await getOrCreateStoreSettings()

  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { select: { id: true, name: true } },
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
    categories: product.categories,
    animals: product.animals,
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
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true } },
      seller: { select: { name: true, email: true } },
    },
  })

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    sortOrder: cat.sortOrder,
    productCount: cat._count.products,
    sellerId: cat.sellerId,
    sellerName: cat.seller?.name?.trim() || cat.seller?.email || null,
  }))
}

export async function updateAdminProduct(
  productId: string,
  data: {
    title?: string
    price?: number
    stock?: number
    categoryIds?: string[]
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

  let categoryIds: string[] | undefined
  if (data.categoryIds !== undefined) {
    categoryIds = Array.from(
      new Set(data.categoryIds.map((id) => id.trim()).filter(Boolean))
    )
    if (categoryIds.length === 0) {
      throw new Error("Select at least one category.")
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true },
    })
    if (!product) {
      throw new Error("Product not found.")
    }

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, sellerId: true },
    })
    if (categories.length !== categoryIds.length) {
      throw new Error("One or more categories were not found.")
    }
    for (const category of categories) {
      if (category.sellerId && category.sellerId !== product.sellerId) {
        throw new Error("That category belongs to another seller.")
      }
    }
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(categoryIds !== undefined && {
        categories: { set: categoryIds.map((id) => ({ id })) },
      }),
      ...(data.lowStockThreshold !== undefined && {
        lowStockThreshold: data.lowStockThreshold,
      }),
    },
  })

  revalidatePath("/admin")
  return { success: true }
}

/** @deprecated Prefer createStoreCategory in store-categories actions (supports image + order). */
export async function createAdminCategory(name: string) {
  await requireAdmin()

  const trimmed = assertValidCategoryName(name)
  const slug = toCategorySlug(trimmed)

  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (existing) {
    throw new Error("A store category with that name already exists.")
  }

  const maxOrder = await prisma.category.aggregate({
    where: { sellerId: null },
    _max: { sortOrder: true },
  })

  await prisma.category.create({
    data: {
      name: trimmed,
      slug,
      sellerId: null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/items")
  revalidatePath("/")
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

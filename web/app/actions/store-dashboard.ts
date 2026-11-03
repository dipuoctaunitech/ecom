"use server"

import type { OrderStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireStoreStaffSession } from "@/lib/auth-guards"
import { setOrderStatus } from "@/lib/orders"
import { canManageStoreCatalog, getActiveStore } from "@/lib/store"
import { prisma } from "@/lib/prisma"

const OPEN_STATUSES: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED"]
const BOARD_LIMIT = 60

export type StoreBoardOrder = {
  id: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  updatedAt: string
  deliveryBoyName: string | null
  buyer: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
  }
  itemCount: number
  items: {
    id: string
    quantity: number
    title: string
    sellerName: string
  }[]
  unpaidSellerCount: number
}

export type StoreBoardSummary = {
  pending: number
  processing: number
  shipped: number
  deliveredToday: number
  openTotal: number
  unpaidOpen: number
}

export type StoreLiveBoard = {
  storeName: string
  fetchedAt: string
  canUpdateStatus: boolean
  summary: StoreBoardSummary
  orders: StoreBoardOrder[]
}

export type StoreStaffProfile = {
  id: string
  name: string | null
  email: string | null
  role: "ADMIN" | "SELLER"
  storeName: string
  canUpdateStatus: boolean
}

async function requireStoreStaff() {
  const session = await requireStoreStaffSession()
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Store staff access required.")
  }
  return session
}

export async function getStoreStaffProfile(): Promise<StoreStaffProfile | null> {
  const session = await requireStoreStaffSession()
  if (!session?.user?.id) return null

  const [user, store, canUpdate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true },
    }),
    getActiveStore(),
    canManageStoreCatalog(session.user.id),
  ])

  if (!user || (user.role !== "ADMIN" && user.role !== "SELLER")) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeName: store?.name ?? "namma pets Club",
    canUpdateStatus: user.role === "ADMIN" || canUpdate,
  }
}

export async function getStoreLiveBoard(): Promise<StoreLiveBoard> {
  const session = await requireStoreStaff()
  const [store, canUpdate] = await Promise.all([
    getActiveStore(),
    canManageStoreCatalog(session.user.id),
  ])

  const canViewPii =
    session.user.role === "ADMIN" || canUpdate
  if (!canViewPii) {
    throw new Error(
      "Only admins and store managers can view the live order board."
    )
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    pending,
    processing,
    shipped,
    deliveredToday,
    unpaidOpen,
    orders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.order.count({ where: { status: "SHIPPED" } }),
    prisma.order.count({
      where: {
        status: "DELIVERED",
        updatedAt: { gte: startOfToday },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: OPEN_STATUSES },
        payments: { some: { paymentReceived: false } },
      },
    }),
    prisma.order.findMany({
      where: { status: { in: OPEN_STATUSES } },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: BOARD_LIMIT,
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        deliveryBoy: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: {
                title: true,
                seller: { select: { name: true, email: true } },
              },
            },
          },
        },
        payments: {
          select: { paymentReceived: true },
        },
      },
    }),
  ])

  const mapped: StoreBoardOrder[] = orders.map((order) => ({
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deliveryBoyName:
      order.deliveryBoy?.name?.trim() ||
      order.deliveryBoy?.email?.split("@")[0] ||
      null,
    buyer: order.buyer,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      title: item.product.title,
      sellerName:
        item.product.seller.name?.trim() ||
        item.product.seller.email?.split("@")[0] ||
        "Seller",
    })),
    unpaidSellerCount: order.payments.filter((p) => !p.paymentReceived).length,
  }))

  return {
    storeName: store?.name ?? "namma pets Club",
    fetchedAt: new Date().toISOString(),
    canUpdateStatus:
      session.user.role === "ADMIN" || canUpdate,
    summary: {
      pending,
      processing,
      shipped,
      deliveredToday,
      openTotal: pending + processing + shipped,
      unpaidOpen,
    },
    orders: mapped,
  }
}

export async function updateStoreBoardOrderStatus(
  orderId: string,
  status: OrderStatus
) {
  const session = await requireStoreStaff()
  const canUpdate =
    session.user.role === "ADMIN" ||
    (await canManageStoreCatalog(session.user.id))

  if (!canUpdate) {
    throw new Error(
      "Only admins and store managers can update order status from the store board."
    )
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  })
  if (!order) {
    throw new Error("Order not found.")
  }

  await setOrderStatus(orderId, status)

  revalidatePath("/store")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/manager")
  revalidatePath("/delivery")
  revalidatePath("/orders")
  revalidatePath("/account")

  return { success: true as const }
}

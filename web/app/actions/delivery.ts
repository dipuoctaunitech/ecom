"use server"

import type { OrderStatus, PaymentMarkedByRole } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { requireDeliverySession } from "@/lib/auth-guards"
import { resolveProductImageUrl } from "@/lib/images"
import { setOrderStatus } from "@/lib/orders"
import { markOrderSellerPaymentReceived } from "@/lib/payments"
import { prisma } from "@/lib/prisma"

const DELIVERY_STATUS_UPDATES: OrderStatus[] = ["SHIPPED", "DELIVERED"]

export type DeliveryPaymentSlice = {
  sellerId: string
  sellerName: string
  sellerTotal: number
  qrCodeUrl: string | null
  receiptUrl: string | null
  paymentReceived: boolean
  paymentReceivedAt: string | null
  paymentMarkedByRole: PaymentMarkedByRole | null
  items: {
    id: string
    quantity: number
    priceAtPurchase: number
    lineTotal: number
    product: { id: string; title: string }
  }[]
}

export type DeliveryAssignment = {
  id: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
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
    country: string | null
  }
  payments: DeliveryPaymentSlice[]
}

export type DeliveryProfile = {
  id: string
  name: string | null
  email: string | null
}

async function requireDelivery() {
  const session = await requireDeliverySession()
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Delivery access required.")
  }
  return session
}

export async function getDeliveryProfile(): Promise<DeliveryProfile | null> {
  const session = await requireDeliverySession()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!user || user.role !== "DELIVERY") return null

  return { id: user.id, name: user.name, email: user.email }
}

export async function getDeliveryAssignments(): Promise<DeliveryAssignment[]> {
  const session = await requireDelivery()
  const deliveryBoyId = session.user.id

  const orders = await prisma.order.findMany({
    where: { deliveryBoyId },
    orderBy: { createdAt: "desc" },
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
          country: true,
        },
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
                  id: true,
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
  })

  return orders.map((order) => {
    const bySeller = new Map<
      string,
      {
        sellerId: string
        sellerName: string
        qrCodeUrl: string | null
        items: DeliveryPaymentSlice["items"]
        sellerTotal: number
      }
    >()

    for (const item of order.items) {
      const sellerId = item.product.sellerId
      const existing = bySeller.get(sellerId)
      const lineTotal =
        Math.round(item.quantity * Number(item.priceAtPurchase) * 100) / 100
      const line = {
        id: item.id,
        quantity: item.quantity,
        priceAtPurchase: Number(item.priceAtPurchase),
        lineTotal,
        product: { id: item.product.id, title: item.product.title },
      }
      const sellerName =
        item.product.seller.name?.trim() ||
        item.product.seller.email?.split("@")[0] ||
        "Seller"
      const qrCodeUrl = item.product.seller.sellerSettings?.qrCodeUrl
        ? resolveProductImageUrl(item.product.seller.sellerSettings.qrCodeUrl)
        : null

      if (existing) {
        existing.items.push(line)
        existing.sellerTotal =
          Math.round((existing.sellerTotal + lineTotal) * 100) / 100
      } else {
        bySeller.set(sellerId, {
          sellerId,
          sellerName,
          qrCodeUrl,
          items: [line],
          sellerTotal: lineTotal,
        })
      }
    }

    const paymentBySeller = new Map(
      order.payments.map((payment) => [payment.sellerId, payment])
    )

    const payments: DeliveryPaymentSlice[] = [...bySeller.values()].map(
      (group) => {
        const payment = paymentBySeller.get(group.sellerId)
        return {
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          sellerTotal: group.sellerTotal,
          qrCodeUrl: group.qrCodeUrl,
          receiptUrl: payment?.receiptUrl
            ? resolveProductImageUrl(payment.receiptUrl)
            : null,
          paymentReceived: payment?.paymentReceived ?? false,
          paymentReceivedAt: payment?.paymentReceivedAt?.toISOString() ?? null,
          paymentMarkedByRole: payment?.paymentMarkedByRole ?? null,
          items: group.items,
        }
      }
    )

    return {
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      buyer: order.buyer,
      payments,
    }
  })
}

export async function markDeliveryPaymentReceived(
  orderId: string,
  sellerId: string
) {
  const session = await requireDelivery()
  const deliveryBoyId = session.user.id

  const order = await prisma.order.findFirst({
    where: { id: orderId, deliveryBoyId },
    include: {
      items: {
        include: {
          product: { select: { sellerId: true } },
        },
      },
    },
  })

  if (!order) {
    throw new Error("Delivery not found or not assigned to you.")
  }

  const hasSellerItems = order.items.some(
    (item) => item.product.sellerId === sellerId
  )
  if (!hasSellerItems) {
    throw new Error("This order has no items from that seller.")
  }

  await markOrderSellerPaymentReceived({
    orderId,
    sellerId,
    markedByUserId: deliveryBoyId,
    markedByRole: "DELIVERY",
  })

  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/orders")
  revalidatePath("/account")

  return { success: true as const }
}

/** Delivery can mark a run as out for delivery (SHIPPED) or completed (DELIVERED). */
export async function updateDeliveryRunStatus(
  orderId: string,
  status: OrderStatus
) {
  const session = await requireDelivery()
  const deliveryBoyId = session.user.id

  if (!DELIVERY_STATUS_UPDATES.includes(status)) {
    throw new Error("Delivery can only mark runs as shipped or delivered.")
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, deliveryBoyId },
    select: { id: true, status: true },
  })

  if (!order) {
    throw new Error("Delivery not found or not assigned to you.")
  }

  await setOrderStatus(orderId, status)

  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/orders")
  revalidatePath("/account")

  return { success: true as const }
}

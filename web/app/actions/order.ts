"use server"

import { revalidatePath } from "next/cache"
import { isValidReceiptUrl, requireUserSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import type { OrderStatus } from "@prisma/client"
import { toProduct } from "@/lib/products"
import type { Product } from "@shared/types"
import { resolveProductImageUrl } from "@/lib/images"
import { assertBuyerCanUploadReceipt } from "@/lib/receipts"
import { setOrderStatus } from "@/lib/orders"
export type CheckoutSellerInfo = {
  productId: string
  sellerId: string
  sellerName: string
  qrCodeUrl: string | null
  gstNumber: string | null
}

export type CheckoutBuyerInfo = {
  gstNumber: string | null
}

export async function getCheckoutBuyerInfo(): Promise<CheckoutBuyerInfo> {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    return { gstNumber: null }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { gstNumber: true },
  })

  return { gstNumber: user?.gstNumber ?? null }
}

export async function getCheckoutSellerInfo(
  productIds: string[]
): Promise<CheckoutSellerInfo[]> {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    throw new Error("Sign in required to view seller payment details.")
  }

  const uniqueIds = [...new Set(productIds)].slice(0, 50)
  if (uniqueIds.length === 0) return []

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      sellerId: true,
      seller: {
        select: {
          name: true,
          email: true,
          sellerSettings: { select: { qrCodeUrl: true, gstNumber: true } },
        },
      },
    },
  })

  return products.map((product) => ({
    productId: product.id,
    sellerId: product.sellerId,
    sellerName:
      product.seller.name?.trim() ||
      product.seller.email?.split("@")[0] ||
      "Seller",
    qrCodeUrl: product.seller.sellerSettings?.qrCodeUrl
      ? resolveProductImageUrl(product.seller.sellerSettings.qrCodeUrl)
      : null,
    gstNumber: product.seller.sellerSettings?.gstNumber ?? null,
  }))
}

export type BuyerOrderItem = {
  id: string
  quantity: number
  priceAtPurchase: number
  product: Product
}

export type BuyerOrderPayment = {
  sellerId: string
  sellerName: string
  qrCodeUrl: string | null
  receiptUrl: string | null
  paymentReceived: boolean
  paymentMarkedByRole: "SELLER" | "DELIVERY" | "ADMIN" | null
}

export type BuyerOrder = {
  id: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  items: BuyerOrderItem[]
  payments: BuyerOrderPayment[]
}

export async function getBuyerOrders(): Promise<BuyerOrder[]> {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    throw new Error("Sign in required to view your orders.")
  }

  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            include: {
              categories: { select: { name: true, slug: true } },
              seller: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      payments: {
        include: {
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
  })

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      priceAtPurchase: Number(item.priceAtPurchase),
      product: toProduct(item.product),
    })),
    payments: order.payments.map((payment) => ({
      sellerId: payment.sellerId,
      sellerName:
        payment.seller.name?.trim() ||
        payment.seller.email?.split("@")[0] ||
        "Seller",
      qrCodeUrl: payment.seller.sellerSettings?.qrCodeUrl
        ? resolveProductImageUrl(payment.seller.sellerSettings.qrCodeUrl)
        : null,
      receiptUrl: payment.receiptUrl
        ? resolveProductImageUrl(payment.receiptUrl)
        : null,
      paymentReceived: payment.paymentReceived,
      paymentMarkedByRole: payment.paymentMarkedByRole,
    })),
  }))
}

export async function placeOrder(
  items: { productId: string; quantity: number }[]
): Promise<{ success: true; orderId: string }> {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    throw new Error("Sign in to place an order so you can track it later.")
  }

  if (!items.length) {
    throw new Error("Your cart is empty.")
  }

  const productIds = [...new Set(items.map((item) => item.productId))]
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  })

  if (products.length !== productIds.length) {
    throw new Error("One or more products in your cart are no longer available.")
  }

  const productMap = new Map(products.map((product) => [product.id, product]))

  const lineItems: {
    productId: string
    quantity: number
    priceAtPurchase: number
  }[] = []

  let totalAmount = 0

  // A cart can list the same product more than once. Combining the quantities
  // first keeps the stock check against the real total and produces a single
  // order line per product.
  const quantityByProduct = new Map<string, number>()

  for (const item of items) {
    const quantity = Math.floor(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Invalid quantity.")
    }

    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + quantity
    )
  }

  for (const [productId, quantity] of quantityByProduct) {
    const product = productMap.get(productId)
    if (!product) {
      throw new Error("Product not found.")
    }

    if (product.stock < quantity) {
      throw new Error(
        `"${product.title}" only has ${product.stock} left in stock.`
      )
    }

    const priceAtPurchase = Number(product.price)
    lineItems.push({
      productId: product.id,
      quantity,
      priceAtPurchase,
    })
    totalAmount += priceAtPurchase * quantity
  }

  const order = await prisma.$transaction(async (tx) => {
    for (const line of lineItems) {
      const updated = await tx.product.updateMany({
        where: {
          id: line.productId,
          stock: { gte: line.quantity },
        },
        data: {
          stock: { decrement: line.quantity },
        },
      })

      if (updated.count !== 1) {
        throw new Error("Stock changed while placing your order. Try again.")
      }
    }

    const created = await tx.order.create({
      data: {
        buyerId: session.user.id,
        status: "PENDING",
        totalAmount,
        items: {
          create: lineItems.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            priceAtPurchase: line.priceAtPurchase,
          })),
        },
      },
    })

    const sellerIds = [...new Set(products.map((product) => product.sellerId))]

    await tx.orderPayment.createMany({
      data: sellerIds.map((sellerId) => ({
        orderId: created.id,
        sellerId,
        receiptUrl: null,
      })),
    })

    return created
  })

  revalidatePath("/orders")
  revalidatePath("/account")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  revalidatePath("/")

  return { success: true, orderId: order.id }
}

export async function confirmBuyerReceived(orderId: string) {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    throw new Error("Sign in to confirm you received this order.")
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: session.user.id },
    select: { status: true },
  })

  if (!order) {
    throw new Error("Order not found.")
  }

  if (order.status === "DELIVERED") {
    return { success: true as const }
  }

  if (order.status === "RETURNED" || order.status === "REFUNDED") {
    throw new Error("This order cannot be marked received.")
  }

  await setOrderStatus(orderId, "DELIVERED")

  revalidatePath("/orders")
  revalidatePath("/account")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  return { success: true as const }
}

export async function attachOrderReceipt(
  orderId: string,
  sellerId: string,
  receiptUrl: string
) {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    throw new Error("Sign in to upload a payment receipt.")
  }

  await assertBuyerCanUploadReceipt(session.user.id, orderId, sellerId)

  if (!isValidReceiptUrl(receiptUrl, session.user.id)) {
    throw new Error("Payment receipts must be uploaded through the app.")
  }

  await prisma.orderPayment.update({
    where: { orderId_sellerId: { orderId, sellerId } },
    data: { receiptUrl },
  })

  revalidatePath("/orders")
  revalidatePath("/account")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  return { success: true as const, receiptUrl }
}

export async function removeOrderReceipt(orderId: string, sellerId: string) {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    throw new Error("Sign in required.")
  }

  await assertBuyerCanUploadReceipt(session.user.id, orderId, sellerId)

  await prisma.orderPayment.update({
    where: { orderId_sellerId: { orderId, sellerId } },
    data: { receiptUrl: null },
  })

  revalidatePath("/orders")
  revalidatePath("/account")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/delivery")
  revalidatePath("/store")
  return { success: true as const }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireUserSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import type { OrderStatus } from "@prisma/client"
import { toProduct } from "@/lib/products"
import type { Product } from "@shared/types"

export type BuyerOrderItem = {
  id: string
  quantity: number
  priceAtPurchase: number
  product: Product
}

export type BuyerOrder = {
  id: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  items: BuyerOrderItem[]
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
              category: { select: { name: true, slug: true } },
              seller: { select: { name: true } },
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

    return tx.order.create({
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
  })

  revalidatePath("/orders")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/")

  return { success: true, orderId: order.id }
}

import type { OrderStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/** Statuses that mean the goods came back and inventory is available again. */
const RESTOCKING_STATUSES: OrderStatus[] = ["RETURNED", "REFUNDED"]

/**
 * Orders only move forward. Returned and refunded are terminal because they
 * put stock back; allowing a move out of them would have to take that stock
 * away again, which can drive inventory negative when it has since been sold.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "SHIPPED", "DELIVERED", "RETURNED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "DELIVERED", "RETURNED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "RETURNED", "REFUNDED"],
  DELIVERED: ["RETURNED", "REFUNDED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
}

/**
 * Moves an order to `status`, keeping product stock in sync.
 *
 * Checkout decrements stock when the order is placed, so a return or refund has
 * to put those units back. Inventory only moves when the order crosses into or
 * out of a restocking status, which keeps repeated status changes from
 * double-counting.
 */
export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        items: { select: { productId: true, quantity: true } },
      },
    })

    if (!order) {
      throw new Error("Order not found.")
    }

    if (order.status === status) {
      return
    }

    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
      throw new Error(
        `An order that is ${order.status.toLowerCase()} cannot be changed to ${status.toLowerCase()}.`
      )
    }

    const wasRestocked = RESTOCKING_STATUSES.includes(order.status)
    const willRestock = RESTOCKING_STATUSES.includes(status)

    // Only ever adds stock back. The transition table makes restocking
    // statuses terminal, so there is no path that needs to remove it again.
    if (!wasRestocked && willRestock) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }

    await tx.order.update({ where: { id: orderId }, data: { status } })
  })
}

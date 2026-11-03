import { prisma } from "@/lib/prisma"

/** Authorize GET of receipts/{buyerId}/… object keys. */
export async function canAccessReceiptObject(
  userId: string,
  objectKey: string
): Promise<{ allowed: boolean; reason: string }> {
  if (!objectKey.startsWith("receipts/") || objectKey.includes("..")) {
    return { allowed: false, reason: "invalid_key" }
  }

  const segments = objectKey.split("/")
  if (segments.length < 3 || !segments[1] || !segments[2]) {
    return { allowed: false, reason: "malformed_key" }
  }

  const ownerId = segments[1]
  if (ownerId === userId) {
    return { allowed: true, reason: "owner" }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (dbUser?.role === "ADMIN") {
    return { allowed: true, reason: "admin" }
  }

  const receiptUrl = `/api/images/${objectKey}`
  const payment = await prisma.orderPayment.findFirst({
    where: { receiptUrl },
    select: {
      sellerId: true,
      order: { select: { buyerId: true, deliveryBoyId: true } },
    },
  })

  if (!payment) {
    return { allowed: false, reason: "no_payment_row" }
  }

  if (payment.order.buyerId === userId) {
    return { allowed: true, reason: "buyer" }
  }
  if (payment.sellerId === userId) {
    return { allowed: true, reason: "seller" }
  }
  if (payment.order.deliveryBoyId === userId) {
    return { allowed: true, reason: "delivery" }
  }

  return { allowed: false, reason: "forbidden" }
}

export async function assertBuyerCanUploadReceipt(
  buyerId: string,
  orderId: string,
  sellerId: string
) {
  if (!orderId || !sellerId) {
    throw new Error("Choose the delivered order and seller before uploading a receipt.")
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId },
    select: {
      status: true,
      payments: {
        where: { sellerId },
        select: { id: true, paymentReceived: true },
      },
    },
  })

  if (!order) {
    throw new Error("Order not found.")
  }

  if (order.status !== "DELIVERED") {
    throw new Error(
      "Mark the order received before uploading a receipt."
    )
  }

  const payment = order.payments[0]
  if (!payment) {
    throw new Error("No payment is due to this seller for this order.")
  }

  if (payment.paymentReceived) {
    throw new Error("This seller already confirmed payment.")
  }
}

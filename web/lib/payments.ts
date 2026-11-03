import { revalidatePath } from "next/cache"
import type { PaymentMarkedByRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/** Paths that show order / payment status and must refresh together. */
export function revalidatePaymentViews() {
  revalidatePath("/delivery")
  revalidatePath("/seller")
  revalidatePath("/admin")
  revalidatePath("/account")
  revalidatePath("/orders")
  revalidatePath("/")
}

export async function markOrderSellerPaymentReceived(params: {
  orderId: string
  sellerId: string
  markedByUserId: string
  markedByRole: PaymentMarkedByRole
}) {
  const { orderId, sellerId, markedByUserId, markedByRole } = params
  const now = new Date()

  await prisma.orderPayment.upsert({
    where: {
      orderId_sellerId: { orderId, sellerId },
    },
    create: {
      orderId,
      sellerId,
      paymentReceived: true,
      paymentReceivedAt: now,
      paymentMarkedById: markedByUserId,
      paymentMarkedByRole: markedByRole,
    },
    update: {
      paymentReceived: true,
      paymentReceivedAt: now,
      paymentMarkedById: markedByUserId,
      paymentMarkedByRole: markedByRole,
    },
  })

  revalidatePaymentViews()
}

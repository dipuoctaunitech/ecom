'use client'

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  QrCode,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react"
import { OrderStatus } from "@prisma/client"
import {
  attachOrderReceipt,
  confirmBuyerReceived,
  removeOrderReceipt,
  type BuyerOrder,
} from "@/app/actions/order"
import { CartSidebar } from "@/components/CartSidebar"
import { EnlargeableImage } from "@/components/EnlargeableImage"
import { useCartStore } from "@/store/useCartStore"
import { formatINR } from "@/lib/money"
import { uploadFile } from "@/lib/upload-client"

const RECEIVABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
]

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  PROCESSING: "bg-blue-50 text-blue-800 ring-blue-200",
  SHIPPED: "bg-violet-50 text-violet-800 ring-violet-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  RETURNED: "bg-orange-50 text-orange-800 ring-orange-200",
  REFUNDED: "bg-red-50 text-red-800 ring-red-200",
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso))
}

function truncateId(id: string) {
  return `${id.slice(0, 8).toUpperCase()}`
}

export function BuyerOrdersPanel({
  initialOrders,
}: {
  initialOrders: BuyerOrder[]
}) {
  const addItem = useCartStore((state) => state.addItem)
  const [orders, setOrders] = useState(initialOrders)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const handleReorder = (order: BuyerOrder) => {
    setMessage("")
    setError("")

    let added = 0
    const skipped: string[] = []

    for (const item of order.items) {
      if (item.product.stock <= 0) {
        skipped.push(item.product.name)
        continue
      }
      addItem(item.product, item.quantity)
      added += 1
    }

    if (added === 0) {
      setError(
        skipped.length > 0
          ? "None of these items are in stock right now."
          : "Could not add items to your cart."
      )
      return
    }

    const parts = [
      `Added ${added} item${added === 1 ? "" : "s"} to your cart.`,
    ]
    if (skipped.length > 0) {
      parts.push(`Out of stock: ${skipped.join(", ")}.`)
    }
    setMessage(parts.join(" "))
  }

  const updatePayment = (
    orderId: string,
    sellerId: string,
    receiptUrl: string | null
  ) => {
    setOrders((current) =>
      current.map((order) =>
        order.id !== orderId
          ? order
          : {
              ...order,
              payments: order.payments.map((payment) =>
                payment.sellerId === sellerId
                  ? { ...payment, receiptUrl }
                  : payment
              ),
            }
      )
    )
  }

  async function handleMarkReceived(orderId: string) {
    setMessage("")
    setError("")
    setConfirmingId(orderId)

    try {
      await confirmBuyerReceived(orderId)
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: "DELIVERED" } : order
        )
      )
      setMessage(
        "Marked as received. You can optionally upload a payment receipt below."
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark the order received."
      )
    } finally {
      setConfirmingId(null)
    }
  }

  async function handleReceiptUpload(
    orderId: string,
    sellerId: string,
    file: File
  ) {
    setMessage("")
    setError("")
    setUploadingKey(`${orderId}:${sellerId}`)

    try {
      const publicUrl = await uploadFile({
        file,
        purpose: "receipt",
        orderId,
        sellerId,
      })
      await attachOrderReceipt(orderId, sellerId, publicUrl)
      updatePayment(orderId, sellerId, publicUrl)
      setMessage("Receipt uploaded. The seller can now confirm payment.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload receipt.")
    } finally {
      setUploadingKey(null)
    }
  }

  async function handleReceiptRemove(orderId: string, sellerId: string) {
    setMessage("")
    setError("")
    setUploadingKey(`${orderId}:${sellerId}`)

    try {
      await removeOrderReceipt(orderId, sellerId)
      updatePayment(orderId, sellerId, null)
      setMessage("Receipt removed.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove receipt.")
    } finally {
      setUploadingKey(null)
    }
  }

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h2 className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          Orders
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted sm:mt-2">
          Mark an order received when it arrives. Then scan the seller QR to
          pay. A receipt is optional.
        </p>
      </div>

      {message && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 sm:px-4">
          {message}{" "}
          <Link href="/checkout" className="font-medium underline">
            Go to checkout
          </Link>
        </p>
      )}

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4">
          {error}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="border border-line bg-surface-elevated px-4 py-12 text-center sm:bg-surface sm:px-6 sm:py-16">
          <p className="text-sm text-ink-muted">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/items"
            className="mt-6 inline-flex h-11 w-full max-w-xs items-center justify-center bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="border border-line bg-surface-elevated sm:bg-surface"
            >
              <div className="flex flex-col gap-3 border-b border-line px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <p className="font-mono text-xs text-ink-muted">
                      Order #{truncateId(order.id)}
                    </p>
                    <span
                      className={`inline-flex px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ring-1 sm:text-xs ${STATUS_STYLES[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    Placed {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <p className="font-display text-lg font-medium tabular-nums text-ink">
                    {formatINR(order.totalAmount)}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                    {RECEIVABLE_STATUSES.includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => void handleMarkReceived(order.id)}
                        disabled={confirmingId === order.id}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 border border-emerald-700 bg-emerald-700 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 sm:min-h-0 sm:w-auto"
                      >
                        <CheckCircle2
                          className="h-3.5 w-3.5"
                          strokeWidth={1.75}
                        />
                        {confirmingId === order.id
                          ? "Updating…"
                          : "Mark received"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 sm:min-h-0 sm:w-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Reorder
                    </button>
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-line">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 px-3 py-3 sm:items-center sm:gap-4 sm:px-5 sm:py-4"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 border border-line object-cover sm:h-14 sm:w-14"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-surface text-xs text-ink-muted sm:h-14 sm:w-14 sm:bg-surface-elevated">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${item.product.id}`}
                        className="line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-highlight"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                        Qty {item.quantity} · {formatINR(item.priceAtPurchase)}{" "}
                        each
                        {item.product.stock <= 0 ? (
                          <span className="ml-2 text-amber-700">
                            Out of stock
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm font-medium tabular-nums text-ink sm:hidden">
                        {formatINR(item.priceAtPurchase * item.quantity)}
                      </p>
                    </div>
                    <p className="hidden shrink-0 text-sm font-medium tabular-nums text-ink sm:block">
                      {formatINR(item.priceAtPurchase * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              {order.payments.length > 0 && (
                <div className="border-t border-line px-3 py-3 sm:px-5 sm:py-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                    Payments
                  </p>
                  <ul className="mt-3 space-y-3 sm:space-y-4">
                    {order.payments.map((payment) => {
                      const canUploadReceipt =
                        order.status === "DELIVERED" &&
                        !payment.paymentReceived
                      const uploading =
                        uploadingKey === `${order.id}:${payment.sellerId}`

                      return (
                        <li
                          key={payment.sellerId}
                          className="border border-line bg-surface p-3 sm:bg-surface-elevated"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                            <div className="flex gap-3">
                              {payment.qrCodeUrl ? (
                                <EnlargeableImage
                                  src={payment.qrCodeUrl}
                                  alt={`${payment.sellerName} payment QR`}
                                  wrapClassName="h-28 w-28 shrink-0 p-1 sm:h-24 sm:w-24"
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-dashed border-line text-ink-muted sm:h-24 sm:w-24">
                                  <QrCode
                                    className="h-6 w-6"
                                    strokeWidth={1.5}
                                  />
                                </div>
                              )}

                              {payment.receiptUrl ? (
                                <EnlargeableImage
                                  src={payment.receiptUrl}
                                  alt={`${payment.sellerName} receipt`}
                                  wrapClassName="h-28 w-28 shrink-0 sm:h-24 sm:w-24"
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-dashed border-line text-[10px] text-ink-muted sm:h-24 sm:w-24">
                                  No receipt
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-ink">
                                {payment.sellerName}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                                {payment.paymentReceived
                                  ? payment.paymentMarkedByRole === "DELIVERY"
                                    ? "Delivery marked payment received"
                                    : payment.paymentMarkedByRole === "ADMIN"
                                      ? "Store marked payment received"
                                      : "Seller marked payment received"
                                  : canUploadReceipt
                                    ? payment.qrCodeUrl
                                      ? "Scan the QR to pay. Receipt upload is optional."
                                      : "Pay this seller, then optionally upload a receipt."
                                    : order.status === "DELIVERED"
                                      ? "Waiting for seller to confirm payment"
                                      : "Mark the order received first. Receipt is optional after that."}
                              </p>

                              {canUploadReceipt && (
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                  <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 border border-line bg-surface-elevated px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:border-ink/40 sm:min-h-0 sm:w-auto sm:bg-surface sm:py-1.5">
                                    <Upload
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.75}
                                    />
                                    {uploading
                                      ? "Uploading…"
                                      : payment.receiptUrl
                                        ? "Replace"
                                        : "Upload receipt (optional)"}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,image/gif"
                                      className="sr-only"
                                      disabled={uploading}
                                      onChange={(event) => {
                                        const file = event.target.files?.[0]
                                        event.target.value = ""
                                        if (file) {
                                          void handleReceiptUpload(
                                            order.id,
                                            payment.sellerId,
                                            file
                                          )
                                        }
                                      }}
                                    />
                                  </label>
                                  {payment.receiptUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleReceiptRemove(
                                          order.id,
                                          payment.sellerId
                                        )
                                      }
                                      disabled={uploading}
                                      className="inline-flex min-h-10 items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-red-700 disabled:opacity-50"
                                    >
                                      <Trash2
                                        className="h-3.5 w-3.5"
                                        strokeWidth={1.75}
                                      />
                                      Remove
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/** Standalone full-page orders view (legacy). Prefer /account?tab=orders. */
export default function BuyerOrders({
  initialOrders,
}: {
  initialOrders: BuyerOrder[]
}) {
  return (
    <div className="min-h-screen bg-surface">
      <CartSidebar />
      <header className="border-b border-line bg-surface-elevated">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 md:px-8">
          <div>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to account
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-line bg-surface">
                <Package className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                  namma pets Club
                </p>
                <h1 className="font-display text-xl font-medium tracking-tight text-ink">
                  My Orders
                </h1>
              </div>
            </div>
          </div>
          <p className="hidden text-sm text-ink-muted sm:block">
            {initialOrders.length}{" "}
            {initialOrders.length === 1 ? "order" : "orders"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8 md:py-10">
        <BuyerOrdersPanel initialOrders={initialOrders} />
      </main>
    </div>
  )
}

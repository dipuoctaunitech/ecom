'use client'

import { useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { OrderStatus } from "@prisma/client"
import {
  getSellerOrders,
  markSellerPaymentReceived,
  updateSellerOrderStatus,
  type PaginatedSellerOrders,
  type SellerOrderListItem,
} from "@/app/actions/seller"
import SellerInvoiceModal from "@/components/seller/SellerInvoiceModal"
import { EnlargeableImage } from "@/components/EnlargeableImage"
import { formatINR } from "@/lib/money"

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "REFUNDED",
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
  return `${id.slice(0, 8)}…`
}

export default function SellerShippingTable({
  initialData,
  qrCodeUrl,
}: {
  initialData: PaginatedSellerOrders
  qrCodeUrl: string | null
}) {
  const [data, setData] = useState(initialData)
  const [invoiceOrder, setInvoiceOrder] = useState<SellerOrderListItem | null>(
    null
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const goToPage = (page: number) => {
    setError("")
    startTransition(async () => {
      try {
        const next = await getSellerOrders(page, data.pageSize)
        setData(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders")
      }
    })
  }

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    setError("")
    startTransition(async () => {
      try {
        await updateSellerOrderStatus(orderId, status)
        setData((current) => ({
          ...current,
          orders: current.orders.map((order) =>
            order.id === orderId ? { ...order, status } : order
          ),
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update shipping status"
        )
      }
    })
  }

  const handleMarkPaymentReceived = (orderId: string) => {
    setError("")
    startTransition(async () => {
      try {
        await markSellerPaymentReceived(orderId)
        const receivedAt = new Date().toISOString()
        setData((current) => ({
          ...current,
          orders: current.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  paymentReceived: true,
                  paymentReceivedAt: receivedAt,
                }
              : order
          ),
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to mark payment received"
        )
      }
    })
  }

  const statusCounts = STATUS_OPTIONS.reduce(
    (acc, status) => {
      acc[status] = data.orders.filter((o) => o.status === status).length
      return acc
    },
    {} as Record<OrderStatus, number>
  )

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Track Shipping
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Follow orders that include your products. Confirm payment receipts,
          update fulfillment status, and print shipping invoices.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <span
            key={status}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[status]}`}
          >
            {status}
            <span className="tabular-nums opacity-70">
              {statusCounts[status]}
            </span>
          </span>
        ))}
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto border border-line bg-surface-elevated">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surface">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Buyer
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Order ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Date
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Your Items
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Your Total
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Payment
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Invoice
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.orders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-16 text-center text-sm text-ink-muted"
                >
                  No orders yet. Orders for your products will appear here after
                  checkout.
                </td>
              </tr>
            ) : (
              data.orders.map((order) => (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-surface/60"
                >
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-ink">
                      {order.buyer.name || "Unnamed buyer"}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-muted">
                      {order.buyer.email || "No email"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="font-mono text-xs text-ink-muted"
                      title={order.id}
                    >
                      {truncateId(order.id)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <ul className="space-y-1 text-sm text-ink-muted">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.product.title}{" "}
                          <span className="text-ink-muted/70">
                            × {item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium tabular-nums text-ink">
                    {formatINR(order.sellerTotal)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {qrCodeUrl ? (
                        <EnlargeableImage
                          src={qrCodeUrl}
                          alt="Your payment QR"
                          wrapClassName="h-12 w-12 shrink-0 p-0.5"
                          className="h-full w-full object-contain"
                        />
                      ) : null}
                      {order.receiptUrl ? (
                        <EnlargeableImage
                          src={order.receiptUrl}
                          alt="Payment receipt"
                          wrapClassName="h-12 w-12 shrink-0"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-ink-muted">No receipt</span>
                      )}
                      {order.paymentReceived ? (
                        <span className="inline-flex items-center bg-emerald-50 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                          Received
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkPaymentReceived(order.id)}
                          disabled={isPending}
                          className="border border-ink bg-ink px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                        >
                          Mark received
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {order.canUpdateStatus ? (
                      <select
                        value={order.status}
                        onChange={(event) =>
                          handleStatusChange(
                            order.id,
                            event.target.value as OrderStatus
                          )
                        }
                        disabled={isPending}
                        className={`h-9 min-w-[140px] border border-line bg-surface-elevated px-3 text-xs font-medium uppercase tracking-wide focus:border-ink focus:outline-none disabled:opacity-50 ${STATUS_STYLES[order.status]}`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex h-9 items-center px-3 text-xs font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[order.status]}`}
                        title="Shared order — only admin can change status"
                      >
                        {order.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setInvoiceOrder(order)}
                      className="inline-flex items-center gap-1.5 border border-line bg-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:bg-surface-elevated"
                    >
                      <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {invoiceOrder && (
        <SellerInvoiceModal
          order={invoiceOrder}
          qrCodeUrl={qrCodeUrl}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border border-line bg-surface-elevated px-4 py-3">
          <p className="text-sm text-ink-muted">
            Page {data.page} of {data.totalPages}{" "}
            <span className="hidden sm:inline">
              · {data.total} order{data.total === 1 ? "" : "s"}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(data.page - 1)}
              disabled={isPending || data.page <= 1}
              className="inline-flex h-9 items-center gap-1 border border-line bg-surface-elevated px-3 text-sm text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => goToPage(data.page + 1)}
              disabled={isPending || data.page >= data.totalPages}
              className="inline-flex h-9 items-center gap-1 border border-line bg-surface-elevated px-3 text-sm text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

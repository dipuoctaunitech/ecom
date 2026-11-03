"use client"

import { useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { OrderStatus } from "@prisma/client"
import {
  assignOrderDeliveryBoy,
  getAdminOrders,
  markAdminPaymentReceived,
  updateOrderStatus,
  type AdminDeliveryBoyRow,
  type AdminOrderListItem,
  type PaginatedOrders,
} from "@/app/actions/admin"
import AdminInvoiceModal from "@/components/admin/AdminInvoiceModal"
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

export default function AdminOrderTable({
  initialData,
  deliveryBoys,
}: {
  initialData: PaginatedOrders
  deliveryBoys: AdminDeliveryBoyRow[]
}) {
  const [data, setData] = useState(initialData)
  const [invoiceOrder, setInvoiceOrder] = useState<AdminOrderListItem | null>(
    null
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const goToPage = (page: number) => {
    setError("")
    startTransition(async () => {
      try {
        const next = await getAdminOrders(page, data.pageSize)
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
        await updateOrderStatus(orderId, status)
        setData((current) => ({
          ...current,
          orders: current.orders.map((order) =>
            order.id === orderId ? { ...order, status } : order
          ),
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update order status"
        )
      }
    })
  }

  const handleAssignDelivery = (
    orderId: string,
    deliveryBoyId: string | null
  ) => {
    setError("")
    startTransition(async () => {
      try {
        await assignOrderDeliveryBoy(orderId, deliveryBoyId)
        const boy = deliveryBoys.find((row) => row.id === deliveryBoyId)
        setData((current) => ({
          ...current,
          orders: current.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  deliveryBoyId,
                  deliveryBoyName:
                    boy?.name?.trim() ||
                    boy?.email?.split("@")[0] ||
                    null,
                }
              : order
          ),
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to assign delivery"
        )
      }
    })
  }

  const handleMarkPayment = (orderId: string, sellerId: string) => {
    setError("")
    startTransition(async () => {
      try {
        await markAdminPaymentReceived(orderId, sellerId)
        const receivedAt = new Date().toISOString()
        setData((current) => ({
          ...current,
          orders: current.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  payments: order.payments.map((payment) =>
                    payment.sellerId === sellerId
                      ? {
                          ...payment,
                          paymentReceived: true,
                          paymentReceivedAt: receivedAt,
                          paymentMarkedByRole: "ADMIN",
                        }
                      : payment
                  ),
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

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Order Fulfillment
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Assign delivery, update statuses, mark COD payments received, and
          open invoices. Payment updates sync to customer, seller, and delivery.
        </p>
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
                Order
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Items
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Payment
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Delivery
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
                  colSpan={7}
                  className="px-5 py-16 text-center text-sm text-ink-muted"
                >
                  No orders yet. Orders will appear here once buyers complete
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
                    <div className="mt-1 text-xs text-ink-muted">
                      {formatDate(order.createdAt)}
                    </div>
                    <div className="mt-1 text-sm font-medium tabular-nums text-ink">
                      {formatINR(order.totalAmount)}
                    </div>
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
                  <td className="px-5 py-4">
                    <div className="space-y-3">
                      {order.payments.map((payment) => (
                        <div
                          key={payment.sellerId}
                          className="min-w-[12rem] space-y-2 border border-line bg-surface p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium text-ink">
                                {payment.sellerName}
                              </p>
                              <p className="text-xs tabular-nums text-ink-muted">
                                {formatINR(payment.sellerTotal)}
                              </p>
                            </div>
                            {payment.qrCodeUrl ? (
                              <EnlargeableImage
                                src={payment.qrCodeUrl}
                                alt={`${payment.sellerName} QR`}
                                wrapClassName="h-10 w-10 shrink-0 p-0.5"
                                className="h-full w-full object-contain"
                              />
                            ) : null}
                          </div>
                          {payment.paymentReceived ? (
                            <span className="inline-flex items-center bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                              {payment.paymentMarkedByRole
                                ? `${payment.paymentMarkedByRole} confirmed`
                                : "Received"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkPayment(order.id, payment.sellerId)
                              }
                              disabled={isPending}
                              className="border border-ink bg-ink px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                            >
                              Mark paid
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={order.deliveryBoyId ?? ""}
                      onChange={(event) =>
                        handleAssignDelivery(
                          order.id,
                          event.target.value || null
                        )
                      }
                      disabled={isPending || deliveryBoys.length === 0}
                      className="h-9 min-w-[140px] border border-line bg-surface-elevated px-3 text-xs text-ink focus:border-ink focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      {deliveryBoys.map((boy) => (
                        <option key={boy.id} value={boy.id}>
                          {boy.name || boy.email}
                        </option>
                      ))}
                    </select>
                    {deliveryBoys.length === 0 && (
                      <p className="mt-1 text-[11px] text-ink-muted">
                        Create a delivery account first
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
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
        <AdminInvoiceModal
          order={invoiceOrder}
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

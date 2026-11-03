"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Phone,
  QrCode,
  RefreshCw,
  Truck,
  X,
} from "lucide-react"
import {
  getDeliveryAssignments,
  markDeliveryPaymentReceived,
  updateDeliveryRunStatus,
  type DeliveryAssignment,
  type DeliveryPaymentSlice,
  type DeliveryProfile,
} from "@/app/actions/delivery"
import { EnlargeableImage } from "@/components/EnlargeableImage"
import { formatINR } from "@/lib/money"
import type { OrderStatus, PaymentMarkedByRole } from "@prisma/client"

type CustomerQrView = {
  qrCodeUrl: string
  sellerName: string
  amount: number
  buyerName: string | null
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  PROCESSING: "bg-blue-50 text-blue-800 ring-blue-200",
  SHIPPED: "bg-violet-50 text-violet-800 ring-violet-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  RETURNED: "bg-orange-50 text-orange-800 ring-orange-200",
  REFUNDED: "bg-red-50 text-red-800 ring-red-200",
}

const MARKED_BY_LABEL: Record<PaymentMarkedByRole, string> = {
  SELLER: "Seller confirmed",
  DELIVERY: "You confirmed",
  ADMIN: "Admin confirmed",
}

type FilterKey = "all" | "open" | "unpaid"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

function formatAddressLines(buyer: DeliveryAssignment["buyer"]) {
  return [
    buyer.addressLine1,
    buyer.addressLine2,
    [buyer.city, buyer.state, buyer.postalCode].filter(Boolean).join(", "),
    buyer.country,
  ].filter(Boolean) as string[]
}

function isOpenOrder(order: DeliveryAssignment) {
  return (
    order.status !== "DELIVERED" &&
    order.status !== "RETURNED" &&
    order.status !== "REFUNDED"
  )
}

function hasUnpaid(order: DeliveryAssignment) {
  return order.payments.some((payment) => !payment.paymentReceived)
}

function mapsUrl(buyer: DeliveryAssignment["buyer"]) {
  const query = formatAddressLines(buyer).join(", ")
  if (!query) return null
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`
}

function CustomerQrScreen({
  view,
  onClose,
}: {
  view: CustomerQrView
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-white text-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Payment QR for customer"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0">
          <p className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Scan to pay
          </p>
          <p className="truncate text-sm text-ink-muted">
            {view.buyerName ? `For ${view.buyerName}` : "Customer payment"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-line bg-surface text-ink"
          aria-label="Close QR for customer"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="text-center">
          <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            Pay {view.sellerName}
          </p>
          <p className="mt-2 font-display text-4xl font-medium tabular-nums tracking-tight text-ink sm:text-5xl">
            {formatINR(view.amount)}
          </p>
        </div>

        <div className="w-full max-w-[min(100%,22rem)] border border-line bg-white p-4 shadow-sm sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={view.qrCodeUrl}
            alt={`${view.sellerName} payment QR`}
            className="aspect-square w-full object-contain"
          />
        </div>

        <p className="max-w-xs text-center text-sm leading-relaxed text-ink-muted">
          Open your UPI app and scan this code. Hand the phone back when done.
        </p>
      </div>
    </div>,
    document.body
  )
}

export default function DeliveryDashboard({
  profile,
  initialAssignments,
}: {
  profile: DeliveryProfile
  initialAssignments: DeliveryAssignment[]
}) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [filter, setFilter] = useState<FilterKey>("all")
  const [customerQr, setCustomerQr] = useState<CustomerQrView | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  function openCustomerQr(
    payment: DeliveryPaymentSlice,
    buyerName: string | null
  ) {
    if (!payment.qrCodeUrl) return
    setCustomerQr({
      qrCodeUrl: payment.qrCodeUrl,
      sellerName: payment.sellerName,
      amount: payment.sellerTotal,
      buyerName,
    })
  }

  function refresh() {
    startTransition(async () => {
      try {
        const next = await getDeliveryAssignments()
        setAssignments(next)
        setError("")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load deliveries"
        )
      }
    })
  }

  function handleMarkPaid(orderId: string, sellerId: string) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await markDeliveryPaymentReceived(orderId, sellerId)
        const next = await getDeliveryAssignments()
        setAssignments(next)
        setSaved("Payment synced to customer, seller, and store.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to mark payment received"
        )
      }
    })
  }

  function handleStatus(orderId: string, status: OrderStatus) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await updateDeliveryRunStatus(orderId, status)
        const next = await getDeliveryAssignments()
        setAssignments(next)
        setSaved(
          status === "DELIVERED"
            ? "Run marked delivered."
            : "Run marked out for delivery."
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update delivery status"
        )
      }
    })
  }

  const openCount = assignments.filter(isOpenOrder).length
  const unpaidCount = assignments.reduce(
    (count, order) =>
      count +
      order.payments.filter((payment) => !payment.paymentReceived).length,
    0
  )

  const filtered = useMemo(() => {
    if (filter === "open") return assignments.filter(isOpenOrder)
    if (filter === "unpaid") return assignments.filter(hasUnpaid)
    return assignments
  }, [assignments, filter])

  const filters: { id: FilterKey; label: string; count: number }[] = [
    { id: "all", label: "All", count: assignments.length },
    { id: "open", label: "Open", count: openCount },
    { id: "unpaid", label: "Unpaid", count: unpaidCount },
  ]

  return (
    <div className="min-h-[100dvh] bg-surface pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-line bg-surface-elevated/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface-elevated/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="min-w-0 flex-1">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Store
            </Link>
            <div className="mt-1 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-surface">
                <Bike className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                  Delivery
                </p>
                <h1 className="truncate font-display text-lg font-medium tracking-tight text-ink sm:text-xl">
                  My runs
                </h1>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="max-w-[9rem] truncate text-xs font-medium text-ink sm:max-w-[14rem] sm:text-sm">
              {profile.name || profile.email}
            </p>
            <button
              type="button"
              onClick={refresh}
              disabled={isPending}
              className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 border border-line bg-surface px-2.5 text-xs font-medium uppercase tracking-wide text-ink transition-colors active:bg-surface-elevated disabled:opacity-50 sm:px-3"
              aria-label="Refresh deliveries"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
                strokeWidth={1.75}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-8">
        <section className="border border-line bg-surface-elevated p-4 sm:p-6">
          <p className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted sm:text-xs">
            Assigned to you
          </p>
          <h2 className="mt-1 font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
            {assignments.length === 0
              ? "No deliveries yet"
              : `${assignments.length} run${assignments.length === 1 ? "" : "s"}`}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Show the seller QR, collect payment, then mark it received.
          </p>

          <div
            className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Filter deliveries"
          >
            {filters.map((item) => {
              const active = filter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-medium uppercase tracking-wide ring-1 transition-colors ${
                    active
                      ? "bg-ink text-white ring-ink"
                      : "bg-surface text-ink-muted ring-line active:bg-surface-elevated"
                  }`}
                >
                  {item.label}
                  <span className="tabular-nums opacity-80">{item.count}</span>
                </button>
              )
            })}
          </div>
        </section>

        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {saved}
          </p>
        )}

        {assignments.length === 0 ? (
          <div className="border border-line bg-surface-elevated px-4 py-14 text-center text-sm text-ink-muted sm:px-6">
            Admin has not assigned any orders to you yet.
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-line bg-surface-elevated px-4 py-14 text-center text-sm text-ink-muted sm:px-6">
            No runs match this filter.
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {filtered.map((order) => {
              const addressLines = formatAddressLines(order.buyer)
              const directions = mapsUrl(order.buyer)

              return (
                <article
                  key={order.id}
                  className="overflow-hidden border border-line bg-surface-elevated"
                >
                  <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-medium text-ink sm:text-lg">
                            {order.buyer.name || "Customer"}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 sm:text-xs ${STATUS_STYLES[order.status]}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          {formatDate(order.createdAt)}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-ink-muted/80">
                          {order.id}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                          Total
                        </p>
                        <p className="mt-0.5 font-display text-lg font-medium tabular-nums text-ink sm:text-xl">
                          {formatINR(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-none border border-line bg-surface p-3 text-sm text-ink-muted">
                      <div className="flex items-start gap-2">
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0"
                          strokeWidth={1.75}
                        />
                        <div className="min-w-0 leading-relaxed">
                          {addressLines.length > 0 ? (
                            addressLines.map((line) => (
                              <p key={line} className="break-words">
                                {line}
                              </p>
                            ))
                          ) : (
                            <p>Address not on file</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {order.buyer.phone ? (
                          <a
                            href={`tel:${order.buyer.phone}`}
                            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-line bg-surface-elevated px-3 text-xs font-medium uppercase tracking-wide text-ink active:bg-surface sm:flex-none"
                          >
                            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Call
                          </a>
                        ) : null}
                        {directions ? (
                          <a
                            href={directions}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-line bg-surface-elevated px-3 text-xs font-medium uppercase tracking-wide text-ink active:bg-surface sm:flex-none"
                          >
                            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Maps
                          </a>
                        ) : null}
                        {order.buyer.email ? (
                          <a
                            href={`mailto:${order.buyer.email}`}
                            className="inline-flex min-h-10 w-full items-center justify-center truncate border border-line bg-surface-elevated px-3 text-xs text-ink-muted active:bg-surface sm:w-auto"
                          >
                            {order.buyer.email}
                          </a>
                        ) : null}
                      </div>

                      {isOpenOrder(order) ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {order.status !== "SHIPPED" &&
                          order.status !== "DELIVERED" ? (
                            <button
                              type="button"
                              onClick={() => handleStatus(order.id, "SHIPPED")}
                              disabled={isPending}
                              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-line bg-surface-elevated px-3 text-xs font-medium uppercase tracking-wide text-ink active:bg-surface disabled:opacity-50 sm:flex-none"
                            >
                              <Truck
                                className="h-3.5 w-3.5"
                                strokeWidth={1.75}
                              />
                              Out for delivery
                            </button>
                          ) : null}
                          {order.status !== "DELIVERED" ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatus(order.id, "DELIVERED")
                              }
                              disabled={isPending}
                              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-ink bg-ink px-3 text-xs font-medium uppercase tracking-wide text-white active:bg-neutral-800 disabled:opacity-50 sm:flex-none"
                            >
                              <PackageCheck
                                className="h-3.5 w-3.5"
                                strokeWidth={1.75}
                              />
                              Mark delivered
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="divide-y divide-line">
                    {order.payments.map((payment) => (
                      <div
                        key={payment.sellerId}
                        className="space-y-4 px-4 py-4 sm:px-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                              Collect for
                            </p>
                            <p className="mt-0.5 truncate font-medium text-ink">
                              {payment.sellerName}
                            </p>
                          </div>
                          <p className="shrink-0 font-display text-base font-medium tabular-nums text-ink">
                            {formatINR(payment.sellerTotal)}
                          </p>
                        </div>

                        <ul className="space-y-2 border border-line bg-surface p-3 text-sm">
                          {payment.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-start justify-between gap-3"
                            >
                              <span className="min-w-0 break-words text-ink-muted">
                                {item.product.title}{" "}
                                <span className="text-ink-muted/70">
                                  × {item.quantity}
                                </span>
                              </span>
                              <span className="shrink-0 tabular-nums text-ink">
                                {formatINR(item.lineTotal)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap gap-3">
                            {payment.qrCodeUrl ? (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                                  Seller QR
                                </p>
                                <EnlargeableImage
                                  src={payment.qrCodeUrl}
                                  alt={`${payment.sellerName} payment QR`}
                                  wrapClassName="h-36 w-36 touch-manipulation p-1.5 sm:h-32 sm:w-32"
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="flex h-36 w-36 items-center justify-center border border-dashed border-line bg-surface px-3 text-center text-xs text-ink-muted sm:h-32 sm:w-32">
                                No seller QR uploaded
                              </div>
                            )}
                            {payment.receiptUrl ? (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                                  Receipt
                                </p>
                                <EnlargeableImage
                                  src={payment.receiptUrl}
                                  alt={`${payment.sellerName} receipt`}
                                  wrapClassName="h-36 w-36 touch-manipulation sm:h-32 sm:w-32"
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {payment.qrCodeUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openCustomerQr(payment, order.buyer.name)
                                }
                                className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 border border-ink bg-ink px-4 py-3 text-sm font-medium uppercase tracking-wide text-white transition-colors active:bg-neutral-800 sm:min-h-11 sm:w-auto sm:text-xs"
                              >
                                <QrCode className="h-4 w-4" strokeWidth={1.75} />
                                Show QR to customer
                              </button>
                            ) : null}

                            {payment.paymentReceived ? (
                              <span className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 bg-emerald-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200 sm:w-auto">
                                <CheckCircle2
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.75}
                                />
                                {payment.paymentMarkedByRole
                                  ? MARKED_BY_LABEL[payment.paymentMarkedByRole]
                                  : "Payment received"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkPaid(order.id, payment.sellerId)
                                }
                                disabled={isPending}
                                className="inline-flex min-h-12 w-full touch-manipulation items-center justify-center border border-line bg-surface px-4 py-3 text-sm font-medium uppercase tracking-wide text-ink transition-colors active:bg-surface-elevated disabled:opacity-50 sm:min-h-11 sm:w-auto sm:text-xs"
                              >
                                Mark payment received
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {customerQr ? (
        <CustomerQrScreen
          view={customerQr}
          onClose={() => setCustomerQr(null)}
        />
      ) : null}
    </div>
  )
}

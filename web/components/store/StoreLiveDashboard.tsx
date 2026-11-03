"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Phone,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react"
import type { OrderStatus } from "@prisma/client"
import {
  getStoreLiveBoard,
  updateStoreBoardOrderStatus,
  type StoreBoardOrder,
  type StoreLiveBoard,
  type StoreStaffProfile,
} from "@/app/actions/store-dashboard"
import { formatINR } from "@/lib/money"

const REFRESH_MS = 5 * 60 * 1000

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  PROCESSING: "bg-blue-50 text-blue-800 ring-blue-200",
  SHIPPED: "bg-violet-50 text-violet-800 ring-violet-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  RETURNED: "bg-orange-50 text-orange-800 ring-orange-200",
  REFUNDED: "bg-red-50 text-red-800 ring-red-200",
}

const STATUS_ACTIONS: { status: OrderStatus; label: string }[] = [
  { status: "PROCESSING", label: "Processing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
]

type FilterKey = "all" | "PENDING" | "PROCESSING" | "SHIPPED"

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso))
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

function relativeAge(iso: string, nowMs: number) {
  const mins = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000))
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function addressLines(buyer: StoreBoardOrder["buyer"]) {
  return [
    buyer.addressLine1,
    buyer.addressLine2,
    [buyer.city, buyer.state, buyer.postalCode].filter(Boolean).join(", "),
  ].filter(Boolean) as string[]
}

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function StoreLiveDashboard({
  profile,
  initialBoard,
}: {
  profile: StoreStaffProfile
  initialBoard: StoreLiveBoard
}) {
  const [board, setBoard] = useState(initialBoard)
  const [filter, setFilter] = useState<FilterKey>("all")
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [nextRefreshAt, setNextRefreshAt] = useState(
    () => Date.now() + REFRESH_MS
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  function refreshBoard() {
    startTransition(async () => {
      try {
        const next = await getStoreLiveBoard()
        setBoard(next)
        setNextRefreshAt(Date.now() + REFRESH_MS)
        setError("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to refresh board")
      }
    })
  }

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    const auto = window.setInterval(() => {
      refreshBoard()
    }, REFRESH_MS)
    return () => window.clearInterval(auto)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refresh loop
  }, [])

  function handleStatus(orderId: string, status: OrderStatus) {
    if (!board.canUpdateStatus) return
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await updateStoreBoardOrderStatus(orderId, status)
        const next = await getStoreLiveBoard()
        setBoard(next)
        setNextRefreshAt(Date.now() + REFRESH_MS)
        setSaved(`Order marked ${status.toLowerCase()}.`)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update order status"
        )
      }
    })
  }

  const filtered = useMemo(() => {
    if (filter === "all") return board.orders
    return board.orders.filter((order) => order.status === filter)
  }, [board.orders, filter])

  const filters: { id: FilterKey; label: string; count: number }[] = [
    { id: "all", label: "Open", count: board.summary.openTotal },
    { id: "PENDING", label: "Pending", count: board.summary.pending },
    {
      id: "PROCESSING",
      label: "Processing",
      count: board.summary.processing,
    },
    { id: "SHIPPED", label: "Shipped", count: board.summary.shipped },
  ]

  const msUntilRefresh = nextRefreshAt - nowMs

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-surface-elevated/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface-elevated/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to storefront
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-surface">
                <Store className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted sm:text-xs">
                  {profile.storeName}
                </p>
                <h1 className="truncate font-display text-xl font-medium tracking-tight text-ink">
                  Store dashboard
                </h1>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <p className="hidden max-w-[12rem] truncate text-xs text-ink-muted sm:block sm:text-sm">
              {profile.name || profile.email}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 border border-line bg-surface px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted tabular-nums sm:text-xs">
                <Clock3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Refresh in {formatCountdown(msUntilRefresh)}
              </span>
              <button
                type="button"
                onClick={refreshBoard}
                disabled={isPending}
                className="inline-flex min-h-10 items-center gap-1.5 border border-line bg-surface px-3 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
                  strokeWidth={1.75}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <section className="border border-line bg-surface-elevated p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                Live order requests
              </p>
              <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
                {board.summary.openTotal === 0
                  ? "No open orders"
                  : `${board.summary.openTotal} open order${board.summary.openTotal === 1 ? "" : "s"}`}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Auto-refreshes every 5 minutes · last sync{" "}
                <span className="tabular-nums text-ink">
                  {formatClock(board.fetchedAt)}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["Pending", board.summary.pending],
                  ["Processing", board.summary.processing],
                  ["Shipped", board.summary.shipped],
                  ["Delivered today", board.summary.deliveredToday],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[6.5rem] border border-line bg-surface px-3 py-2"
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-1 font-display text-xl font-medium tabular-nums text-ink">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="mt-5 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Filter open orders"
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
                      : "bg-surface text-ink-muted ring-line hover:text-ink"
                  }`}
                >
                  {item.label}
                  <span className="tabular-nums opacity-80">{item.count}</span>
                </button>
              )
            })}
            {board.summary.unpaidOpen > 0 ? (
              <span className="inline-flex min-h-10 shrink-0 items-center px-3 text-xs text-amber-800 ring-1 ring-amber-200 bg-amber-50">
                {board.summary.unpaidOpen} unpaid open
              </span>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {saved}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <div className="border border-line bg-surface-elevated px-6 py-16 text-center text-sm text-ink-muted">
            {board.orders.length === 0
              ? "All caught up — no open order requests."
              : "No orders match this filter."}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((order) => {
              const lines = addressLines(order.buyer)
              const age = relativeAge(order.createdAt, nowMs)
              const isStale =
                order.status === "PENDING" &&
                nowMs - new Date(order.createdAt).getTime() > 30 * 60 * 1000

              return (
                <article
                  key={order.id}
                  className={`border bg-surface-elevated ${
                    isStale ? "border-amber-300" : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-medium text-ink">
                          {order.buyer.name || "Customer"}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[order.status]}`}
                        >
                          {order.status}
                        </span>
                        {isStale ? (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                            Waiting 30m+
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {formatWhen(order.createdAt)} · {age}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-muted/80">
                        {order.id}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                        Total
                      </p>
                      <p className="mt-0.5 font-display text-xl font-medium tabular-nums text-ink">
                        {formatINR(order.totalAmount)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 px-4 py-4 sm:px-5">
                    <ul className="space-y-1.5 border border-line bg-surface p-3 text-sm">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3"
                        >
                          <span className="min-w-0 text-ink-muted">
                            <span className="text-ink">{item.title}</span>
                            <span className="text-ink-muted/70">
                              {" "}
                              × {item.quantity}
                            </span>
                            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-ink-muted/70">
                              {item.sellerName}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-2 text-sm text-ink-muted">
                      {lines.length > 0 ? (
                        <div className="flex items-start gap-2">
                          <MapPin
                            className="mt-0.5 h-4 w-4 shrink-0"
                            strokeWidth={1.75}
                          />
                          <div className="leading-relaxed">
                            {lines.map((line) => (
                              <p key={line}>{line}</p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs">No address on file</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {order.buyer.phone ? (
                          <a
                            href={`tel:${order.buyer.phone}`}
                            className="inline-flex min-h-9 items-center gap-1.5 border border-line bg-surface px-3 text-xs font-medium uppercase tracking-wide text-ink"
                          >
                            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Call
                          </a>
                        ) : null}
                        {order.deliveryBoyName ? (
                          <span className="inline-flex min-h-9 items-center gap-1.5 border border-line bg-surface px-3 text-xs text-ink-muted">
                            <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {order.deliveryBoyName}
                          </span>
                        ) : (
                          <span className="inline-flex min-h-9 items-center border border-dashed border-line px-3 text-xs text-ink-muted">
                            No delivery assigned
                          </span>
                        )}
                        {order.unpaidSellerCount > 0 ? (
                          <span className="inline-flex min-h-9 items-center bg-amber-50 px-3 text-xs text-amber-800 ring-1 ring-amber-200">
                            {order.unpaidSellerCount} unpaid
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {board.canUpdateStatus ? (
                      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                        {STATUS_ACTIONS.filter(
                          (action) => action.status !== order.status
                        ).map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatus(order.id, action.status)}
                            className="inline-flex min-h-10 items-center border border-line bg-surface px-3 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
                          >
                            Mark {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

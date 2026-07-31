'use client'

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Package, RotateCcw } from "lucide-react"
import { OrderStatus } from "@prisma/client"
import type { BuyerOrder } from "@/app/actions/order"
import { CartSidebar } from "@/components/CartSidebar"
import { useCartStore } from "@/store/useCartStore"

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

export default function BuyerOrders({
  initialOrders,
}: {
  initialOrders: BuyerOrder[]
}) {
  const addItem = useCartStore((state) => state.addItem)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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

  return (
    <div className="min-h-screen bg-surface">
      <CartSidebar />
      <header className="border-b border-line bg-surface-elevated">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 md:px-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to store
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-line bg-surface">
                <Package className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                  FORMA
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
        <div className="mb-8">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
            Track Purchases
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Follow shipping status for products you bought, and reorder anytime.
          </p>
        </div>

        {message && (
          <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}{" "}
            <Link href="/checkout" className="font-medium underline">
              Go to checkout
            </Link>
          </p>
        )}

        {error && (
          <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {initialOrders.length === 0 ? (
          <div className="border border-line bg-surface-elevated px-6 py-16 text-center">
            <p className="text-sm text-ink-muted">
              You haven&apos;t placed any orders yet.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center justify-center bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {initialOrders.map((order) => (
              <article
                key={order.id}
                className="border border-line bg-surface-elevated"
              >
                <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-mono text-xs text-ink-muted">
                        Order #{truncateId(order.id)}
                      </p>
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      Placed {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-lg font-medium tabular-nums text-ink">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Reorder
                    </button>
                  </div>
                </div>

                <ul className="divide-y divide-line">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 border border-line object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-line bg-surface text-xs text-ink-muted">
                          N/A
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${item.product.id}`}
                          className="text-sm font-medium text-ink transition-colors hover:text-highlight"
                        >
                          {item.product.name}
                        </Link>
                        <p className="mt-0.5 text-sm text-ink-muted">
                          Qty {item.quantity} · $
                          {item.priceAtPurchase.toFixed(2)} each
                          {item.product.stock <= 0 ? (
                            <span className="ml-2 text-amber-700">
                              Out of stock
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-ink">
                        $
                        {(item.priceAtPurchase * item.quantity).toFixed(2)}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

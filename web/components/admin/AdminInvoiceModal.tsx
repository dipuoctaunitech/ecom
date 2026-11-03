'use client'

import { X } from "lucide-react"
import type { AdminOrderListItem } from "@/app/actions/admin"
import { formatINR } from "@/lib/money"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso))
}

export default function AdminInvoiceModal({
  order,
  onClose,
}: {
  order: AdminOrderListItem
  onClose: () => void
}) {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.priceAtPurchase * item.quantity,
    0
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-line bg-surface-elevated shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 print:hidden">
          <h3 className="font-display text-lg font-medium text-ink">Invoice</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted transition-colors hover:text-ink"
            aria-label="Close invoice"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6" id="invoice-content">
          <div className="mb-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              namma pets Club
            </p>
            <h4 className="mt-1 font-display text-xl font-medium text-ink">
              Order Invoice
            </h4>
            <p className="mt-2 text-sm text-ink-muted">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-ink-muted">
              {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="mb-8 border border-line p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Bill To
            </p>
            <p className="mt-2 text-sm font-medium text-ink">
              {order.buyer.name || "Customer"}
            </p>
            <p className="text-sm text-ink-muted">{order.buyer.email}</p>
          </div>

          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-[0.12em] text-ink-muted">
                <th className="pb-2">Item</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-ink">{item.product.title}</td>
                  <td className="py-3 text-right tabular-nums text-ink-muted">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right tabular-nums text-ink-muted">
                    {formatINR(item.priceAtPurchase)}
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium text-ink">
                    {formatINR(item.priceAtPurchase * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatINR(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between font-medium text-ink">
              <span>Total</span>
              <span className="tabular-nums">{formatINR(order.totalAmount)}</span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-wide text-ink-muted">
              Status: {order.status}
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-line px-6 py-4 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800"
          >
            Print Invoice
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-line bg-surface px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:bg-surface-elevated"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from "react"
import { DiscountType } from "@prisma/client"
import {
  createDiscountCode,
  toggleDiscountCode,
  type AdminDiscountCode,
} from "@/app/actions/admin"
import { formatINR } from "@/lib/money"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso))
}

export default function AdminMarketing({
  discountCodes: initialCodes,
}: {
  discountCodes: AdminDiscountCode[]
}) {
  const [codes, setCodes] = useState(initialCodes)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE" as DiscountType,
    value: "",
    minOrderAmount: "",
    maxUses: "",
    expiresAt: "",
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      try {
        await createDiscountCode({
          code: form.code,
          type: form.type,
          value: parseFloat(form.value),
          minOrderAmount: form.minOrderAmount
            ? parseFloat(form.minOrderAmount)
            : undefined,
          maxUses: form.maxUses ? parseInt(form.maxUses, 10) : undefined,
          expiresAt: form.expiresAt || undefined,
        })
        setShowForm(false)
        setForm({
          code: "",
          type: "PERCENTAGE",
          value: "",
          minOrderAmount: "",
          maxUses: "",
          expiresAt: "",
        })
        window.location.reload()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create discount code"
        )
      }
    })
  }

  const handleToggle = (id: string, isActive: boolean) => {
    setError("")
    startTransition(async () => {
      try {
        await toggleDiscountCode(id, isActive)
        setCodes((current) =>
          current.map((code) =>
            code.id === id ? { ...code, isActive } : code
          )
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update promotion"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
            Marketing & Promotions
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Discount codes, flash sales, and loyalty program settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800"
        >
          {showForm ? "Cancel" : "New Discount Code"}
        </button>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 grid grid-cols-1 gap-4 border border-line bg-surface p-6 sm:grid-cols-2"
        >
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Code
            </label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="SUMMER20"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm uppercase focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as DiscountType })
              }
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            >
              <option value="PERCENTAGE">Percentage off</option>
              <option value="FIXED">Fixed amount off</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Value {form.type === "PERCENTAGE" ? "(%)" : "(₹)"}
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Min. Order (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.minOrderAmount}
              onChange={(e) =>
                setForm({ ...form, minOrderAmount: e.target.value })
              }
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Max Uses
            </label>
            <input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Expires
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              Create Promotion
            </button>
          </div>
        </form>
      )}

      <div className="mb-8 border border-line bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
          Loyalty Program
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Enable loyalty points in System Settings to reward repeat customers
          with points on every purchase.
        </p>
      </div>

      <div className="overflow-x-auto border border-line bg-surface-elevated">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surface">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Code
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Discount
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Usage
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Expires
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {codes.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm text-ink-muted"
                >
                  No discount codes yet.
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr
                  key={code.id}
                  className="transition-colors hover:bg-surface/60"
                >
                  <td className="px-5 py-4 font-mono text-sm font-medium text-ink">
                    {code.code}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink">
                    {code.type === "PERCENTAGE"
                      ? `${code.value}% off`
                      : `${formatINR(code.value)} off`}
                    {code.minOrderAmount != null && (
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        Min. {formatINR(code.minOrderAmount)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums text-ink-muted">
                    {code.usedCount}
                    {code.maxUses != null ? ` / ${code.maxUses}` : ""}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {formatDate(code.expiresAt)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(code.id, !code.isActive)}
                      disabled={isPending}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 transition-colors disabled:opacity-50 ${
                        code.isActive
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : "bg-surface text-ink-muted ring-line"
                      }`}
                    >
                      {code.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

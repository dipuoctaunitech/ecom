"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bike } from "lucide-react"
import {
  createDeliveryBoy,
  type AdminDeliveryBoyRow,
} from "@/app/actions/admin"

export default function AdminDelivery({
  deliveryBoys: initialDeliveryBoys,
}: {
  deliveryBoys: AdminDeliveryBoyRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "" })

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        const result = await createDeliveryBoy(form)
        setForm({ name: "", email: "", password: "" })
        setSuccess(
          `${result.deliveryBoy.email} can sign in and open the delivery dashboard.`
        )
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create delivery account"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Delivery
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Create delivery accounts, then assign them to orders under Orders.
          They collect payment with the seller QR and mark it received.
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-10 border border-line bg-surface p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface-elevated text-ink">
            <Bike className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display text-lg font-medium text-ink">
              Add a delivery boy
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              They sign in with this email and password, then open /delivery.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Ravi Kumar"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Email
            </label>
            <input
              required
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="delivery@example.com"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Password
            </label>
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder="Min 8 characters, with uppercase, lowercase, and a number"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 border border-ink bg-ink px-6 py-2.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create delivery account"}
        </button>
      </form>

      <section>
        <h3 className="font-display text-lg font-medium text-ink">
          Delivery team
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {initialDeliveryBoys.length === 0
            ? "No delivery accounts yet."
            : `${initialDeliveryBoys.length} delivery account${
                initialDeliveryBoys.length === 1 ? "" : "s"
              }.`}
        </p>

        {initialDeliveryBoys.length > 0 && (
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Open runs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-elevated">
                {initialDeliveryBoys.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-surface/60"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-ink">
                      {row.name || "Unnamed"}
                    </td>
                    <td className="px-5 py-4 text-sm text-ink-muted">
                      {row.email}
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums text-ink">
                      {row.activeAssignments}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

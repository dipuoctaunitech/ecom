'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Store } from "lucide-react"
import {
  createSeller,
  updateUserRole,
  type AdminBuyerRow,
  type AdminSellerRow,
} from "@/app/actions/admin"

export default function AdminSellers({
  sellers: initialSellers,
  buyers: initialBuyers,
}: {
  sellers: AdminSellerRow[]
  buyers: AdminBuyerRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "" })

  const handleCreateSeller = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        const result = await createSeller(form)
        setForm({ name: "", email: "", password: "" })
        setSuccess(
          `${result.seller.email} can now sign in and open the seller dashboard.`
        )
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create seller")
      }
    })
  }

  const handleRoleChange = (
    userId: string,
    newRole: "BUYER" | "SELLER",
    label: string
  ) => {
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole)
        setSuccess(label)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update role")
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Sellers
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Create seller accounts so they can list products, set delivery, and
          add a payment QR.
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
        onSubmit={handleCreateSeller}
        className="mb-10 border border-line bg-surface p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface-elevated text-ink">
            <Store className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display text-lg font-medium text-ink">
              Add a seller
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              They sign in with this email and password. Share the credentials
              with them directly.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Shop / seller name
            </label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Atelier North"
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
              placeholder="seller@example.com"
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
          {isPending ? "Creating…" : "Create seller"}
        </button>
      </form>

      <section>
        <h3 className="font-display text-lg font-medium text-ink">
          Current sellers
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {initialSellers.length === 0
            ? "No sellers yet. Create one above."
            : `${initialSellers.length} seller${
                initialSellers.length === 1 ? "" : "s"
              } on the marketplace.`}
        </p>

        {initialSellers.length > 0 && (
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Seller
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Products
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Payment QR
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-elevated">
                {initialSellers.map((seller) => (
                  <tr key={seller.id} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-ink">
                        {seller.name || "Unnamed seller"}
                      </div>
                      <div className="mt-0.5 text-sm text-ink-muted">
                        {seller.email}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums text-ink">
                      {seller.productCount}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                          seller.hasQrCode
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {seller.hasQrCode ? "Ready" : "Missing"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleRoleChange(
                            seller.id,
                            "BUYER",
                            `${seller.email} is now a buyer.`
                          )
                        }
                        disabled={isPending}
                        className="border border-line bg-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Revoke seller
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {initialBuyers.length > 0 && (
        <section className="mt-10">
          <h3 className="font-display text-lg font-medium text-ink">
            Promote a buyer
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Turn an existing customer account into a seller without creating a
            new login.
          </p>
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-elevated">
                {initialBuyers.map((buyer) => (
                  <tr key={buyer.id} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-ink">
                        {buyer.name || "Unnamed"}
                      </div>
                      <div className="mt-0.5 text-sm text-ink-muted">
                        {buyer.email}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleRoleChange(
                            buyer.id,
                            "SELLER",
                            `${buyer.email} can now sign in as a seller.`
                          )
                        }
                        disabled={isPending}
                        className="border border-ink bg-ink px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Make seller
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

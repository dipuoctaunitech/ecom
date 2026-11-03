"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Scissors, Stethoscope } from "lucide-react"
import {
  createStoreStaff,
  setStoreStaffActive,
  type AdminStaffRow,
} from "@/app/actions/admin"
import type { StaffType } from "@prisma/client"

export default function AdminStaff({
  staff: initialStaff,
}: {
  staff: AdminStaffRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    title: "",
    type: "GROOMER" as StaffType,
  })

  const groomers = initialStaff.filter((row) => row.type === "GROOMER")
  const doctors = initialStaff.filter((row) => row.type === "DOCTOR")

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        const result = await createStoreStaff({
          name: form.name,
          email: form.email,
          password: form.password,
          type: form.type,
          title: form.title || undefined,
        })
        const portal =
          result.staff.type === "GROOMER" ? "/groomer" : "/doctor"
        setForm({
          name: "",
          email: "",
          password: "",
          title: "",
          type: form.type,
        })
        setSuccess(
          `${result.staff.email} can sign in and open ${portal}.`
        )
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create staff account"
        )
      }
    })
  }

  const handleToggleActive = (row: AdminStaffRow) => {
    setError("")
    setSuccess("")
    startTransition(async () => {
      try {
        await setStoreStaffActive(row.id, !row.isActive)
        setSuccess(
          `${row.name} is now ${!row.isActive ? "active" : "inactive"}.`
        )
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update staff status"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Groomers & clinic
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Create login accounts for groomers and doctors. They appear on the
          roster with weekday hours; adjust schedule under Roster.
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
            {form.type === "GROOMER" ? (
              <Scissors className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Stethoscope className="h-4 w-4" strokeWidth={1.75} />
            )}
          </div>
          <div>
            <h3 className="font-display text-lg font-medium text-ink">
              Add staff account
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Share the email and password so they can open their portal.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <span className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Role
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { value: "GROOMER", label: "Groomer" },
                  { value: "DOCTOR", label: "Clinic / doctor" },
                ] as const
              ).map((option) => {
                const selected = form.type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: option.value })}
                    className={`border px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
                      selected
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface-elevated text-ink-muted hover:border-ink/30 hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Full name
            </label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder={
                form.type === "GROOMER" ? "Mia Chen" : "Dr. Asha Raman"
              }
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Title
            </label>
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder={
                form.type === "GROOMER" ? "Senior Groomer" : "Veterinarian"
              }
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
              placeholder={
                form.type === "GROOMER"
                  ? "groomer@example.com"
                  : "doctor@example.com"
              }
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink"
            />
          </div>
          <div>
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
          {isPending
            ? "Creating…"
            : form.type === "GROOMER"
              ? "Create groomer"
              : "Create doctor"}
        </button>
      </form>

      <StaffTable
        title="Groomers"
        emptyLabel="No groomers yet. Create one above."
        rows={groomers}
        isPending={isPending}
        onToggleActive={handleToggleActive}
      />

      <div className="mt-10">
        <StaffTable
          title="Clinic / doctors"
          emptyLabel="No doctors yet. Create one above."
          rows={doctors}
          isPending={isPending}
          onToggleActive={handleToggleActive}
        />
      </div>
    </div>
  )
}

function StaffTable({
  title,
  emptyLabel,
  rows,
  isPending,
  onToggleActive,
}: {
  title: string
  emptyLabel: string
  rows: AdminStaffRow[]
  isPending: boolean
  onToggleActive: (row: AdminStaffRow) => void
}) {
  return (
    <section>
      <h3 className="font-display text-lg font-medium text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">
        {rows.length === 0
          ? emptyLabel
          : `${rows.length} ${rows.length === 1 ? "person" : "people"}.`}
      </p>

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Login
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface-elevated">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-surface/60"
                >
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-ink">
                      {row.name}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-muted">
                      {row.title || "—"}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {row.hasLogin ? row.email || "Linked" : "No login"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                        row.isActive
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => onToggleActive(row)}
                      disabled={isPending}
                      className="border border-line bg-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {row.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

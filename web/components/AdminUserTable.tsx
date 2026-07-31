'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSeller, updateUserRole } from '@/app/actions/admin'
import { Role } from '@prisma/client'

type User = {
  id: string
  name: string | null
  email: string | null
  role: Role
}

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-ink text-white ring-ink',
  SELLER: 'bg-violet-50 text-violet-800 ring-violet-200',
  BUYER: 'bg-surface text-ink-muted ring-line',
}

export default function AdminUserTable({ users }: { users: User[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showAddSeller, setShowAddSeller] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const handleRoleChange = (userId: string, newRole: Role) => {
    setError('')
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update role')
      }
    })
  }

  const handleCreateSeller = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await createSeller(form)
        setForm({ name: '', email: '', password: '' })
        setShowAddSeller(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create seller')
      }
    })
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddSeller((v) => !v)}
          className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800"
        >
          {showAddSeller ? 'Cancel' : 'Add Seller'}
        </button>
      </div>

      {showAddSeller && (
        <form
          onSubmit={handleCreateSeller}
          className="mb-6 grid grid-cols-1 gap-4 border border-line bg-surface p-4 sm:grid-cols-2"
        >
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Seller name"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Email
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seller@example.com"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Password
            </label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, upper, lower, and number"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              Create Seller Account
            </button>
          </div>
        </form>
      )}

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
                User
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Current Role
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-surface/60">
                <td className="px-5 py-4">
                  <div className="text-sm font-medium text-ink">
                    {user.name || 'No Name'}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-muted">{user.email}</div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${ROLE_STYLES[user.role]}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {user.role !== 'SELLER' && user.role !== 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleRoleChange(user.id, 'SELLER')}
                        disabled={isPending}
                        className="border border-ink bg-ink px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Make Seller
                      </button>
                    )}
                    {user.role === 'SELLER' && (
                      <button
                        type="button"
                        onClick={() => handleRoleChange(user.id, 'BUYER')}
                        disabled={isPending}
                        className="border border-line bg-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Revoke Seller
                      </button>
                    )}
                    {user.role === 'ADMIN' && (
                      <span className="text-xs text-ink-muted">Protected account</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

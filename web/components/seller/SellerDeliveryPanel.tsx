'use client'

import { useState, useTransition } from "react"
import {
  updateSellerDeliverySettings,
  type SellerDeliverySettings,
} from "@/app/actions/seller"

export default function SellerDeliveryPanel({
  initialSettings,
}: {
  initialSettings: SellerDeliverySettings
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaved(false)
    startTransition(async () => {
      try {
        await updateSellerDeliverySettings(settings)
        setSaved(true)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save delivery settings"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Delivery Options
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Configure how buyers receive orders from your store.
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Delivery settings saved.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-medium text-ink">
            Available Methods
          </h3>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={settings.standardDeliveryEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    standardDeliveryEnabled: e.target.checked,
                  })
                }
                className="h-4 w-4 border-line"
              />
              Standard delivery
            </label>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={settings.expressDeliveryEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    expressDeliveryEnabled: e.target.checked,
                  })
                }
                className="h-4 w-4 border-line"
              />
              Express delivery
            </label>
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={settings.pickupEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, pickupEnabled: e.target.checked })
                }
                className="h-4 w-4 border-line"
              />
              Local pickup
            </label>
          </div>
        </section>

        <section className="border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-medium text-ink">
            Rates & Timelines
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Standard Fee (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.standardDeliveryFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    standardDeliveryFee: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!settings.standardDeliveryEnabled}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Standard Days
              </label>
              <input
                type="number"
                min="1"
                value={settings.standardDeliveryDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    standardDeliveryDays: parseInt(e.target.value, 10) || 1,
                  })
                }
                disabled={!settings.standardDeliveryEnabled}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Express Fee (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.expressDeliveryFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    expressDeliveryFee: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!settings.expressDeliveryEnabled}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Express Days
              </label>
              <input
                type="number"
                min="1"
                value={settings.expressDeliveryDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    expressDeliveryDays: parseInt(e.target.value, 10) || 1,
                  })
                }
                disabled={!settings.expressDeliveryEnabled}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="border border-ink bg-ink px-6 py-2.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Delivery Options"}
        </button>
      </form>
    </div>
  )
}

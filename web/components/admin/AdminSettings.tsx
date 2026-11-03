'use client'

import { useState, useTransition } from "react"
import {
  updateStoreSettings,
  type StoreSettingsData,
} from "@/app/actions/admin"

export default function AdminSettings({
  initialSettings,
}: {
  initialSettings: StoreSettingsData
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
        await updateStoreSettings(settings)
        setSaved(true)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save settings"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          System Settings & Security
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Payment gateways, shipping, tax, and inventory alerts.
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Settings saved successfully.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mb-12 space-y-8">
        <section className="border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-medium text-ink">
            Payment Gateway
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Provider
              </label>
              <select
                value={settings.paymentGateway}
                onChange={(e) =>
                  setSettings({ ...settings, paymentGateway: e.target.value })
                }
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={settings.paymentEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      paymentEnabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 border-line"
                />
                Payments enabled
              </label>
            </div>
          </div>
        </section>

        <section className="border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-medium text-ink">
            Shipping & Tax
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Default Shipping Rate (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.defaultShippingRate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultShippingRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Free Shipping Threshold (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.freeShippingThreshold ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    freeShippingThreshold: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                placeholder="Optional"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Tax Rate (decimal)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={settings.taxRate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    taxRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-medium text-ink">
            Inventory & Loyalty
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                value={settings.lowStockAlertThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lowStockAlertThreshold: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={settings.loyaltyPointsEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      loyaltyPointsEnabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 border-line"
                />
                Loyalty points program enabled
              </label>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="border border-ink bg-ink px-6 py-2.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </div>
  )
}

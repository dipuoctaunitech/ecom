"use client"

import { useMemo, useState, useTransition } from "react"
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react"
import {
  addNewArrivalProduct,
  clearNewArrivalsCuration,
  removeNewArrivalProduct,
  reorderNewArrivals,
  syncNewArrivalsFromLatest,
  type NewArrivalManagedItem,
  type NewArrivalProductOption,
} from "@/app/actions/store-new-arrivals"
import { formatMoney } from "@/lib/money"

export default function StoreNewArrivalsPanel({
  initialItems,
  productOptions: initialOptions,
  limit,
}: {
  initialItems: NewArrivalManagedItem[]
  productOptions: NewArrivalProductOption[]
  limit: number
}) {
  const [items, setItems] = useState(
    [...initialItems].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const [options, setOptions] = useState(initialOptions)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  const availableOptions = useMemo(
    () => options.filter((option) => !option.alreadyListed),
    [options]
  )

  const isCurated = items.length > 0

  function markOptionListed(productId: string, listed: boolean) {
    setOptions((current) =>
      current.map((option) =>
        option.id === productId
          ? { ...option, alreadyListed: listed }
          : option
      )
    )
  }

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProductId) return

    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        const result = await addNewArrivalProduct(selectedProductId)
        setItems((current) => [...current, result.item])
        markOptionListed(selectedProductId, true)
        setSelectedProductId("")
        setSaved("Product added to New Arrivals.")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add product")
      }
    })
  }

  function handleRemove(productId: string) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await removeNewArrivalProduct(productId)
        const next = items
          .filter((item) => item.productId !== productId)
          .map((item, index) => ({ ...item, sortOrder: index }))
        setItems(next)
        markOptionListed(productId, false)
        setSaved(
          next.length === 0
            ? "Shelf cleared — shop will show the latest 15 products automatically."
            : "Product removed from New Arrivals."
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove product"
        )
      }
    })
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return

    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    const ordered = next.map((entry, sortOrder) => ({ ...entry, sortOrder }))

    setItems(ordered)
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await reorderNewArrivals(ordered.map((entry) => entry.productId))
        setSaved("Display order updated.")
      } catch (err) {
        setItems(items)
        setError(err instanceof Error ? err.message : "Failed to update order")
      }
    })
  }

  function handleSyncFromLatest() {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        const result = await syncNewArrivalsFromLatest()
        setItems(result.items)
        const listedIds = new Set(result.items.map((item) => item.productId))
        setOptions((current) =>
          current.map((option) => ({
            ...option,
            alreadyListed: listedIds.has(option.id),
          }))
        )
        setSaved(`Filled New Arrivals with the latest ${result.items.length} products.`)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to sync from latest"
        )
      }
    })
  }

  function handleClearCuration() {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await clearNewArrivalsCuration()
        setItems([])
        setOptions((current) =>
          current.map((option) => ({ ...option, alreadyListed: false }))
        )
        setSaved("Curation cleared. Shop shows the latest 15 products automatically.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to clear curation"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          New Arrivals
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          By default the shop shows the last {limit} products added. Curate the
          shelf to pin specific items and set their order (max {limit}).
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
          Mode:{" "}
          <span className="text-ink">
            {isCurated ? "Curated" : `Automatic (latest ${limit})`}
          </span>
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {saved}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSyncFromLatest}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Fill from latest {limit}
        </button>
        {isCurated && (
          <button
            type="button"
            onClick={handleClearCuration}
            disabled={isPending}
            className="inline-flex items-center gap-2 border border-line bg-surface px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            Use automatic latest
          </button>
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-8 flex flex-col gap-3 border border-line bg-surface p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Add product
          </label>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            disabled={isPending || items.length >= limit}
            className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
          >
            <option value="">Select a product…</option>
            {availableOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={
            isPending || !selectedProductId || items.length >= limit
          }
          className="inline-flex items-center justify-center gap-2 border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          Add
        </button>
      </form>

      {!isCurated ? (
        <p className="border border-line bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          No curated list yet. The Pet Items page shows the {limit} newest
          products automatically. Add items above or fill from latest to take
          control.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-4 border border-line bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`Move ${item.title} up`}
                  onClick={() => moveItem(index, -1)}
                  disabled={isPending || index === 0}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.title} down`}
                  onClick={() => moveItem(index, 1)}
                  disabled={isPending || index === items.length - 1}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>

              <span className="w-6 text-center text-xs font-medium text-ink-muted">
                {index + 1}
              </span>

              <div className="h-16 w-16 shrink-0 overflow-hidden border border-line bg-surface-elevated">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatMoney(item.price)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(item.productId)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

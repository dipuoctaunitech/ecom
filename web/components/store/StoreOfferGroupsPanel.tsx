"use client"

import { useState, useTransition } from "react"
import {
  ArrowDown,
  ArrowUp,
  Percent,
  Plus,
  Trash2,
} from "lucide-react"
import {
  createStoreOfferGroup,
  deleteStoreOfferGroup,
  reorderStoreOfferGroups,
  type StoreOfferGroup,
} from "@/app/actions/store-offer-groups"

export default function StoreOfferGroupsPanel({
  initialGroups,
}: {
  initialGroups: StoreOfferGroup[]
}) {
  const [groups, setGroups] = useState(
    [...initialGroups].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [minPercent, setMinPercent] = useState("21")
  const [maxPercent, setMaxPercent] = useState("25")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const min = Number.parseInt(minPercent, 10)
    const max = Number.parseInt(maxPercent, 10)
    if (!title.trim() || !description.trim()) return

    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        const result = await createStoreOfferGroup({
          title,
          description,
          minPercent: min,
          maxPercent: max,
        })
        setGroups((current) => [...current, result.group])
        setTitle("")
        setDescription("")
        setSaved("Offer group created. It appears on Pet Items → Offers.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create offer group"
        )
      }
    })
  }

  function handleDelete(groupId: string) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await deleteStoreOfferGroup(groupId)
        const next = groups
          .filter((group) => group.id !== groupId)
          .map((group, index) => ({ ...group, sortOrder: index }))
        setGroups(next)
        setSaved("Offer group removed.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete offer group"
        )
      }
    })
  }

  function moveGroup(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= groups.length) return

    const next = [...groups]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    const ordered = next.map((group, sortOrder) => ({ ...group, sortOrder }))

    setGroups(ordered)
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await reorderStoreOfferGroups(ordered.map((group) => group.id))
        setSaved("Display order updated.")
      } catch (err) {
        setGroups(groups)
        setError(
          err instanceof Error ? err.message : "Failed to update order"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Offer groups
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Create discount bands by percent off (for example 21–25%). Each group
          needs a title and description shown on the Offers shelf.
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

      <form
        onSubmit={handleCreate}
        className="mb-8 border border-line bg-surface p-6"
      >
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-ink" strokeWidth={1.75} />
          <h3 className="font-display text-lg font-medium text-ink">
            New offer group
          </h3>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder="e.g. Midweek treat"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Min %
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={minPercent}
                onChange={(event) => setMinPercent(event.target.value)}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Max %
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxPercent}
                onChange={(event) => setMaxPercent(event.target.value)}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Description
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Short line shoppers see under the title…"
            className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={
            isPending || !title.trim() || !description.trim() || !minPercent || !maxPercent
          }
          className="mt-5 inline-flex items-center gap-2 border border-ink bg-ink px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          {isPending ? "Saving…" : "Create group"}
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="border border-line bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          No offer groups yet. Create bands like 10–20% and 21–25% off.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((group, index) => (
            <li
              key={group.id}
              className="flex items-start gap-4 border border-line bg-surface p-4"
            >
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  aria-label={`Move ${group.title} up`}
                  onClick={() => moveGroup(index, -1)}
                  disabled={isPending || index === 0}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${group.title} down`}
                  onClick={() => moveGroup(index, 1)}
                  disabled={isPending || index === groups.length - 1}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>

              <span className="w-6 pt-2 text-center text-xs font-medium text-ink-muted">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-display text-lg font-medium text-ink">
                    {group.title}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-highlight">
                    {group.minPercent}–{group.maxPercent}% off
                  </p>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{group.description}</p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(group.id)}
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

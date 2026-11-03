"use client"

import { useMemo, useState, useTransition } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react"
import {
  createBookableService,
  deleteBookableService,
  reorderBookableServices,
  setBookableServiceActive,
  updateBookableService,
  type ManagedService,
  type ServiceInput,
} from "@/app/actions/store-services"
import { formatMoney } from "@/lib/money"
import {
  loyaltyPointsFromPercent,
  loyaltyPointsPercentOfPrice,
} from "@/lib/product-meta"
import { uploadFile } from "@/lib/upload-client"
import type { ServiceVertical } from "@prisma/client"

type Draft = {
  name: string
  description: string
  durationMins: string
  price: string
  compareAtPrice: string
  loyaltyPoints: string
  loyaltyPercent: string
  imageUrl: string
  isCombo: boolean
  isActive: boolean
  includedServiceIds: string[]
}

function emptyDraft(): Draft {
  return {
    name: "",
    description: "",
    durationMins: "45",
    price: "",
    compareAtPrice: "",
    loyaltyPoints: "0",
    loyaltyPercent: "5",
    imageUrl: "",
    isCombo: false,
    isActive: true,
    includedServiceIds: [],
  }
}

function fromService(service: ManagedService): Draft {
  const pct = loyaltyPointsPercentOfPrice(service.loyaltyPoints, service.price)
  return {
    name: service.name,
    description: service.description,
    durationMins: String(service.durationMins),
    price: String(service.price),
    compareAtPrice:
      service.compareAtPrice != null ? String(service.compareAtPrice) : "",
    loyaltyPoints: String(service.loyaltyPoints),
    loyaltyPercent: pct != null ? String(pct) : "",
    imageUrl: service.imageUrl ?? "",
    isCombo: service.isCombo,
    isActive: service.isActive,
    includedServiceIds: [...service.includedServiceIds],
  }
}

function toInput(draft: Draft, vertical: ServiceVertical): ServiceInput {
  const price = Number(draft.price)
  const compareRaw = draft.compareAtPrice.trim()
  const compareAtPrice =
    compareRaw === "" ? null : Number(compareRaw)

  return {
    vertical,
    name: draft.name,
    description: draft.description,
    durationMins: Number(draft.durationMins),
    price,
    compareAtPrice,
    loyaltyPoints: Math.round(Number(draft.loyaltyPoints) || 0),
    imageUrl: draft.imageUrl.trim() || null,
    isCombo: draft.isCombo,
    isActive: draft.isActive,
    includedServiceIds: draft.isCombo ? draft.includedServiceIds : [],
  }
}

export default function StoreServicesPanel({
  initialServices,
  defaultVertical = "GROOMING",
}: {
  initialServices: ManagedService[]
  defaultVertical?: ServiceVertical
}) {
  const [services, setServices] = useState(initialServices)
  const [vertical, setVertical] = useState<ServiceVertical>(defaultVertical)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  const visible = useMemo(
    () =>
      services
        .filter((service) => service.vertical === vertical)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [services, vertical]
  )

  const baseOptions = useMemo(
    () =>
      visible.filter(
        (service) =>
          !service.isCombo &&
          service.isActive &&
          service.id !== editingId
      ),
    [visible, editingId]
  )

  function resetForm() {
    setCreating(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  function startCreate() {
    setCreating(true)
    setEditingId(null)
    setDraft(emptyDraft())
    setError("")
    setSaved("")
  }

  function startEdit(service: ManagedService) {
    setCreating(false)
    setEditingId(service.id)
    setDraft(fromService(service))
    setError("")
    setSaved("")
  }

  async function handleImagePick(file: File | null) {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const publicUrl = await uploadFile({ file, purpose: "service" })
      setDraft((current) => ({ ...current, imageUrl: publicUrl }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function save() {
    setError("")
    setSaved("")
    const input = toInput(draft, vertical)

    startTransition(async () => {
      try {
        if (editingId) {
          const result = await updateBookableService(editingId, input)
          setServices((current) =>
            current.map((row) =>
              row.id === editingId ? result.service : row
            )
          )
          setSaved("Service updated.")
        } else {
          const result = await createBookableService(input)
          setServices((current) => [...current, result.service])
          setSaved("Service created.")
        }
        resetForm()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed")
      }
    })
  }

  function toggleActive(service: ManagedService) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await setBookableServiceActive(service.id, !service.isActive)
        setServices((current) =>
          current.map((row) =>
            row.id === service.id
              ? { ...row, isActive: !service.isActive }
              : row
          )
        )
        setSaved(
          service.isActive ? "Service deactivated." : "Service activated."
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed")
      }
    })
  }

  function remove(service: ManagedService) {
    if (
      !window.confirm(
        `Remove “${service.name}”? Services with bookings are deactivated instead.`
      )
    ) {
      return
    }
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await deleteBookableService(service.id)
        setServices((current) =>
          current.filter((row) => row.id !== service.id)
        )
        if (editingId === service.id) resetForm()
        setSaved("Service removed.")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed"
        setError(message)
        if (message.includes("deactivated")) {
          setServices((current) =>
            current.map((row) =>
              row.id === service.id ? { ...row, isActive: false } : row
            )
          )
        }
      }
    })
  }

  function move(serviceId: string, direction: -1 | 1) {
    const ids = visible.map((row) => row.id)
    const index = ids.indexOf(serviceId)
    const swapWith = index + direction
    if (index < 0 || swapWith < 0 || swapWith >= ids.length) return

    const next = [...ids]
    ;[next[index], next[swapWith]] = [next[swapWith], next[index]]

    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await reorderBookableServices(vertical, next)
        setServices((current) =>
          current.map((row) => {
            if (row.vertical !== vertical) return row
            const sortOrder = next.indexOf(row.id) + 1
            return sortOrder > 0 ? { ...row, sortOrder } : row
          })
        )
        setSaved("Order updated.")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reorder failed")
      }
    })
  }

  function toggleIncluded(serviceId: string) {
    setDraft((current) => {
      const has = current.includedServiceIds.includes(serviceId)
      return {
        ...current,
        includedServiceIds: has
          ? current.includedServiceIds.filter((id) => id !== serviceId)
          : [...current.includedServiceIds, serviceId],
      }
    })
  }

  const showForm = creating || editingId !== null

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            Store ops
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
            Bookable services
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Set names, prices, offer pricing, photos, and combos for grooming
            and clinic. Customers see these on the booking pages.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={isPending || creating}
          className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add service
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "GROOMING", label: "Grooming" },
            { id: "CLINIC", label: "Clinic" },
          ] as const
        ).map((item) => {
          const active = vertical === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setVertical(item.id)
                resetForm()
              }}
              className={`border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-muted hover:border-ink/30 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {(error || saved) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || saved}
        </div>
      )}

      {showForm && (
        <form
          className="space-y-5 border border-line bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <h3 className="font-display text-lg font-medium text-ink">
            {editingId ? "Edit service" : "New service"}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-ink">Name</span>
              <input
                required
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-ink">Description</span>
              <textarea
                required
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">Duration (minutes)</span>
              <input
                required
                type="number"
                min={10}
                max={480}
                value={draft.durationMins}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    durationMins: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">Price (INR)</span>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={draft.price}
                onChange={(event) => {
                  const price = event.target.value
                  const priceNumber = Number(price)
                  setDraft((current) => {
                    if (
                      current.loyaltyPercent.trim() &&
                      Number.isFinite(priceNumber)
                    ) {
                      return {
                        ...current,
                        price,
                        loyaltyPoints: String(
                          loyaltyPointsFromPercent(
                            Number(current.loyaltyPercent) || 0,
                            priceNumber
                          )
                        ),
                      }
                    }
                    return { ...current, price }
                  })
                }}
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">
                Compare-at / original (offer)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.compareAtPrice}
                placeholder="Optional — higher than price"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    compareAtPrice: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">Loyalty points</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.loyaltyPoints}
                onChange={(event) => {
                  const points = event.target.value
                  const price = Number(draft.price)
                  const pct = loyaltyPointsPercentOfPrice(
                    Math.round(Number(points) || 0),
                    price
                  )
                  setDraft((current) => ({
                    ...current,
                    loyaltyPoints: points,
                    loyaltyPercent: pct != null ? String(pct) : current.loyaltyPercent,
                  }))
                }}
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">
                Loyalty as % of price
              </span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={draft.loyaltyPercent}
                placeholder="e.g. 5"
                onChange={(event) => {
                  const percent = event.target.value
                  const price = Number(draft.price)
                  const points = loyaltyPointsFromPercent(
                    Number(percent) || 0,
                    Number.isFinite(price) ? price : 0
                  )
                  setDraft((current) => ({
                    ...current,
                    loyaltyPercent: percent,
                    loyaltyPoints: String(points),
                  }))
                }}
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <div className="text-sm">
              <span className="font-medium text-ink">Service image</span>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 border border-line bg-surface-elevated px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink-muted hover:border-ink/30 hover:text-ink">
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {uploading ? "Uploading…" : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading || isPending}
                    onChange={(event) =>
                      handleImagePick(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
                {draft.imageUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({ ...current, imageUrl: "" }))
                    }
                    className="text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    Remove image
                  </button>
                ) : null}
              </div>
              {draft.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.imageUrl}
                  alt=""
                  className="mt-3 h-28 w-40 border border-line object-cover"
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={draft.isCombo}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isCombo: event.target.checked,
                    includedServiceIds: event.target.checked
                      ? current.includedServiceIds
                      : [],
                  }))
                }
              />
              This is a combo / package
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active (visible to customers)
            </label>
          </div>

          {draft.isCombo && (
            <div>
              <p className="text-sm font-medium text-ink">
                Included services (pick at least two)
              </p>
              {baseOptions.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">
                  Add base services first, then build a combo from them.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {baseOptions.map((service) => {
                    const checked = draft.includedServiceIds.includes(
                      service.id
                    )
                    return (
                      <li key={service.id}>
                        <label className="flex cursor-pointer items-start gap-3 border border-line px-3 py-3 text-sm hover:border-ink/30">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleIncluded(service.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium text-ink">
                              {service.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-ink-muted">
                              {formatMoney(service.price)} ·{" "}
                              {service.durationMins} min
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending || uploading}
              className="border border-ink bg-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : editingId ? "Save changes" : "Create"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isPending}
              className="border border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-muted hover:border-ink/30 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No {vertical === "GROOMING" ? "grooming" : "clinic"} services yet.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {visible.map((service, index) => {
            const onOffer =
              service.compareAtPrice != null &&
              service.compareAtPrice > service.price
            return (
              <li
                key={service.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  {service.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.imageUrl}
                      alt=""
                      className="h-20 w-24 shrink-0 border border-line object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-24 shrink-0 items-center justify-center border border-dashed border-line text-[10px] uppercase tracking-wide text-ink-muted">
                      No image
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-medium text-ink">
                        {service.name}
                      </h3>
                      {service.isCombo ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-highlight">
                          Combo
                        </span>
                      ) : null}
                      {!service.isActive ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                          Inactive
                        </span>
                      ) : null}
                      {onOffer ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-meadow">
                          Offer
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                      {service.description}
                    </p>
                    <p className="mt-2 text-sm text-ink">
                      {onOffer ? (
                        <>
                          <span className="font-semibold tabular-nums">
                            {formatMoney(service.price)}
                          </span>{" "}
                          <span className="text-ink-muted line-through tabular-nums">
                            {formatMoney(service.compareAtPrice!)}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold tabular-nums">
                          {formatMoney(service.price)}
                        </span>
                      )}
                      <span className="text-ink-muted">
                        {" "}
                        · {service.durationMins} min
                        {service.loyaltyPoints > 0
                          ? ` · ${service.loyaltyPoints} pts`
                          : ""}
                      </span>
                    </p>
                    {service.isCombo &&
                    service.includedServiceNames.length > 0 ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        Includes {service.includedServiceNames.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={isPending || index === 0}
                    onClick={() => move(service.id, -1)}
                    className="border border-line p-2 text-ink-muted hover:text-ink disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    disabled={isPending || index === visible.length - 1}
                    onClick={() => move(service.id, 1)}
                    className="border border-line p-2 text-ink-muted hover:text-ink disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startEdit(service)}
                    className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:border-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleActive(service)}
                    className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted hover:border-ink/30 hover:text-ink"
                  >
                    {service.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => remove(service)}
                    className="border border-line p-2 text-ink-muted hover:border-red-300 hover:text-red-700"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

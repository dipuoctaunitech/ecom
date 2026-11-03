"use client"

import { useState, useTransition } from "react"
import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  ImagePlus,
  Trash2,
  Upload,
} from "lucide-react"
import {
  createStoreCategory,
  deleteStoreCategory,
  reorderStoreCategories,
  type StoreCategory,
} from "@/app/actions/store-categories"
import { uploadFile } from "@/lib/upload-client"

export default function StoreCategoriesPanel({
  initialCategories,
}: {
  initialCategories: StoreCategory[]
}) {
  const [categories, setCategories] = useState(
    [...initialCategories].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const [name, setName] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  const busy = isUploading || isPending

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError("")
    setSaved("")
    setIsUploading(true)

    try {
      const publicUrl = await uploadFile({
        file,
        purpose: "category",
        categoryScope: "store",
      })
      setImageUrl(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !imageUrl) return

    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        const result = await createStoreCategory({ name, image: imageUrl })
        setCategories((current) => [...current, result.category])
        setName("")
        setImageUrl("")
        setSaved("Category added. It appears on Pet Items → Shop by Category.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create category"
        )
      }
    })
  }

  function handleDelete(categoryId: string) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await deleteStoreCategory(categoryId)
        const next = categories.filter((category) => category.id !== categoryId)
        setCategories(next.map((category, index) => ({ ...category, sortOrder: index })))
        if (next.length > 0) {
          await reorderStoreCategories(next.map((category) => category.id))
        }
        setSaved("Category removed from the shop.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete category"
        )
      }
    })
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return

    const next = [...categories]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    const ordered = next.map((category, sortOrder) => ({
      ...category,
      sortOrder,
    }))

    setCategories(ordered)
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await reorderStoreCategories(ordered.map((category) => category.id))
        setSaved("Display order updated.")
      } catch (err) {
        setCategories(categories)
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
          Shop categories
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Control the Pet Items “Shop by Category” tiles — name, cover image,
          and display order.
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
          <FolderPlus className="h-4 w-4 text-ink" strokeWidth={1.75} />
          <h3 className="font-display text-lg font-medium text-ink">
            New category
          </h3>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[160px_1fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Cover image
            </p>
            {imageUrl ? (
              <div className="mt-2">
                <div className="relative h-36 w-36 overflow-hidden border border-line bg-surface-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted transition-colors hover:text-ink">
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Replace
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={busy}
                    onChange={handleUpload}
                  />
                </label>
              </div>
            ) : (
              <label className="mt-2 flex h-36 w-36 cursor-pointer flex-col items-center justify-center border border-dashed border-line bg-surface-elevated text-center transition-colors hover:border-ink/40">
                <ImagePlus
                  className="h-6 w-6 text-ink-muted"
                  strokeWidth={1.5}
                />
                <span className="mt-2 px-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  {isUploading ? "Uploading…" : "Upload"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={busy}
                  onChange={handleUpload}
                />
              </label>
            )}
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Category name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                placeholder="e.g. Dogs"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
              <p className="mt-2 text-xs text-ink-muted">
                New categories appear at the end of Shop by Category. Use the
                arrows to change order.
              </p>
            </div>
            <button
              type="submit"
              disabled={busy || !name.trim() || !imageUrl}
              className="w-fit border border-ink bg-ink px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Create category"}
            </button>
          </div>
        </div>
      </form>

      {categories.length === 0 ? (
        <p className="border border-line bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          No shop categories yet. Add one above to populate Pet Items.
        </p>
      ) : (
        <ul className="space-y-3">
          {categories.map((category, index) => (
            <li
              key={category.id}
              className="flex items-center gap-4 border border-line bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`Move ${category.name} up`}
                  onClick={() => moveCategory(index, -1)}
                  disabled={busy || index === 0}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${category.name} down`}
                  onClick={() => moveCategory(index, 1)}
                  disabled={busy || index === categories.length - 1}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>

              <span className="w-6 text-center text-xs font-medium text-ink-muted">
                {index + 1}
              </span>

              <div className="h-16 w-16 shrink-0 overflow-hidden border border-line bg-surface-elevated">
                {category.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{category.name}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {category.productCount} product
                  {category.productCount === 1 ? "" : "s"} · /{category.slug}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(category.id)}
                disabled={busy}
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

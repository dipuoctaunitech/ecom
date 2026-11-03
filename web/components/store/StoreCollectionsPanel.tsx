"use client"

import { useState, useTransition } from "react"
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  LayoutGrid,
  Trash2,
  Upload,
} from "lucide-react"
import {
  createStoreCollection,
  deleteStoreCollection,
  reorderStoreCollections,
  type StoreCollection,
  type StoreCollectionCategoryOption,
} from "@/app/actions/store-collections"
import { uploadFile } from "@/lib/upload-client"

export default function StoreCollectionsPanel({
  initialCollections,
  categoryOptions,
}: {
  initialCollections: StoreCollection[]
  categoryOptions: StoreCollectionCategoryOption[]
}) {
  const [collections, setCollections] = useState(
    [...initialCollections].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [categoryId, setCategoryId] = useState("")
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
    if (!name.trim() || !tag.trim() || !imageUrl) return

    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        const result = await createStoreCollection({
          name,
          tag,
          image: imageUrl,
          categoryId: categoryId || null,
        })
        setCollections((current) => [...current, result.collection])
        setName("")
        setTag("")
        setCategoryId("")
        setImageUrl("")
        setSaved("Collection added to Pet Collections on Pet Items.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create collection"
        )
      }
    })
  }

  function handleDelete(collectionId: string) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await deleteStoreCollection(collectionId)
        const next = collections.filter(
          (collection) => collection.id !== collectionId
        )
        setCollections(
          next.map((collection, index) => ({ ...collection, sortOrder: index }))
        )
        if (next.length > 0) {
          await reorderStoreCollections(next.map((collection) => collection.id))
        }
        setSaved("Collection removed.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete collection"
        )
      }
    })
  }

  function moveCollection(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= collections.length) return

    const next = [...collections]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    const ordered = next.map((collection, sortOrder) => ({
      ...collection,
      sortOrder,
    }))

    setCollections(ordered)
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await reorderStoreCollections(ordered.map((collection) => collection.id))
        setSaved("Display order updated.")
      } catch (err) {
        setCollections(collections)
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
          Pet collections
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Group the Pet Items page by pet — create tiles, link a shop category
          for filtering, and set the display order.
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
          <LayoutGrid className="h-4 w-4 text-ink" strokeWidth={1.75} />
          <h3 className="font-display text-lg font-medium text-ink">
            New collection
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

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Collection name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={60}
                  placeholder="e.g. Dogs"
                  className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Tag line
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. Tail wags"
                  className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Linked shop category
              </label>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              >
                <option value="">None (uses collection name)</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-ink-muted">
                When shoppers tap this tile, products filter by the linked
                category.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy || !name.trim() || !tag.trim() || !imageUrl}
              className="w-fit border border-ink bg-ink px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Create collection"}
            </button>
          </div>
        </div>
      </form>

      {collections.length === 0 ? (
        <p className="border border-line bg-surface px-4 py-10 text-center text-sm text-ink-muted">
          No pet collections yet. Add Dogs, Cats, and other pet groups above.
        </p>
      ) : (
        <ul className="space-y-3">
          {collections.map((collection, index) => (
            <li
              key={collection.id}
              className="flex items-center gap-4 border border-line bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`Move ${collection.name} up`}
                  onClick={() => moveCollection(index, -1)}
                  disabled={busy || index === 0}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${collection.name} down`}
                  onClick={() => moveCollection(index, 1)}
                  disabled={busy || index === collections.length - 1}
                  className="border border-line p-1.5 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>

              <span className="w-6 text-center text-xs font-medium text-ink-muted">
                {index + 1}
              </span>

              <div className="h-16 w-16 shrink-0 overflow-hidden border border-line bg-surface-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={collection.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{collection.name}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {collection.tag}
                  {collection.categoryName
                    ? ` · filters “${collection.categoryName}”`
                    : " · no linked category"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(collection.id)}
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

'use client'

import { Fragment, useState, useTransition } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ExternalLink,
  MapPin,
  Percent,
  Tag,
  X,
} from "lucide-react"
import { updateSellerProduct, type SellerProduct } from "@/app/actions/seller"
import { resolveProductImageUrl } from "@/lib/images"

function stockStatus(stock: number): {
  label: string
  className: string
} {
  if (stock <= 0) {
    return {
      label: "Out of stock",
      className: "bg-red-50 text-red-800 ring-red-200",
    }
  }
  if (stock <= 5) {
    return {
      label: "Low stock",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
    }
  }
  return {
    label: "In stock",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  }
}

function formatListedDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

type LocationDraft = {
  locationName: string
  locationAddress: string
  locationCity: string
  locationCountry: string
}

type DiscountDraft = {
  mode: "percentage" | "fixed"
  value: string
}

function locationDraft(product: SellerProduct): LocationDraft {
  return {
    locationName: product.locationName ?? "",
    locationAddress: product.locationAddress ?? "",
    locationCity: product.locationCity ?? "",
    locationCountry: product.locationCountry ?? "",
  }
}

function formatLocation(product: SellerProduct) {
  const parts = [
    product.locationName,
    product.locationAddress,
    product.locationCity,
    product.locationCountry,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "No location set"
}

function computeDiscountPercent(product: SellerProduct): number | null {
  if (
    product.compareAtPrice == null ||
    product.compareAtPrice <= product.price
  )
    return null
  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
  )
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

export default function SellerProductList({
  initialProducts,
}: {
  initialProducts: SellerProduct[]
}) {
  const [products, setProducts] = useState(initialProducts)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedType, setExpandedType] = useState<"location" | "discount">(
    "location"
  )
  const [locationDrafts, setLocationDrafts] = useState<
    Record<string, LocationDraft>
  >({})
  const [discountDrafts, setDiscountDrafts] = useState<
    Record<string, DiscountDraft>
  >({})
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const handlePriceStockBlur = (
    productId: string,
    field: "price" | "stock",
    value: string
  ) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const trimmed = value.trim()
    const parsed =
      field === "price" ? parseFloat(trimmed) : parseInt(trimmed, 10)
    if (Number.isNaN(parsed)) return
    if (product[field] === parsed) return

    setError("")
    startTransition(async () => {
      try {
        await updateSellerProduct(productId, { [field]: parsed })
        setProducts((current) =>
          current.map((p) =>
            p.id === productId ? { ...p, [field]: parsed } : p
          )
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update product"
        )
      }
    })
  }

  const toggleLocation = (product: SellerProduct) => {
    if (expandedId === product.id && expandedType === "location") {
      setExpandedId(null)
      return
    }
    setExpandedId(product.id)
    setExpandedType("location")
    setLocationDrafts((current) => ({
      ...current,
      [product.id]: locationDraft(product),
    }))
  }

  const toggleDiscount = (product: SellerProduct) => {
    if (expandedId === product.id && expandedType === "discount") {
      setExpandedId(null)
      return
    }
    setExpandedId(product.id)
    setExpandedType("discount")
    const existing = computeDiscountPercent(product)
    setDiscountDrafts((current) => ({
      ...current,
      [product.id]: {
        mode: "percentage",
        value: existing != null ? String(existing) : "",
      },
    }))
  }

  const saveDiscount = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    const draft = discountDrafts[productId]
    if (!product || !draft) return

    const val = draft.value.trim()

    let compareAtPrice: number | null = null

    if (val && parseFloat(val) > 0) {
      const num = parseFloat(val)
      if (draft.mode === "percentage") {
        if (num >= 100) {
          setError("Discount percentage must be less than 100%.")
          return
        }
        compareAtPrice =
          Math.round((product.price / (1 - num / 100)) * 100) / 100
      } else {
        compareAtPrice =
          Math.round((product.price + num) * 100) / 100
      }
    }

    setError("")
    startTransition(async () => {
      try {
        await updateSellerProduct(productId, { compareAtPrice })
        setProducts((current) =>
          current.map((p) =>
            p.id === productId ? { ...p, compareAtPrice } : p
          )
        )
        setExpandedId(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update discount"
        )
      }
    })
  }

  const removeDiscount = (productId: string) => {
    setError("")
    startTransition(async () => {
      try {
        await updateSellerProduct(productId, { compareAtPrice: null })
        setProducts((current) =>
          current.map((p) =>
            p.id === productId ? { ...p, compareAtPrice: null } : p
          )
        )
        setExpandedId(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove discount"
        )
      }
    })
  }

  const saveLocation = (productId: string) => {
    const draft = locationDrafts[productId]
    if (!draft) return

    setError("")
    startTransition(async () => {
      try {
        const payload = {
          locationName: draft.locationName.trim() || null,
          locationAddress: draft.locationAddress.trim() || null,
          locationCity: draft.locationCity.trim() || null,
          locationCountry: draft.locationCountry.trim() || null,
        }
        await updateSellerProduct(productId, payload)
        setProducts((current) =>
          current.map((p) =>
            p.id === productId ? { ...p, ...payload } : p
          )
        )
        setExpandedId(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save location"
        )
      }
    })
  }

  const totalSold = products.reduce((sum, p) => sum + p.unitsSold, 0)
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0)
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length
  const outOfStockCount = products.filter((p) => p.stock <= 0).length

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Track My Products
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Monitor listings, sales, stock, and storefront performance for every
          product you have listed.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border border-line bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Listings
          </p>
          <p className="mt-1 font-display text-xl font-medium tabular-nums text-ink">
            {products.length}
          </p>
        </div>
        <div className="border border-line bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Units sold
          </p>
          <p className="mt-1 font-display text-xl font-medium tabular-nums text-ink">
            {totalSold}
          </p>
        </div>
        <div className="border border-line bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Revenue
          </p>
          <p className="mt-1 font-display text-xl font-medium tabular-nums text-ink">
            ${totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="border border-line bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Stock alerts
          </p>
          <p className="mt-1 font-display text-xl font-medium tabular-nums text-ink">
            {lowStockCount + outOfStockCount}
          </p>
          {(lowStockCount > 0 || outOfStockCount > 0) && (
            <p className="mt-1 text-xs text-ink-muted">
              {outOfStockCount > 0 && `${outOfStockCount} out`}
              {outOfStockCount > 0 && lowStockCount > 0 && " · "}
              {lowStockCount > 0 && `${lowStockCount} low`}
            </p>
          )}
        </div>
      </div>

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
                Product
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Price ($)
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Discount
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Stock
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Sold
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Revenue
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Location
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                View
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-16 text-center text-sm text-ink-muted"
                >
                  No products listed yet. Add your first product to get started.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const discountPct = computeDiscountPercent(product)
                const status = stockStatus(product.stock)
                const isDiscountExpanded =
                  expandedId === product.id && expandedType === "discount"
                const isLocationExpanded =
                  expandedId === product.id && expandedType === "location"
                const previewUrl =
                  product.images.find((url) => !isVideoUrl(url)) ??
                  product.images[0] ??
                  ""
                const previewIsVideo = previewUrl ? isVideoUrl(previewUrl) : false

                return (
                  <Fragment key={product.id}>
                    <tr className="transition-colors hover:bg-surface/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {previewUrl ? (
                            previewIsVideo ? (
                              <video
                                src={resolveProductImageUrl(previewUrl)}
                                muted
                                playsInline
                                preload="metadata"
                                className="h-12 w-12 shrink-0 border border-line object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resolveProductImageUrl(previewUrl)}
                                alt=""
                                className="h-12 w-12 shrink-0 border border-line object-cover"
                              />
                            )
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-surface text-xs text-ink-muted">
                              N/A
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-ink">
                              {product.title}
                            </div>
                            <div className="mt-0.5 text-xs text-ink-muted">
                              Listed {formatListedDate(product.createdAt)}
                              {product.category
                                ? ` · ${product.category.name}`
                                : ""}
                            </div>
                            {product.stock > 0 && product.stock <= 5 && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                <AlertTriangle
                                  className="h-3 w-3"
                                  strokeWidth={1.75}
                                />
                                Low stock
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-medium ring-1 ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={product.price.toFixed(2)}
                          onBlur={(e) =>
                            handlePriceStockBlur(
                              product.id,
                              "price",
                              e.target.value
                            )
                          }
                          disabled={isPending}
                          className="w-24 border border-line bg-surface-elevated px-2 py-1.5 text-sm tabular-nums focus:border-ink focus:outline-none disabled:opacity-50"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleDiscount(product)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 transition-colors ${
                            discountPct != null
                              ? "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100"
                              : "bg-surface text-ink-muted ring-line hover:bg-surface-elevated hover:text-ink"
                          }`}
                        >
                          {discountPct != null ? (
                            <>
                              <Tag className="h-3 w-3" strokeWidth={1.75} />
                              {discountPct}% off
                            </>
                          ) : (
                            <>
                              <Percent className="h-3 w-3" strokeWidth={1.75} />
                              Add offer
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          defaultValue={product.stock}
                          onBlur={(e) =>
                            handlePriceStockBlur(
                              product.id,
                              "stock",
                              e.target.value
                            )
                          }
                          disabled={isPending}
                          className={`w-20 border bg-surface-elevated px-2 py-1.5 text-sm tabular-nums focus:border-ink focus:outline-none disabled:opacity-50 ${
                            product.stock <= 5
                              ? "border-amber-400 text-amber-900"
                              : "border-line"
                          }`}
                        />
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-ink">
                        {product.unitsSold}
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-ink">
                        ${product.revenue.toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleLocation(product)}
                          className="inline-flex items-start gap-2 text-left text-sm text-ink-muted transition-colors hover:text-ink"
                        >
                          <MapPin
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                          <span className="max-w-[160px]">
                            {formatLocation(product)}
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/product/${product.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            strokeWidth={1.75}
                          />
                          Store
                        </Link>
                      </td>
                    </tr>

                    {/* Discount panel */}
                    {isDiscountExpanded && discountDrafts[product.id] && (
                      <tr>
                        <td colSpan={9} className="bg-surface px-5 py-5">
                          <div className="mx-auto max-w-lg">
                            <h4 className="font-display text-sm font-medium text-ink">
                              Set Offer Discount for{" "}
                              <span className="text-ink-muted">
                                {product.title}
                              </span>
                            </h4>
                            <p className="mt-1 text-xs text-ink-muted">
                              Current price: ${product.price.toFixed(2)}
                              {product.compareAtPrice != null &&
                                product.compareAtPrice > product.price && (
                                  <>
                                    {" "}
                                    · Was: $
                                    {product.compareAtPrice.toFixed(2)}
                                  </>
                                )}
                            </p>

                            <div className="mt-4 flex items-end gap-3">
                              <div className="flex rounded ring-1 ring-line">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDiscountDrafts((c) => ({
                                      ...c,
                                      [product.id]: {
                                        ...c[product.id],
                                        mode: "percentage",
                                      },
                                    }))
                                  }
                                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                                    discountDrafts[product.id].mode ===
                                    "percentage"
                                      ? "bg-ink text-white"
                                      : "bg-surface-elevated text-ink-muted hover:text-ink"
                                  }`}
                                >
                                  % Off
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDiscountDrafts((c) => ({
                                      ...c,
                                      [product.id]: {
                                        ...c[product.id],
                                        mode: "fixed",
                                      },
                                    }))
                                  }
                                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                                    discountDrafts[product.id].mode === "fixed"
                                      ? "bg-ink text-white"
                                      : "bg-surface-elevated text-ink-muted hover:text-ink"
                                  }`}
                                >
                                  $ Off
                                </button>
                              </div>

                              <div className="flex-1">
                                <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                                  {discountDrafts[product.id].mode ===
                                  "percentage"
                                    ? "Discount %"
                                    : "Amount off ($)"}
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={
                                    discountDrafts[product.id].mode ===
                                    "percentage"
                                      ? "99"
                                      : undefined
                                  }
                                  value={discountDrafts[product.id].value}
                                  onChange={(e) =>
                                    setDiscountDrafts((c) => ({
                                      ...c,
                                      [product.id]: {
                                        ...c[product.id],
                                        value: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={
                                    discountDrafts[product.id].mode ===
                                    "percentage"
                                      ? "e.g. 20"
                                      : "e.g. 10.00"
                                  }
                                  className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm tabular-nums focus:border-ink focus:outline-none"
                                />
                              </div>

                              {discountDrafts[product.id].value.trim() && (
                                <p className="shrink-0 pb-2 text-xs text-ink-muted">
                                  Customers see{" "}
                                  <span className="font-medium text-ink">
                                    $
                                    {(() => {
                                      const v = parseFloat(
                                        discountDrafts[product.id].value
                                      )
                                      if (Number.isNaN(v) || v <= 0) return "—"
                                      if (
                                        discountDrafts[product.id].mode ===
                                        "percentage"
                                      ) {
                                        return (
                                          product.price / (1 - v / 100)
                                        ).toFixed(2)
                                      }
                                      return (product.price + v).toFixed(2)
                                    })()}
                                  </span>{" "}
                                  crossed out
                                </p>
                              )}
                            </div>

                            <div className="mt-5 flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveDiscount(product.id)}
                                disabled={isPending}
                                className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                              >
                                Apply Discount
                              </button>
                              {discountPct != null && (
                                <button
                                  type="button"
                                  onClick={() => removeDiscount(product.id)}
                                  disabled={isPending}
                                  className="inline-flex items-center gap-1.5 border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" strokeWidth={2} />
                                  Remove
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                className="border border-line bg-surface px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:bg-surface-elevated"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Location panel */}
                    {isLocationExpanded && locationDrafts[product.id] && (
                      <tr>
                        <td colSpan={9} className="bg-surface px-5 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                                Location Name
                              </label>
                              <input
                                value={locationDrafts[product.id].locationName}
                                onChange={(e) =>
                                  setLocationDrafts((current) => ({
                                    ...current,
                                    [product.id]: {
                                      ...current[product.id],
                                      locationName: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Main Warehouse"
                                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                                Address
                              </label>
                              <input
                                value={
                                  locationDrafts[product.id].locationAddress
                                }
                                onChange={(e) =>
                                  setLocationDrafts((current) => ({
                                    ...current,
                                    [product.id]: {
                                      ...current[product.id],
                                      locationAddress: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="123 Commerce St"
                                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                                City
                              </label>
                              <input
                                value={locationDrafts[product.id].locationCity}
                                onChange={(e) =>
                                  setLocationDrafts((current) => ({
                                    ...current,
                                    [product.id]: {
                                      ...current[product.id],
                                      locationCity: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Portland"
                                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                                Country
                              </label>
                              <input
                                value={
                                  locationDrafts[product.id].locationCountry
                                }
                                onChange={(e) =>
                                  setLocationDrafts((current) => ({
                                    ...current,
                                    [product.id]: {
                                      ...current[product.id],
                                      locationCountry: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="United States"
                                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveLocation(product.id)}
                              disabled={isPending}
                              className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                            >
                              Save Location
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedId(null)}
                              className="border border-line bg-surface px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:bg-surface-elevated"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from "react"
import { AlertTriangle } from "lucide-react"
import {
  createAdminCategory,
  updateAdminProduct,
  type AdminCategory,
  type AdminProduct,
} from "@/app/actions/admin"

export default function AdminProductTable({
  initialProducts,
  categories: initialCategories,
}: {
  initialProducts: AdminProduct[]
  categories: AdminCategory[]
}) {
  const [products, setProducts] = useState(initialProducts)
  const [categories, setCategories] = useState(initialCategories)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  const handleUpdate = (
    productId: string,
    field: "stock" | "price" | "categoryId",
    value: string
  ) => {
    setError("")
    startTransition(async () => {
      try {
        const payload =
          field === "categoryId"
            ? { categoryId: value || null }
            : field === "stock"
              ? { stock: parseInt(value, 10) }
              : { price: parseFloat(value) }

        await updateAdminProduct(productId, payload)
        setProducts((current) =>
          current.map((product) => {
            if (product.id !== productId) return product
            if (field === "categoryId") {
              const category = categories.find((c) => c.id === value) ?? null
              return {
                ...product,
                category: category
                  ? { id: category.id, name: category.name }
                  : null,
              }
            }
            return {
              ...product,
              [field]: field === "stock" ? parseInt(value, 10) : parseFloat(value),
              isLowStock:
                field === "stock"
                  ? parseInt(value, 10) <= product.lowStockThreshold
                  : product.isLowStock,
            }
          })
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update product")
      }
    })
  }

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return
    setError("")
    startTransition(async () => {
      try {
        await createAdminCategory(newCategoryName)
        setNewCategoryName("")
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create category")
      }
    })
  }

  const lowStockProducts = products.filter((p) => p.isLowStock)

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Product & Inventory
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Manage catalog, categories, stock levels, and variants.
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {lowStockProducts.length > 0 && (
        <div className="mb-6 border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            {lowStockProducts.length} product
            {lowStockProducts.length === 1 ? "" : "s"} below stock threshold
          </div>
          <p className="mt-1 text-xs text-amber-800">
            {lowStockProducts.map((p) => p.title).join(", ")}
          </p>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-3 border border-line bg-surface p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            New Category
          </label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Kitchenware"
            className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleCreateCategory}
          disabled={isPending || !newCategoryName.trim()}
          className="border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          Add Category
        </button>
      </div>

      <div className="overflow-x-auto border border-line bg-surface-elevated">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surface">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Product
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Category
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Price
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Stock
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Variants
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Seller
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-16 text-center text-sm text-ink-muted"
                >
                  No products in catalog yet.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className={`transition-colors hover:bg-surface/60 ${
                    product.isLowStock ? "bg-amber-50/50" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      {product.isLowStock && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 shrink-0 text-amber-600"
                          strokeWidth={1.75}
                        />
                      )}
                      {product.title}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={product.category?.id ?? ""}
                      onChange={(e) =>
                        handleUpdate(product.id, "categoryId", e.target.value)
                      }
                      disabled={isPending}
                      className="h-9 min-w-[120px] border border-line bg-surface-elevated px-2 text-sm focus:border-ink focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product.price.toFixed(2)}
                      onBlur={(e) =>
                        handleUpdate(product.id, "price", e.target.value)
                      }
                      disabled={isPending}
                      className="w-24 border border-line bg-surface-elevated px-2 py-1.5 text-sm tabular-nums focus:border-ink focus:outline-none disabled:opacity-50"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <input
                      type="number"
                      min="0"
                      defaultValue={product.stock}
                      onBlur={(e) =>
                        handleUpdate(product.id, "stock", e.target.value)
                      }
                      disabled={isPending}
                      className={`w-20 border bg-surface-elevated px-2 py-1.5 text-sm tabular-nums focus:border-ink focus:outline-none disabled:opacity-50 ${
                        product.isLowStock
                          ? "border-amber-400 text-amber-900"
                          : "border-line"
                      }`}
                    />
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {product.variants.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-0.5">
                        {product.variants.map((v) => (
                          <li key={v.id}>
                            {v.label}{" "}
                            <span className="text-ink-muted/70">
                              ({v.stock} in stock)
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {product.seller.name || product.seller.email}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

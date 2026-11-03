'use client'

import { useState, useTransition } from "react"
import { AlertTriangle } from "lucide-react"
import {
  updateAdminProduct,
  type AdminCategory,
  type AdminProduct,
} from "@/app/actions/admin"

export default function AdminProductTable({
  initialProducts,
}: {
  initialProducts: AdminProduct[]
  categories: AdminCategory[]
}) {
  const [products, setProducts] = useState(initialProducts)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const handleUpdate = (
    productId: string,
    field: "stock" | "price",
    value: string
  ) => {
    setError("")
    startTransition(async () => {
      try {
        const payload =
          field === "stock"
            ? { stock: parseInt(value, 10) }
            : { price: parseFloat(value) }

        await updateAdminProduct(productId, payload)
        setProducts((current) =>
          current.map((product) => {
            if (product.id !== productId) return product
            return {
              ...product,
              [field]:
                field === "stock" ? parseInt(value, 10) : parseFloat(value),
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

  const lowStockProducts = products.filter((p) => p.isLowStock)

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Product & Inventory
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Manage catalog, stock levels, and variants. Shop categories are edited
          under Categories.
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


      <div className="overflow-x-auto border border-line bg-surface-elevated">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surface">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Product
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Categories / Animals
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
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    <div>
                      {product.categories.length > 0
                        ? product.categories.map((c) => c.name).join(", ")
                        : "Uncategorized"}
                    </div>
                    {product.animals.length > 0 && (
                      <div className="mt-1 text-xs">
                        {product.animals.join(" · ")}
                      </div>
                    )}
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

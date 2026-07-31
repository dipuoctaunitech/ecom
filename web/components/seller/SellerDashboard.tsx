'use client'

import { useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Megaphone,
  Package,
  Plus,
  Ship,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react"
import type {
  PaginatedSellerOrders,
  SellerDeliverySettings,
  SellerDiscountCode,
  SellerProduct,
} from "@/app/actions/seller"
import SellerProductList from "@/components/seller/SellerProductList"
import SellerAddProduct from "@/components/seller/SellerAddProduct"
import SellerDeliveryPanel from "@/components/seller/SellerDeliveryPanel"
import SellerDiscounts from "@/components/seller/SellerDiscounts"
import SellerShippingTable from "@/components/seller/SellerShippingTable"

type SellerTab =
  | "products"
  | "add"
  | "shipping"
  | "delivery"
  | "discounts"

const VALID_TABS: SellerTab[] = [
  "products",
  "add",
  "shipping",
  "delivery",
  "discounts",
]

const NAV_ITEMS: {
  id: SellerTab
  label: string
  icon: React.ReactNode
}[] = [
  {
    id: "products",
    label: "Track Products",
    icon: <Package className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "shipping",
    label: "Track Shipping",
    icon: <Ship className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "add",
    label: "Add Product",
    icon: <Plus className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: <Truck className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "discounts",
    label: "Discounts",
    icon: <Megaphone className="h-4 w-4" strokeWidth={1.75} />,
  },
]

function resolveTab(value: string | null | undefined): SellerTab {
  if (value && VALID_TABS.includes(value as SellerTab)) {
    return value as SellerTab
  }
  return "products"
}

export default function SellerDashboard({
  products,
  orders,
  deliverySettings,
  discountCodes,
  initialTab = "products",
}: {
  products: SellerProduct[]
  orders: PaginatedSellerOrders
  deliverySettings: SellerDeliverySettings
  discountCodes: SellerDiscountCode[]
  initialTab?: SellerTab
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = resolveTab(searchParams.get("tab") ?? initialTab)

  const setActiveTab = useCallback(
    (tab: SellerTab) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === "products") {
        params.delete("tab")
      } else {
        params.set("tab", tab)
      }
      const query = params.toString()
      router.replace(query ? `/seller?${query}` : "/seller", { scroll: false })
    },
    [router, searchParams]
  )

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-surface-elevated">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to store
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-line bg-surface">
                <Store className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                  FORMA Seller
                </p>
                <h1 className="font-display text-xl font-medium tracking-tight text-ink">
                  Seller Dashboard
                </h1>
              </div>
            </div>
          </div>
          <div className="hidden flex-col items-end gap-0.5 text-sm text-ink-muted sm:flex">
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
              {products.length} listing{products.length === 1 ? "" : "s"}
            </span>
            <span className="text-xs tabular-nums">
              {orders.total} order{orders.total === 1 ? "" : "s"} ·{" "}
              {products.reduce((sum, p) => sum + p.unitsSold, 0)} sold
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:flex-row md:px-8 md:py-10">
        <aside className="md:w-56 md:shrink-0">
          <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex shrink-0 items-center gap-3 border px-4 py-3 text-left text-sm transition-colors ${
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-surface-elevated text-ink-muted hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 border border-line bg-surface-elevated p-6 md:p-8">
          {activeTab === "products" && (
            <SellerProductList
              key={products.map((p) => `${p.id}:${p.updatedAt}`).join("|")}
              initialProducts={products}
            />
          )}

          {activeTab === "shipping" && (
            <SellerShippingTable initialData={orders} />
          )}

          {activeTab === "add" && <SellerAddProduct />}

          {activeTab === "delivery" && (
            <SellerDeliveryPanel initialSettings={deliverySettings} />
          )}

          {activeTab === "discounts" && (
            <SellerDiscounts initialCodes={discountCodes} />
          )}
        </main>
      </div>
    </div>
  )
}

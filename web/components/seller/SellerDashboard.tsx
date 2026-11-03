'use client'

import { useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  LayoutGrid,
  Megaphone,
  Package,
  Percent,
  Plus,
  QrCode,
  Scissors,
  Ship,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Truck,
} from "lucide-react"
import type {
  PaginatedSellerOrders,
  SellerCategory,
  SellerDeliverySettings,
  SellerDiscountCode,
  SellerProduct,
  SellerQrSettings,
} from "@/app/actions/seller"
import type { StoreCategory } from "@/app/actions/store-categories"
import type {
  StoreCollection,
  StoreCollectionCategoryOption,
} from "@/app/actions/store-collections"
import type {
  NewArrivalManagedItem,
  NewArrivalProductOption,
} from "@/app/actions/store-new-arrivals"
import type { StoreOfferGroup } from "@/app/actions/store-offer-groups"
import SellerProductList from "@/components/seller/SellerProductList"
import SellerAddProduct from "@/components/seller/SellerAddProduct"
import SellerCategories from "@/components/seller/SellerCategories"
import SellerDeliveryPanel from "@/components/seller/SellerDeliveryPanel"
import SellerDiscounts from "@/components/seller/SellerDiscounts"
import SellerShippingTable from "@/components/seller/SellerShippingTable"
import SellerQrPanel from "@/components/seller/SellerQrPanel"
import StoreCategoriesPanel from "@/components/store/StoreCategoriesPanel"
import StoreCollectionsPanel from "@/components/store/StoreCollectionsPanel"
import StoreNewArrivalsPanel from "@/components/store/StoreNewArrivalsPanel"
import StoreOfferGroupsPanel from "@/components/store/StoreOfferGroupsPanel"
import StoreRosterPanel from "@/components/store/StoreRosterPanel"
import StoreServicesPanel from "@/components/store/StoreServicesPanel"
import StoreTimeFramesPanel from "@/components/store/StoreTimeFramesPanel"
import type { StoreRosterBoard } from "@/app/actions/store-roster"
import type { ManagedService } from "@/app/actions/store-services"
import type { TimeFrameBoard } from "@/app/actions/store-timeframes"

type SellerTab =
  | "products"
  | "add"
  | "categories"
  | "collections"
  | "new-arrivals"
  | "offers"
  | "services"
  | "slots"
  | "roster"
  | "shipping"
  | "delivery"
  | "discounts"
  | "qr"

const VALID_TABS: SellerTab[] = [
  "products",
  "add",
  "categories",
  "collections",
  "new-arrivals",
  "offers",
  "services",
  "slots",
  "roster",
  "shipping",
  "delivery",
  "discounts",
  "qr",
]

const BASE_NAV_ITEMS: {
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
    id: "categories",
    label: "Categories",
    icon: <Tags className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "collections",
    label: "Collections",
    icon: <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "new-arrivals",
    label: "New Arrivals",
    icon: <Sparkles className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "offers",
    label: "Offers",
    icon: <Percent className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "services",
    label: "Services",
    icon: <Scissors className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "slots",
    label: "Time frames",
    icon: <Clock3 className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "roster",
    label: "Roster",
    icon: <CalendarDays className="h-4 w-4" strokeWidth={1.75} />,
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
  {
    id: "qr",
    label: "Payment & GST",
    icon: <QrCode className="h-4 w-4" strokeWidth={1.75} />,
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
  qrSettings,
  categories,
  storeCategories = [],
  storeCollections = [],
  collectionCategoryOptions = [],
  newArrivalItems = [],
  newArrivalOptions = [],
  newArrivalLimit = 15,
  offerGroups = [],
  managedServices = [],
  timeFrameBoard = null,
  rosterBoard = null,
  canManageStoreCategories = false,
  initialTab = "products",
}: {
  products: SellerProduct[]
  orders: PaginatedSellerOrders
  deliverySettings: SellerDeliverySettings
  discountCodes: SellerDiscountCode[]
  qrSettings: SellerQrSettings
  categories: SellerCategory[]
  storeCategories?: StoreCategory[]
  storeCollections?: StoreCollection[]
  collectionCategoryOptions?: StoreCollectionCategoryOption[]
  newArrivalItems?: NewArrivalManagedItem[]
  newArrivalOptions?: NewArrivalProductOption[]
  newArrivalLimit?: number
  offerGroups?: StoreOfferGroup[]
  managedServices?: ManagedService[]
  timeFrameBoard?: TimeFrameBoard | null
  rosterBoard?: StoreRosterBoard | null
  canManageStoreCategories?: boolean
  initialTab?: SellerTab
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = resolveTab(searchParams.get("tab") ?? initialTab)
  const managerOnlyTabs: SellerTab[] = [
    "collections",
    "new-arrivals",
    "offers",
    "services",
    "slots",
    "roster",
  ]
  const navItems = canManageStoreCategories
    ? BASE_NAV_ITEMS
    : BASE_NAV_ITEMS.filter((item) => !managerOnlyTabs.includes(item.id))

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
                  namma pets Club Seller
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
            {navItems.map((item) => {
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
            <SellerShippingTable
              initialData={orders}
              qrCodeUrl={qrSettings.qrCodeUrl}
            />
          )}

          {activeTab === "add" && (
            <SellerAddProduct categories={categories} />
          )}

          {activeTab === "categories" && (
            <div className="space-y-12">
              {canManageStoreCategories && (
                <StoreCategoriesPanel
                  key={storeCategories
                    .map((category) => `${category.id}:${category.sortOrder}`)
                    .join("|")}
                  initialCategories={storeCategories}
                />
              )}
              <SellerCategories
                key={categories
                  .filter((category) => category.isOwn)
                  .map((category) => category.id)
                  .join("|")}
                initialCategories={categories}
              />
            </div>
          )}

          {activeTab === "collections" && canManageStoreCategories && (
            <StoreCollectionsPanel
              key={storeCollections
                .map((collection) => `${collection.id}:${collection.sortOrder}`)
                .join("|")}
              initialCollections={storeCollections}
              categoryOptions={collectionCategoryOptions}
            />
          )}

          {activeTab === "new-arrivals" && canManageStoreCategories && (
            <StoreNewArrivalsPanel
              key={newArrivalItems
                .map((item) => `${item.id}:${item.sortOrder}`)
                .join("|")}
              initialItems={newArrivalItems}
              productOptions={newArrivalOptions}
              limit={newArrivalLimit}
            />
          )}

          {activeTab === "offers" && canManageStoreCategories && (
            <StoreOfferGroupsPanel
              key={offerGroups
                .map((group) => `${group.id}:${group.sortOrder}`)
                .join("|")}
              initialGroups={offerGroups}
            />
          )}

          {activeTab === "services" && canManageStoreCategories && (
            <StoreServicesPanel
              key={managedServices
                .map(
                  (service) =>
                    `${service.id}:${service.sortOrder}:${service.price}:${service.isActive}`
                )
                .join("|")}
              initialServices={managedServices}
              defaultVertical="GROOMING"
            />
          )}

          {activeTab === "slots" &&
            canManageStoreCategories &&
            timeFrameBoard && (
              <StoreTimeFramesPanel
                key={`${timeFrameBoard.vertical}:${timeFrameBoard.frames
                  .map((frame) => `${frame.id}:${frame.startTime}:${frame.endTime}`)
                  .join("|")}`}
                initialBoard={timeFrameBoard}
              />
            )}

          {activeTab === "roster" &&
            canManageStoreCategories &&
            rosterBoard && (
              <StoreRosterPanel
                key={`${rosterBoard.dateKey}:${rosterBoard.staff
                  .map((member) => member.id)
                  .join("|")}`}
                initialBoard={rosterBoard}
                initialVertical="GROOMING"
              />
            )}

          {activeTab === "delivery" && (
            <SellerDeliveryPanel initialSettings={deliverySettings} />
          )}

          {activeTab === "discounts" && (
            <SellerDiscounts initialCodes={discountCodes} />
          )}

          {activeTab === "qr" && (
            <SellerQrPanel initialSettings={qrSettings} />
          )}
        </main>
      </div>
    </div>
  )
}

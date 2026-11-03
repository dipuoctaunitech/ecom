'use client'

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  LayoutDashboard,
  LayoutGrid,
  CalendarDays,
  Clock3,
  Bike,
  Megaphone,
  Package,
  Percent,
  Scissors,
  Settings,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Store,
  Tags,
  Users,
} from "lucide-react"
import type {
  AdminAnalytics,
  AdminBuyerRow,
  AdminCategory,
  AdminCustomer,
  AdminDeliveryBoyRow,
  AdminDiscountCode,
  AdminProduct,
  AdminSellerRow,
  AdminStaffRow,
  AdminSupportTicket,
  PaginatedOrders,
  StoreSettingsData,
} from "@/app/actions/admin"
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
import type { ManagedService } from "@/app/actions/store-services"
import type { TimeFrameBoard } from "@/app/actions/store-timeframes"
import type { StoreRosterBoard } from "@/app/actions/store-roster"
import AdminOverview from "@/components/admin/AdminOverview"
import AdminOrderTable from "@/components/admin/AdminOrderTable"
import AdminProductTable from "@/components/admin/AdminProductTable"
import StoreCategoriesPanel from "@/components/store/StoreCategoriesPanel"
import StoreCollectionsPanel from "@/components/store/StoreCollectionsPanel"
import StoreNewArrivalsPanel from "@/components/store/StoreNewArrivalsPanel"
import StoreOfferGroupsPanel from "@/components/store/StoreOfferGroupsPanel"
import StoreServicesPanel from "@/components/store/StoreServicesPanel"
import StoreTimeFramesPanel from "@/components/store/StoreTimeFramesPanel"
import StoreRosterPanel from "@/components/store/StoreRosterPanel"
import AdminCustomers from "@/components/admin/AdminCustomers"
import AdminMarketing from "@/components/admin/AdminMarketing"
import AdminSellers from "@/components/admin/AdminSellers"
import AdminDelivery from "@/components/admin/AdminDelivery"
import AdminStaff from "@/components/admin/AdminStaff"
import AdminSettings from "@/components/admin/AdminSettings"

type AdminTab =
  | "overview"
  | "sellers"
  | "delivery"
  | "staff"
  | "products"
  | "categories"
  | "collections"
  | "new-arrivals"
  | "offers"
  | "services"
  | "slots"
  | "roster"
  | "orders"
  | "customers"
  | "marketing"
  | "settings"

const NAV_ITEMS: {
  id: AdminTab
  label: string
  icon: React.ReactNode
}[] = [
  {
    id: "overview",
    label: "Analytics",
    icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "sellers",
    label: "Sellers",
    icon: <Store className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: <Bike className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "staff",
    label: "Groomers & clinic",
    icon: <Stethoscope className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "products",
    label: "Products",
    icon: <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />,
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
    id: "orders",
    label: "Orders",
    icon: <Package className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "customers",
    label: "Customers",
    icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: <Megaphone className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" strokeWidth={1.75} />,
  },
]

export default function AdminDashboard({
  sellers,
  buyers,
  deliveryBoys,
  staff,
  analytics,
  initialOrders,
  products,
  categories,
  storeCategories,
  storeCollections,
  collectionCategoryOptions,
  newArrivalItems,
  newArrivalOptions,
  newArrivalLimit,
  offerGroups,
  managedServices,
  timeFrameBoard,
  rosterBoard,
  customers,
  tickets,
  discountCodes,
  storeSettings,
}: {
  sellers: AdminSellerRow[]
  buyers: AdminBuyerRow[]
  deliveryBoys: AdminDeliveryBoyRow[]
  staff: AdminStaffRow[]
  analytics: AdminAnalytics
  initialOrders: PaginatedOrders
  products: AdminProduct[]
  categories: AdminCategory[]
  storeCategories: StoreCategory[]
  storeCollections: StoreCollection[]
  collectionCategoryOptions: StoreCollectionCategoryOption[]
  newArrivalItems: NewArrivalManagedItem[]
  newArrivalOptions: NewArrivalProductOption[]
  newArrivalLimit: number
  offerGroups: StoreOfferGroup[]
  managedServices: ManagedService[]
  timeFrameBoard: TimeFrameBoard
  rosterBoard: StoreRosterBoard
  customers: AdminCustomer[]
  tickets: AdminSupportTicket[]
  discountCodes: AdminDiscountCode[]
  storeSettings: StoreSettingsData
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")

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
                <BarChart3 className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                  namma pets Club Admin
                </p>
                <h1 className="font-display text-xl font-medium tracking-tight text-ink">
                  Dashboard
                </h1>
              </div>
            </div>
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
          {activeTab === "overview" && (
            <AdminOverview analytics={analytics} />
          )}

          {activeTab === "sellers" && (
            <AdminSellers sellers={sellers} buyers={buyers} />
          )}

          {activeTab === "delivery" && (
            <AdminDelivery deliveryBoys={deliveryBoys} />
          )}

          {activeTab === "staff" && <AdminStaff staff={staff} />}

          {activeTab === "products" && (
            <AdminProductTable
              initialProducts={products}
              categories={categories}
            />
          )}

          {activeTab === "categories" && (
            <StoreCategoriesPanel initialCategories={storeCategories} />
          )}

          {activeTab === "collections" && (
            <StoreCollectionsPanel
              initialCollections={storeCollections}
              categoryOptions={collectionCategoryOptions}
            />
          )}

          {activeTab === "new-arrivals" && (
            <StoreNewArrivalsPanel
              initialItems={newArrivalItems}
              productOptions={newArrivalOptions}
              limit={newArrivalLimit}
            />
          )}

          {activeTab === "offers" && (
            <StoreOfferGroupsPanel initialGroups={offerGroups} />
          )}

          {activeTab === "services" && (
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

          {activeTab === "slots" && (
            <StoreTimeFramesPanel
              key={`${timeFrameBoard.vertical}:${timeFrameBoard.frames
                .map(
                  (frame) =>
                    `${frame.id}:${frame.startTime}:${frame.endTime}:${frame.staffIds.join(",")}`
                )
                .join("|")}`}
              initialBoard={timeFrameBoard}
            />
          )}

          {activeTab === "roster" && (
            <StoreRosterPanel
              key={`${rosterBoard.dateKey}:${rosterBoard.staff
                .map((member) => member.id)
                .join("|")}`}
              initialBoard={rosterBoard}
              initialVertical="GROOMING"
            />
          )}

          {activeTab === "orders" && (
            <AdminOrderTable
              initialData={initialOrders}
              deliveryBoys={deliveryBoys}
            />
          )}

          {activeTab === "customers" && (
            <AdminCustomers customers={customers} tickets={tickets} />
          )}

          {activeTab === "marketing" && (
            <AdminMarketing discountCodes={discountCodes} />
          )}

          {activeTab === "settings" && (
            <AdminSettings initialSettings={storeSettings} />
          )}
        </main>
      </div>
    </div>
  )
}

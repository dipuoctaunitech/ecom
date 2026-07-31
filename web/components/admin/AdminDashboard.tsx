'use client'

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react"
import { Role } from "@prisma/client"
import type {
  AdminAnalytics,
  AdminCategory,
  AdminCustomer,
  AdminDiscountCode,
  AdminProduct,
  AdminSupportTicket,
  PaginatedOrders,
  StoreSettingsData,
} from "@/app/actions/admin"
import AdminOverview from "@/components/admin/AdminOverview"
import AdminOrderTable from "@/components/admin/AdminOrderTable"
import AdminProductTable from "@/components/admin/AdminProductTable"
import AdminCustomers from "@/components/admin/AdminCustomers"
import AdminMarketing from "@/components/admin/AdminMarketing"
import AdminSettings from "@/components/admin/AdminSettings"

type AdminTab =
  | "overview"
  | "products"
  | "orders"
  | "customers"
  | "marketing"
  | "settings"

type User = {
  id: string
  name: string | null
  email: string | null
  role: Role
}

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
    id: "products",
    label: "Products",
    icon: <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />,
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
  users,
  analytics,
  initialOrders,
  products,
  categories,
  customers,
  tickets,
  discountCodes,
  storeSettings,
}: {
  users: User[]
  analytics: AdminAnalytics
  initialOrders: PaginatedOrders
  products: AdminProduct[]
  categories: AdminCategory[]
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
                  FORMA Admin
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

          {activeTab === "products" && (
            <AdminProductTable
              initialProducts={products}
              categories={categories}
            />
          )}

          {activeTab === "orders" && (
            <AdminOrderTable initialData={initialOrders} />
          )}

          {activeTab === "customers" && (
            <AdminCustomers customers={customers} tickets={tickets} />
          )}

          {activeTab === "marketing" && (
            <AdminMarketing discountCodes={discountCodes} />
          )}

          {activeTab === "settings" && (
            <AdminSettings initialSettings={storeSettings} users={users} />
          )}
        </main>
      </div>
    </div>
  )
}

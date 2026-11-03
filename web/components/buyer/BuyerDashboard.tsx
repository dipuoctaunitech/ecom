"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  LayoutDashboard,
  Package,
  PawPrint,
  UserRound,
} from "lucide-react"
import type {
  CustomerDashboardData,
  CustomerPet,
  CustomerProfile,
} from "@/app/actions/account"
import type { BuyerOrder } from "@/app/actions/order"
import { CartSidebar } from "@/components/CartSidebar"
import BuyerOverview from "@/components/buyer/BuyerOverview"
import BuyerProfile from "@/components/buyer/BuyerProfile"
import BuyerPets from "@/components/buyer/BuyerPets"
import BuyerBookings from "@/components/buyer/BuyerBookings"
import { BuyerOrdersPanel } from "@/components/buyer/BuyerOrders"

type BuyerTab = "overview" | "profile" | "pets" | "orders" | "bookings"

const VALID_TABS: BuyerTab[] = [
  "overview",
  "profile",
  "pets",
  "orders",
  "bookings",
]

const NAV_ITEMS: {
  id: BuyerTab
  label: string
  shortLabel: string
  icon: React.ReactNode
}[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Home",
    icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "profile",
    label: "Profile",
    shortLabel: "Profile",
    icon: <UserRound className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "pets",
    label: "Pets",
    shortLabel: "Pets",
    icon: <PawPrint className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "orders",
    label: "Orders",
    shortLabel: "Orders",
    icon: <Package className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "bookings",
    label: "Bookings",
    shortLabel: "Book",
    icon: <CalendarDays className="h-5 w-5" strokeWidth={1.75} />,
  },
]

function resolveTab(value: string | null | undefined): BuyerTab {
  if (value && VALID_TABS.includes(value as BuyerTab)) {
    return value as BuyerTab
  }
  return "overview"
}

export default function BuyerDashboard({
  dashboard,
  orders,
  initialTab = "overview",
}: {
  dashboard: CustomerDashboardData
  orders: BuyerOrder[]
  initialTab?: BuyerTab
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = resolveTab(searchParams.get("tab") ?? initialTab)

  const [profile, setProfile] = useState<CustomerProfile>(dashboard.profile)
  const [pets, setPets] = useState<CustomerPet[]>(dashboard.pets)
  const bookings = dashboard.bookings
  const nextBooking = dashboard.nextBooking
  const orderSummary = dashboard.orderSummary

  const setActiveTab = useCallback(
    (tab: BuyerTab) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === "overview") {
        params.delete("tab")
      } else {
        params.set("tab", tab)
      }
      const query = params.toString()
      router.replace(query ? `/account?${query}` : "/account", { scroll: false })
    },
    [router, searchParams]
  )

  const handlePetsChanged = useCallback((next: CustomerPet[]) => {
    setPets(next)
  }, [])

  const handleProfileSaved = useCallback((next: CustomerProfile) => {
    setProfile(next)
  }, [])

  return (
    <div className="min-h-[100dvh] bg-surface pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <CartSidebar />

      <header className="sticky top-0 z-30 border-b border-line bg-surface-elevated/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface-elevated/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 md:px-8">
          <div className="min-w-0 flex-1">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Store
            </Link>
            <div className="mt-1 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-surface">
                <UserRound className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                  namma pets Club
                </p>
                <h1 className="truncate font-display text-lg font-medium tracking-tight text-ink sm:text-xl">
                  My Account
                </h1>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 flex-col items-end gap-0.5 text-sm text-ink-muted sm:flex">
            <span className="max-w-[14rem] truncate">
              {profile.name || profile.email}
            </span>
            <span className="text-xs tabular-nums">
              {dashboard.loyalty.totalPoints.toLocaleString("en-IN")} pts ·{" "}
              {pets.length} pet{pets.length === 1 ? "" : "s"} ·{" "}
              {orderSummary.orderCount} order
              {orderSummary.orderCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-0.5 text-right sm:hidden">
            <span className="max-w-[7.5rem] truncate text-xs font-medium text-ink">
              {profile.name || profile.email}
            </span>
            <span className="text-[11px] tabular-nums text-ink-muted">
              {dashboard.loyalty.totalPoints.toLocaleString("en-IN")} pts
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 md:flex-row md:gap-8 md:px-8 md:py-10">
        <aside className="hidden md:block md:w-56 md:shrink-0">
          <nav className="flex flex-col gap-2" aria-label="Account sections">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex min-h-11 items-center gap-3 border px-4 py-3 text-left text-sm transition-colors ${
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-surface-elevated text-ink-muted hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 border-0 bg-transparent p-0 md:border md:border-line md:bg-surface-elevated md:p-8">
          {activeTab === "overview" && (
            <BuyerOverview
              profile={profile}
              pets={pets}
              orderSummary={orderSummary}
              loyalty={dashboard.loyalty}
              savings={dashboard.savings}
              nextBooking={nextBooking}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "profile" && (
            <BuyerProfile
              initialProfile={profile}
              loyalty={dashboard.loyalty}
              savings={dashboard.savings}
              onSaved={handleProfileSaved}
            />
          )}

          {activeTab === "pets" && (
            <BuyerPets initialPets={pets} onChanged={handlePetsChanged} />
          )}

          {activeTab === "orders" && (
            <BuyerOrdersPanel initialOrders={orders} />
          )}

          {activeTab === "bookings" && (
            <BuyerBookings bookings={bookings} />
          )}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-elevated/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-surface-elevated/90 md:hidden"
        aria-label="Account sections"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[10px] font-medium tracking-wide transition-colors ${
                  isActive ? "text-ink" : "text-ink-muted active:text-ink"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center ${
                    isActive ? "bg-ink text-white" : "bg-transparent"
                  }`}
                >
                  {item.icon}
                </span>
                <span className={isActive ? "text-ink" : undefined}>
                  {item.shortLabel}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

"use client"

import { useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  LayoutGrid,
  Percent,
  Scissors,
  Sparkles,
  Tags,
  ClipboardList,
} from "lucide-react"
import type {
  ManagerOverview,
  ManagerProfile,
} from "@/app/actions/manager"
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
import type { StoreRosterBoard } from "@/app/actions/store-roster"
import type { ManagedService } from "@/app/actions/store-services"
import type { TimeFrameBoard } from "@/app/actions/store-timeframes"
import StoreCategoriesPanel from "@/components/store/StoreCategoriesPanel"
import StoreCollectionsPanel from "@/components/store/StoreCollectionsPanel"
import StoreNewArrivalsPanel from "@/components/store/StoreNewArrivalsPanel"
import StoreOfferGroupsPanel from "@/components/store/StoreOfferGroupsPanel"
import StoreRosterPanel from "@/components/store/StoreRosterPanel"
import StoreServicesPanel from "@/components/store/StoreServicesPanel"
import StoreTimeFramesPanel from "@/components/store/StoreTimeFramesPanel"

type ManagerTab =
  | "overview"
  | "categories"
  | "collections"
  | "new-arrivals"
  | "offers"
  | "services"
  | "slots"
  | "roster"

const VALID_TABS: ManagerTab[] = [
  "overview",
  "categories",
  "collections",
  "new-arrivals",
  "offers",
  "services",
  "slots",
  "roster",
]

const NAV_ITEMS: {
  id: ManagerTab
  label: string
  icon: React.ReactNode
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <ClipboardList className="h-4 w-4" strokeWidth={1.75} />,
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
]

function resolveTab(value: string | null | undefined): ManagerTab {
  if (value && VALID_TABS.includes(value as ManagerTab)) {
    return value as ManagerTab
  }
  return "overview"
}

function OverviewMetric({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-medium tabular-nums tracking-tight text-ink">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-ink-muted">{sub}</p> : null}
    </div>
  )
}

export default function ManagerDashboard({
  profile,
  overview,
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
  initialTab = "overview",
}: {
  profile: ManagerProfile
  overview: ManagerOverview
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
  initialTab?: ManagerTab
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = resolveTab(searchParams.get("tab") ?? initialTab)

  const setActiveTab = useCallback(
    (tab: ManagerTab) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === "overview") {
        params.delete("tab")
      } else {
        params.set("tab", tab)
      }
      const query = params.toString()
      router.replace(query ? `/manager?${query}` : "/manager", { scroll: false })
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
                <ClipboardList className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                  {profile.storeName}
                </p>
                <h1 className="font-display text-xl font-medium tracking-tight text-ink">
                  Manager dashboard
                </h1>
              </div>
            </div>
          </div>
          <div className="hidden flex-col items-end gap-0.5 text-sm text-ink-muted sm:flex">
            <span className="truncate max-w-[14rem] font-medium text-ink">
              {profile.name || profile.email}
            </span>
            <span className="text-xs uppercase tracking-wide">Store manager</span>
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
            <div className="space-y-8">
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                  Store ops
                </p>
                <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
                  Today at a glance
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
                  Manage shop categories, service menus, booking slots, and staff
                  roster for {profile.storeName}.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <OverviewMetric
                  label="Open bookings"
                  value={overview.openBookingCount.toLocaleString()}
                  sub="Pending or confirmed"
                />
                <OverviewMetric
                  label="Active services"
                  value={overview.activeServiceCount.toLocaleString()}
                  sub={`${overview.serviceCount} total`}
                />
                <OverviewMetric
                  label="Staff on roster"
                  value={overview.staffCount.toLocaleString()}
                />
                <OverviewMetric
                  label="Shop categories"
                  value={overview.categoryCount.toLocaleString()}
                />
                <OverviewMetric
                  label="Collections"
                  value={overview.collectionCount.toLocaleString()}
                />
                <OverviewMetric
                  label="Offer groups"
                  value={overview.offerGroupCount.toLocaleString()}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["roster", "Edit roster"],
                    ["services", "Edit services"],
                    ["slots", "Edit time frames"],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className="inline-flex min-h-10 items-center border border-line bg-surface px-4 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:border-ink/40"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <StoreCategoriesPanel
              key={storeCategories
                .map((category) => `${category.id}:${category.sortOrder}`)
                .join("|")}
              initialCategories={storeCategories}
            />
          )}

          {activeTab === "collections" && (
            <StoreCollectionsPanel
              key={storeCollections
                .map((collection) => `${collection.id}:${collection.sortOrder}`)
                .join("|")}
              initialCollections={storeCollections}
              categoryOptions={collectionCategoryOptions}
            />
          )}

          {activeTab === "new-arrivals" && (
            <StoreNewArrivalsPanel
              key={newArrivalItems
                .map((item) => `${item.id}:${item.sortOrder}`)
                .join("|")}
              initialItems={newArrivalItems}
              productOptions={newArrivalOptions}
              limit={newArrivalLimit}
            />
          )}

          {activeTab === "offers" && (
            <StoreOfferGroupsPanel
              key={offerGroups
                .map((group) => `${group.id}:${group.sortOrder}`)
                .join("|")}
              initialGroups={offerGroups}
            />
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
                .map((frame) => `${frame.id}:${frame.startTime}:${frame.endTime}`)
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
        </main>
      </div>
    </div>
  )
}

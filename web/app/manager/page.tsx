import { Suspense } from "react"
import { redirect } from "next/navigation"
import {
  getManagerOverview,
  getManagerProfile,
} from "@/app/actions/manager"
import { getStoreCategories } from "@/app/actions/store-categories"
import {
  getStoreCollectionCategoryOptions,
  getStoreCollections,
} from "@/app/actions/store-collections"
import {
  getManagedNewArrivals,
  getNewArrivalProductOptions,
} from "@/app/actions/store-new-arrivals"
import { getStoreOfferGroups } from "@/app/actions/store-offer-groups"
import { getStoreRosterBoard } from "@/app/actions/store-roster"
import { getManagedServices } from "@/app/actions/store-services"
import { getTimeFrameBoard } from "@/app/actions/store-timeframes"
import ManagerDashboard from "@/components/manager/ManagerDashboard"

export const dynamic = "force-dynamic"

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

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const profile = await getManagerProfile()
  if (!profile) {
    redirect("/?callbackUrl=/manager")
  }

  const params = await searchParams
  const initialTab = VALID_TABS.includes(params.tab as ManagerTab)
    ? (params.tab as ManagerTab)
    : "overview"

  const [
    overview,
    storeCategories,
    storeCollections,
    collectionCategoryOptions,
    managedNewArrivals,
    newArrivalOptions,
    offerGroups,
    managedServices,
    timeFrameBoard,
    rosterBoard,
  ] = await Promise.all([
    getManagerOverview(),
    getStoreCategories(),
    getStoreCollections(),
    getStoreCollectionCategoryOptions(),
    getManagedNewArrivals(),
    getNewArrivalProductOptions(),
    getStoreOfferGroups(),
    getManagedServices(),
    getTimeFrameBoard("GROOMING"),
    getStoreRosterBoard(undefined, "GROOMING"),
  ])

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted">
          Loading manager dashboard…
        </div>
      }
    >
      <ManagerDashboard
        profile={profile}
        overview={overview}
        storeCategories={storeCategories}
        storeCollections={storeCollections}
        collectionCategoryOptions={collectionCategoryOptions}
        newArrivalItems={managedNewArrivals.items}
        newArrivalOptions={newArrivalOptions}
        newArrivalLimit={managedNewArrivals.limit}
        offerGroups={offerGroups}
        managedServices={managedServices}
        timeFrameBoard={timeFrameBoard}
        rosterBoard={rosterBoard}
        initialTab={initialTab}
      />
    </Suspense>
  )
}

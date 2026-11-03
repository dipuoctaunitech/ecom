import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  getSellerCategories,
  getSellerDeliverySettings,
  getSellerDiscountCodes,
  getSellerOrders,
  getSellerProducts,
  getSellerQrSettings,
} from "@/app/actions/seller"
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
import { canManageStoreCatalog, getStoreMembership } from "@/lib/store"
import { NEW_ARRIVALS_LIMIT } from "@/lib/new-arrivals"
import SellerDashboard from "@/components/seller/SellerDashboard"

export const dynamic = "force-dynamic"

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

export default async function SellerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/")
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== "SELLER") {
    redirect("/")
  }

  const membership = await getStoreMembership(session.user.id)
  if (membership?.role === "MANAGER") {
    redirect("/manager")
  }
  if (membership?.role === "GROOMER") {
    redirect("/groomer")
  }
  if (membership?.role === "DOCTOR") {
    redirect("/doctor")
  }

  const params = await searchParams
  const initialTab = VALID_TABS.includes(params.tab as SellerTab)
    ? (params.tab as SellerTab)
    : "products"

  const isStoreCatalogManager = await canManageStoreCatalog(session.user.id)

  const emptyNewArrivals = {
    items: [] as Awaited<ReturnType<typeof getManagedNewArrivals>>["items"],
    isCurated: false,
    limit: NEW_ARRIVALS_LIMIT,
  }

  const [
    products,
    orders,
    deliverySettings,
    discountCodes,
    qrSettings,
    categories,
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
    getSellerProducts(),
    getSellerOrders(),
    getSellerDeliverySettings(),
    getSellerDiscountCodes(),
    getSellerQrSettings(),
    getSellerCategories(),
    isStoreCatalogManager ? getStoreCategories() : Promise.resolve([]),
    isStoreCatalogManager ? getStoreCollections() : Promise.resolve([]),
    isStoreCatalogManager
      ? getStoreCollectionCategoryOptions()
      : Promise.resolve([]),
    isStoreCatalogManager
      ? getManagedNewArrivals()
      : Promise.resolve(emptyNewArrivals),
    isStoreCatalogManager
      ? getNewArrivalProductOptions()
      : Promise.resolve([]),
    isStoreCatalogManager ? getStoreOfferGroups() : Promise.resolve([]),
    isStoreCatalogManager ? getManagedServices() : Promise.resolve([]),
    isStoreCatalogManager
      ? getTimeFrameBoard("GROOMING")
      : Promise.resolve(null),
    isStoreCatalogManager
      ? getStoreRosterBoard(undefined, "GROOMING")
      : Promise.resolve(null),
  ])

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted">
          Loading seller dashboard…
        </div>
      }
    >
      <SellerDashboard
        products={products}
        orders={orders}
        deliverySettings={deliverySettings}
        discountCodes={discountCodes}
        qrSettings={qrSettings}
        categories={categories}
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
        canManageStoreCategories={isStoreCatalogManager}
        initialTab={initialTab}
      />
    </Suspense>
  )
}

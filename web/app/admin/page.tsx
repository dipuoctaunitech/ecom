import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  getAdminAnalytics,
  getAdminCategories,
  getAdminCustomers,
  getAdminDeliveryBoys,
  getAdminDiscountCodes,
  getAdminOrders,
  getAdminProducts,
  getAdminSellers,
  getAdminStoreStaff,
  getAdminSupportTickets,
  getStoreSettings,
} from "@/app/actions/admin"
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
import { getManagedServices } from "@/app/actions/store-services"
import { getTimeFrameBoard } from "@/app/actions/store-timeframes"
import { getStoreRosterBoard } from "@/app/actions/store-roster"
import AdminDashboard from "@/components/admin/AdminDashboard"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/")
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/")
  }

  const [
    sellerSetup,
    deliveryBoys,
    staff,
    analytics,
    initialOrders,
    products,
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
    customers,
    tickets,
    discountCodes,
    storeSettings,
  ] = await Promise.all([
    getAdminSellers(),
    getAdminDeliveryBoys(),
    getAdminStoreStaff(),
    getAdminAnalytics(),
    getAdminOrders(1, 10),
    getAdminProducts(),
    getAdminCategories(),
    getStoreCategories(),
    getStoreCollections(),
    getStoreCollectionCategoryOptions(),
    getManagedNewArrivals(),
    getNewArrivalProductOptions(),
    getStoreOfferGroups(),
    getManagedServices(),
    getTimeFrameBoard("GROOMING"),
    getStoreRosterBoard(undefined, "GROOMING"),
    getAdminCustomers(),
    getAdminSupportTickets(),
    getAdminDiscountCodes(),
    getStoreSettings(),
  ])

  return (
    <AdminDashboard
      sellers={sellerSetup.sellers}
      buyers={sellerSetup.buyers}
      deliveryBoys={deliveryBoys}
      staff={staff}
      analytics={analytics}
      initialOrders={initialOrders}
      products={products}
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
      customers={customers}
      tickets={tickets}
      discountCodes={discountCodes}
      storeSettings={storeSettings}
    />
  )
}

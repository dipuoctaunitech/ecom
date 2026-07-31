import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  getSellerDeliverySettings,
  getSellerDiscountCodes,
  getSellerOrders,
  getSellerProducts,
} from "@/app/actions/seller"
import SellerDashboard from "@/components/seller/SellerDashboard"

export const dynamic = "force-dynamic"

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

  const params = await searchParams
  const initialTab = VALID_TABS.includes(params.tab as SellerTab)
    ? (params.tab as SellerTab)
    : "products"

  const [products, orders, deliverySettings, discountCodes] = await Promise.all(
    [
      getSellerProducts(),
      getSellerOrders(),
      getSellerDeliverySettings(),
      getSellerDiscountCodes(),
    ]
  )

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
        initialTab={initialTab}
      />
    </Suspense>
  )
}

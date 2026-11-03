import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getCustomerDashboard } from "@/app/actions/account"
import { getBuyerOrders } from "@/app/actions/order"
import BuyerDashboard from "@/components/buyer/BuyerDashboard"

export const dynamic = "force-dynamic"

type BuyerTab = "overview" | "profile" | "pets" | "orders" | "bookings"

const VALID_TABS: BuyerTab[] = [
  "overview",
  "profile",
  "pets",
  "orders",
  "bookings",
]

function resolveTab(value: string | string[] | undefined): BuyerTab {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw && VALID_TABS.includes(raw as BuyerTab)) {
    return raw as BuyerTab
  }
  return "overview"
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/?callbackUrl=/account")
  }

  const params = await searchParams
  const initialTab = resolveTab(params.tab)

  const [dashboard, orders] = await Promise.all([
    getCustomerDashboard(),
    getBuyerOrders(),
  ])

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted">
          Loading account…
        </div>
      }
    >
      <BuyerDashboard
        dashboard={dashboard}
        orders={orders}
        initialTab={initialTab}
      />
    </Suspense>
  )
}

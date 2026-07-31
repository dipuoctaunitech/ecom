import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getBuyerOrders } from "@/app/actions/order"
import BuyerOrders from "@/components/buyer/BuyerOrders"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/?callbackUrl=/orders")
  }

  const orders = await getBuyerOrders()

  return <BuyerOrders initialOrders={orders} />
}

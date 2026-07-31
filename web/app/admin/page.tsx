import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  getAdminAnalytics,
  getAdminCategories,
  getAdminCustomers,
  getAdminDiscountCodes,
  getAdminOrders,
  getAdminProducts,
  getAdminSupportTickets,
  getStoreSettings,
} from "@/app/actions/admin"
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
    users,
    analytics,
    initialOrders,
    products,
    categories,
    customers,
    tickets,
    discountCodes,
    storeSettings,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    }),
    getAdminAnalytics(),
    getAdminOrders(1, 10),
    getAdminProducts(),
    getAdminCategories(),
    getAdminCustomers(),
    getAdminSupportTickets(),
    getAdminDiscountCodes(),
    getStoreSettings(),
  ])

  return (
    <AdminDashboard
      users={users}
      analytics={analytics}
      initialOrders={initialOrders}
      products={products}
      categories={categories}
      customers={customers}
      tickets={tickets}
      discountCodes={discountCodes}
      storeSettings={storeSettings}
    />
  )
}

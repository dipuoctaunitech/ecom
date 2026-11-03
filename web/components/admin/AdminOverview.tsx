import {
  AlertTriangle,
  IndianRupee,
  Megaphone,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react"
import type { AdminAnalytics } from "@/app/actions/admin"
import { formatINR } from "@/lib/money"

type MetricCardProps = {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  alert?: boolean
}

function MetricCard({ label, value, sub, icon, alert }: MetricCardProps) {
  return (
    <div
      className={`border p-6 ${
        alert
          ? "border-amber-300 bg-amber-50"
          : "border-line bg-surface-elevated"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
            {label}
          </p>
          <p className="mt-3 font-display text-3xl font-medium tabular-nums tracking-tight text-ink">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-ink-muted">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface text-ink-muted">
          {icon}
        </div>
      </div>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
}

export default function AdminOverview({ analytics }: { analytics: AdminAnalytics }) {
  const metrics = [
    {
      label: "Total Revenue",
      value: formatINR(analytics.totalRevenue),
      sub: `${analytics.totalOrders} orders`,
      icon: <IndianRupee className="h-4 w-4" strokeWidth={1.75} />,
    },
    {
      label: "Avg. Order Value",
      value: formatINR(analytics.averageOrderValue),
      icon: <TrendingUp className="h-4 w-4" strokeWidth={1.75} />,
    },
    {
      label: "Total Users",
      value: analytics.totalUsers.toLocaleString(),
      sub: `${analytics.totalSellers} sellers`,
      icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
    },
    {
      label: "Low Stock Alerts",
      value: analytics.lowStockCount.toLocaleString(),
      icon: <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />,
      alert: analytics.lowStockCount > 0,
    },
    {
      label: "Open Tickets",
      value: analytics.openTickets.toLocaleString(),
      icon: <Package className="h-4 w-4" strokeWidth={1.75} />,
    },
    {
      label: "Active Promotions",
      value: analytics.activePromotions.toLocaleString(),
      icon: <Megaphone className="h-4 w-4" strokeWidth={1.75} />,
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Analytics & Reporting
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          KPIs across revenue, orders, inventory, and support.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h3 className="font-display text-lg font-medium text-ink">
            Top Selling Products
          </h3>
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Units
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-elevated">
                {analytics.topProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-10 text-center text-sm text-ink-muted"
                    >
                      No sales data yet.
                    </td>
                  </tr>
                ) : (
                  analytics.topProducts.map((product) => (
                    <tr key={product.productId}>
                      <td className="px-4 py-3 text-sm text-ink">
                        {product.title}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-ink-muted">
                        {product.unitsSold}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums font-medium text-ink">
                        {formatINR(product.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="font-display text-lg font-medium text-ink">
            Orders by Status
          </h3>
          <ul className="mt-4 space-y-2 border border-line bg-surface-elevated p-4">
            {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
              <li
                key={status}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-ink-muted">
                  <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {STATUS_LABELS[status] ?? status}
                </span>
                <span className="font-medium tabular-nums text-ink">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

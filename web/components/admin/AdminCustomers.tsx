'use client'

import { Fragment, useState, useTransition } from "react"
import {
  getCustomerOrders,
  updateSupportTicketStatus,
  type AdminCustomer,
  type AdminSupportTicket,
} from "@/app/actions/admin"
import { TicketStatus } from "@prisma/client"

const TICKET_STATUS_OPTIONS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]

const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-amber-50 text-amber-800",
  IN_PROGRESS: "bg-blue-50 text-blue-800",
  RESOLVED: "bg-emerald-50 text-emerald-800",
  CLOSED: "bg-surface text-ink-muted",
}

type CustomerOrder = Awaited<ReturnType<typeof getCustomerOrders>>[number]

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso))
}

export default function AdminCustomers({
  customers: initialCustomers,
  tickets: initialTickets,
}: {
  customers: AdminCustomer[]
  tickets: AdminSupportTicket[]
}) {
  const [customers] = useState(initialCustomers)
  const [tickets, setTickets] = useState(initialTickets)
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(
    null
  )
  const [customerOrders, setCustomerOrders] = useState<
    Record<string, CustomerOrder[]>
  >({})
  const [loadingOrders, setLoadingOrders] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const toggleCustomer = (customerId: string) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null)
      return
    }

    setExpandedCustomerId(customerId)

    if (!customerOrders[customerId]) {
      setLoadingOrders(customerId)
      startTransition(async () => {
        try {
          const orders = await getCustomerOrders(customerId)
          setCustomerOrders((prev) => ({ ...prev, [customerId]: orders }))
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to load order history"
          )
        } finally {
          setLoadingOrders(null)
        }
      })
    }
  }

  const handleTicketStatusChange = (ticketId: string, status: TicketStatus) => {
    setError("")
    startTransition(async () => {
      try {
        await updateSupportTicketStatus(ticketId, status)
        setTickets((current) =>
          current.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, status } : ticket
          )
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update ticket status"
        )
      }
    })
  }

  const highValueCustomers = customers.filter((c) => c.totalSpent >= 100)

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Customer Relationship Management
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Customer profiles, purchase history, support tickets, and segments.
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {highValueCustomers.length > 0 && (
        <div className="mb-8 border border-line bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            High-Value Segment ($100+ lifetime spend)
          </p>
          <p className="mt-2 text-sm text-ink">
            {highValueCustomers.length} customer
            {highValueCustomers.length === 1 ? "" : "s"}:{" "}
            {highValueCustomers
              .map((c) => c.name || c.email || "Unknown")
              .join(", ")}
          </p>
        </div>
      )}

      <section className="mb-10">
        <h3 className="font-display text-lg font-medium text-ink">
          Customer Profiles
        </h3>
        <div className="mt-4 overflow-x-auto border border-line bg-surface-elevated">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Orders
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Total Spent
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Last Order
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  History
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-ink-muted"
                  >
                    No buyer accounts yet.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <Fragment key={customer.id}>
                    <tr className="transition-colors hover:bg-surface/60">
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-ink">
                          {customer.name || "Unnamed"}
                        </div>
                        <div className="mt-0.5 text-sm text-ink-muted">
                          {customer.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-ink">
                        {customer.orderCount}
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums font-medium text-ink">
                        ${customer.totalSpent.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-sm text-ink-muted">
                        {customer.lastOrderAt
                          ? formatDate(customer.lastOrderAt)
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleCustomer(customer.id)}
                          className="text-xs font-medium uppercase tracking-wide text-ink underline-offset-2 hover:underline"
                        >
                          {expandedCustomerId === customer.id
                            ? "Hide"
                            : "View"}{" "}
                          history
                        </button>
                      </td>
                    </tr>
                    {expandedCustomerId === customer.id && (
                      <tr>
                        <td colSpan={5} className="bg-surface px-5 py-4">
                          {loadingOrders === customer.id ? (
                            <p className="text-sm text-ink-muted">
                              Loading orders…
                            </p>
                          ) : (customerOrders[customer.id]?.length ?? 0) ===
                            0 ? (
                            <p className="text-sm text-ink-muted">
                              No purchase history.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {customerOrders[customer.id]?.map((order) => (
                                <li
                                  key={order.id}
                                  className="border border-line bg-surface-elevated p-3 text-sm"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-medium text-ink">
                                      {formatDate(order.createdAt)} · $
                                      {order.totalAmount.toFixed(2)}
                                    </span>
                                    <span className="text-xs uppercase tracking-wide text-ink-muted">
                                      {order.status}
                                    </span>
                                  </div>
                                  <ul className="mt-2 space-y-0.5 text-ink-muted">
                                    {order.items.map((item, idx) => (
                                      <li key={idx}>
                                        {item.title} × {item.quantity}
                                      </li>
                                    ))}
                                  </ul>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-medium text-ink">
          Support Tickets
        </h3>
        <div className="mt-4 overflow-x-auto border border-line bg-surface-elevated">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Subject
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Priority
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm text-ink-muted"
                  >
                    No support tickets.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition-colors hover:bg-surface/60"
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-ink">
                        {ticket.user.name || "Unnamed"}
                      </div>
                      <div className="mt-0.5 text-sm text-ink-muted">
                        {ticket.user.email}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-ink">
                        {ticket.subject}
                      </div>
                      <div className="mt-1 max-w-md truncate text-sm text-ink-muted">
                        {ticket.message}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-ink-muted">
                      {ticket.priority}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={ticket.status}
                        onChange={(e) =>
                          handleTicketStatusChange(
                            ticket.id,
                            e.target.value as TicketStatus
                          )
                        }
                        disabled={isPending}
                        className={`h-9 min-w-[130px] border border-line px-3 text-xs font-medium uppercase tracking-wide focus:border-ink focus:outline-none disabled:opacity-50 ${TICKET_STATUS_STYLES[ticket.status]}`}
                      >
                        {TICKET_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

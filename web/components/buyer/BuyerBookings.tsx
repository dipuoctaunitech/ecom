"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"
import type { CustomerBooking } from "@/app/actions/account"
import { cancelCustomerBooking } from "@/app/actions/booking"
import { formatINR } from "@/lib/money"
import type { BookingStatus } from "@prisma/client"

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-800 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-surface text-ink-muted ring-line",
  NO_SHOW: "bg-orange-50 text-orange-800 ring-orange-200",
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

function formatVertical(vertical: string) {
  if (vertical === "GROOMING") return "Grooming"
  if (vertical === "CLINIC") return "Clinic"
  return vertical
}

function canCancel(booking: CustomerBooking) {
  return (
    (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
    new Date(booking.startAt).getTime() > Date.now()
  )
}

export default function BuyerBookings({
  bookings: initialBookings,
}: {
  bookings: CustomerBooking[]
}) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    setBookings(initialBookings)
  }, [initialBookings])

  const now = Date.now()
  const upcoming = bookings.filter(
    (b) =>
      new Date(b.startAt).getTime() >= now &&
      (b.status === "PENDING" || b.status === "CONFIRMED")
  )
  const past = bookings.filter((b) => !upcoming.some((u) => u.id === b.id))

  function handleCancel(bookingId: string) {
    if (
      !window.confirm(
        "Cancel this appointment? The time slot will open for others."
      )
    ) {
      return
    }
    setError("")
    setCancellingId(bookingId)
    startTransition(async () => {
      try {
        await cancelCustomerBooking(bookingId)
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: "CANCELLED" as const } : b
          )
        )
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not cancel")
      } finally {
        setCancellingId(null)
      }
    })
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
            Bookings
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted sm:mt-2">
            Grooming and clinic appointments across namma pets Club.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link
            href="/grooming"
            className="inline-flex h-11 items-center justify-center border border-line bg-surface-elevated px-3 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:border-ink/30 sm:h-10 sm:bg-surface sm:px-4"
          >
            Book grooming
          </Link>
          <Link
            href="/clinic"
            className="inline-flex h-11 items-center justify-center bg-ink px-3 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 sm:h-10 sm:px-4"
          >
            Book clinic
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {bookings.length === 0 ? (
        <div className="border border-line bg-surface-elevated px-4 py-12 text-center sm:bg-surface sm:px-6 sm:py-16">
          <CalendarDays
            className="mx-auto h-8 w-8 text-ink-muted"
            strokeWidth={1.5}
          />
          <p className="mt-4 text-sm text-ink-muted">
            No appointments yet.
          </p>
          <Link
            href="/grooming"
            className="mt-6 inline-flex h-11 w-full max-w-xs items-center justify-center bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Browse grooming
          </Link>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Upcoming
              </h3>
              <ul className="mt-3 space-y-3">
                {upcoming.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={handleCancel}
                    cancelling={cancellingId === booking.id}
                    disabled={isPending}
                  />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                History
              </h3>
              <ul className="mt-3 space-y-3">
                {past.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={handleCancel}
                    cancelling={cancellingId === booking.id}
                    disabled={isPending}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function BookingCard({
  booking,
  onCancel,
  cancelling,
  disabled,
}: {
  booking: CustomerBooking
  onCancel: (id: string) => void
  cancelling: boolean
  disabled: boolean
}) {
  const showCancel = canCancel(booking)

  return (
    <li className="border border-line bg-surface-elevated p-3 sm:bg-surface sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-medium text-ink">
              {booking.serviceName}
            </p>
            <span
              className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[booking.status]}`}
            >
              {booking.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {formatVertical(booking.serviceVertical)} · {formatWhen(booking.startAt)}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            With {booking.staffName}
            {booking.staffTitle ? ` (${booking.staffTitle})` : ""} ·{" "}
            {booking.storeName}
          </p>
          {booking.notes ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Note: {booking.notes}
            </p>
          ) : null}
          {showCancel ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onCancel(booking.id)}
              className="mt-3 inline-flex h-9 items-center border border-line px-3 text-xs font-medium uppercase tracking-wide text-ink-muted transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel booking"}
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-baseline justify-between gap-3 border-t border-line pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
          <p className="font-display text-base font-medium tabular-nums text-ink">
            {formatINR(booking.servicePrice)}
          </p>
          {booking.serviceLoyaltyPoints > 0 ? (
            <p className="text-xs text-ink-muted sm:mt-0.5">
              +{booking.serviceLoyaltyPoints} pts
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}

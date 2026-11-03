"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Stethoscope,
  Users,
} from "lucide-react"
import {
  getDoctorDayBoard,
  updateDoctorBookingStatus,
  type DoctorDayBoard,
} from "@/app/actions/doctor"
import { DAY_LABELS, formatSlotLabel, todayDateKey } from "@/lib/roster"
import type { BookingStatus } from "@prisma/client"

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-800 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-surface text-ink-muted ring-line",
  NO_SHOW: "bg-orange-50 text-orange-800 ring-orange-200",
}

const STATUS_ACTIONS: { status: BookingStatus; label: string }[] = [
  { status: "CONFIRMED", label: "Confirm" },
  { status: "COMPLETED", label: "Done" },
  { status: "NO_SHOW", label: "No-show" },
  { status: "CANCELLED", label: "Cancel" },
]

function formatDayHeading(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function availabilityLabel(board: DoctorDayBoard) {
  const { availability } = board
  if (availability.status === "OFF") return "Off today"
  if (availability.status === "UNROSTERED") return "Not on the roster"
  const hours = `${availability.startTime}–${availability.endTime}`
  if (availability.exceptionType === "CUSTOM_HOURS") {
    return `${hours} · custom hours`
  }
  return hours
}

export default function DoctorDashboard({
  initialBoard,
}: {
  initialBoard: DoctorDayBoard
}) {
  const [board, setBoard] = useState(initialBoard)
  const [dateKey, setDateKey] = useState(initialBoard.dateKey)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  function refresh(nextDate = dateKey) {
    startTransition(async () => {
      try {
        const next = await getDoctorDayBoard(nextDate)
        setBoard(next)
        setDateKey(next.dateKey)
        setError("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedule")
      }
    })
  }

  function handleDateChange(value: string) {
    setDateKey(value)
    setSaved("")
    refresh(value)
  }

  function handleStatus(bookingId: string, status: BookingStatus) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await updateDoctorBookingStatus({ bookingId, status })
        const next = await getDoctorDayBoard(dateKey)
        setBoard(next)
        setSaved("Booking updated.")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  const { profile, availability, summary, bookings, customers, weekly } = board
  const isToday = dateKey === todayDateKey()

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-surface-elevated">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to store
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-line bg-surface">
                <Stethoscope className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
                  {profile.storeName}
                </p>
                <h1 className="font-display text-xl font-medium tracking-tight text-ink">
                  Clinic schedule
                </h1>
              </div>
            </div>
          </div>
          <div className="hidden flex-col items-end gap-0.5 text-sm text-ink-muted sm:flex">
            <span className="truncate max-w-[14rem] font-medium text-ink">
              {profile.name}
            </span>
            <span className="text-xs">{profile.title || "Doctor"}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 border border-line bg-surface-elevated p-6 sm:flex-row sm:items-end sm:justify-between md:p-8">
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              {isToday ? "Today" : "Selected day"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
              {formatDayHeading(dateKey)}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {availabilityLabel(board)}
              {availability.exceptionNote
                ? ` · ${availability.exceptionNote}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="font-medium text-ink">Date</span>
              <input
                type="date"
                value={dateKey}
                onChange={(event) => handleDateChange(event.target.value)}
                className="mt-1 block w-full border border-line bg-surface px-3 py-2 text-sm text-ink sm:w-auto"
              />
            </label>
            <button
              type="button"
              onClick={() => handleDateChange(todayDateKey())}
              disabled={isPending || isToday}
              className="border border-line px-3 py-2 text-sm font-medium text-ink-muted hover:border-ink/30 hover:text-ink disabled:opacity-50"
            >
              Jump to today
            </button>
          </div>
        </div>

        {(error || saved) && (
          <div
            className={`border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || saved}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Clock3 className="h-4 w-4" strokeWidth={1.75} />}
            label="Availability"
            value={
              availability.status === "WORKING"
                ? "On shift"
                : availability.status === "OFF"
                  ? "Off"
                  : "Unrostered"
            }
          />
          <StatCard
            icon={<CalendarDays className="h-4 w-4" strokeWidth={1.75} />}
            label="Bookings"
            value={String(summary.bookingCount)}
          />
          <StatCard
            icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
            label="Patients"
            value={String(summary.customerCount)}
          />
          <StatCard
            icon={<Stethoscope className="h-4 w-4" strokeWidth={1.75} />}
            label="Still ahead"
            value={String(summary.upcomingCount)}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section className="border border-line bg-surface-elevated p-6 md:p-8">
            <div className="mb-6">
              <h3 className="font-display text-xl font-medium tracking-tight text-ink">
                Appointments
              </h3>
              <p className="mt-1 text-sm text-ink-muted">
                Your clinic visits for this day. Update status as patients arrive.
              </p>
            </div>

            {bookings.length === 0 ? (
              <div className="border border-line bg-surface px-6 py-14 text-center">
                <CalendarDays
                  className="mx-auto h-8 w-8 text-ink-muted"
                  strokeWidth={1.5}
                />
                <p className="mt-4 text-sm text-ink-muted">
                  No appointments on this day.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {bookings.map((booking) => (
                  <li key={booking.id} className="py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-base font-medium tabular-nums text-ink">
                            {formatSlotLabel(booking.startAt)}–
                            {formatSlotLabel(booking.endAt)}
                          </p>
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${STATUS_STYLES[booking.status]}`}
                          >
                            {booking.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-ink">
                          {booking.customerName}
                        </p>
                        <p className="text-sm text-ink-muted">
                          {booking.serviceName} · {booking.serviceDurationMins}{" "}
                          min
                          {booking.customerEmail
                            ? ` · ${booking.customerEmail}`
                            : ""}
                        </p>
                        {booking.notes ? (
                          <p className="mt-2 text-sm text-ink-muted">
                            Note: {booking.notes}
                          </p>
                        ) : null}
                      </div>

                      {booking.status !== "CANCELLED" &&
                      booking.status !== "COMPLETED" ? (
                        <div className="flex flex-wrap gap-2">
                          {STATUS_ACTIONS.filter(
                            (action) => action.status !== booking.status
                          ).map((action) => (
                            <button
                              key={action.status}
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleStatus(booking.id, action.status)
                              }
                              className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:border-ink disabled:opacity-50"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-8">
            <section className="border border-line bg-surface-elevated p-6 md:p-8">
              <div className="mb-6">
                <h3 className="font-display text-xl font-medium tracking-tight text-ink">
                  Patients today
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  People scheduled with you for this date.
                </p>
              </div>

              {customers.length === 0 ? (
                <p className="text-sm text-ink-muted">No patients yet.</p>
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {customers.map((customer) => (
                    <li
                      key={customer.customerEmail || customer.customerName}
                      className="py-4"
                    >
                      <p className="font-medium text-ink">
                        {customer.customerName}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatSlotLabel(customer.nextStartAt)}
                        {customer.bookingCount > 1
                          ? ` · ${customer.bookingCount} visits`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {customer.services.join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border border-line bg-surface-elevated p-6 md:p-8">
              <div className="mb-6">
                <h3 className="font-display text-xl font-medium tracking-tight text-ink">
                  Weekly availability
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Your usual hours. Managers edit the roster template.
                </p>
              </div>

              {weekly.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No weekly hours set yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {DAY_LABELS.map((label, dayOfWeek) => {
                    const row = weekly.find((w) => w.dayOfWeek === dayOfWeek)
                    const isSelectedDay =
                      dayOfWeek ===
                      new Date(`${dateKey}T12:00:00.000Z`).getUTCDay()
                    return (
                      <li
                        key={label}
                        className={`flex items-center justify-between border px-3 py-2 text-sm ${
                          isSelectedDay
                            ? "border-ink bg-ink text-white"
                            : "border-line bg-surface text-ink"
                        }`}
                      >
                        <span className="font-medium">{label}</span>
                        <span
                          className={
                            isSelectedDay ? "text-white/80" : "text-ink-muted"
                          }
                        >
                          {row ? `${row.startTime}–${row.endTime}` : "Off"}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="border border-line bg-surface-elevated px-5 py-4">
      <div className="flex items-center gap-2 text-ink-muted">
        {icon}
        <span className="text-xs font-medium uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
        {value}
      </p>
    </div>
  )
}

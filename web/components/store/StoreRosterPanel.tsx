"use client"

import { useMemo, useState, useTransition } from "react"
import { CalendarDays, Clock3, Users } from "lucide-react"
import {
  clearWeeklyRosterDay,
  getStoreRosterBoard,
  reassignBooking,
  setDayAssignment,
  setStaffServices,
  setWeeklyRosterDay,
  updateBookingStatus,
  type DayBookingRow,
  type DayStaffStatus,
  type RosterServiceRow,
  type RosterStaffRow,
  type StoreRosterBoard,
} from "@/app/actions/store-roster"
import { DAY_LABELS, formatSlotLabel, todayDateKey } from "@/lib/roster"
import type { BookingStatus, ServiceVertical } from "@prisma/client"

type PanelTab = "today" | "weekly" | "team"

export default function StoreRosterPanel({
  initialBoard,
  initialVertical,
  vertical: verticalProp,
}: {
  initialBoard: StoreRosterBoard
  initialVertical?: ServiceVertical
  /** Alias for initialVertical (older call sites). */
  vertical?: ServiceVertical
}) {
  const startingVertical = verticalProp ?? initialVertical ?? "GROOMING"
  const [vertical, setVertical] = useState<ServiceVertical>(startingVertical)
  const [board, setBoard] = useState(initialBoard)
  const [panelTab, setPanelTab] = useState<PanelTab>("today")
  const [dateKey, setDateKey] = useState(initialBoard.dateKey)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")
  const [customDraft, setCustomDraft] = useState<
    Record<string, { startTime: string; endTime: string; note: string }>
  >({})

  const roleLabel = vertical === "GROOMING" ? "groomer" : "doctor"
  const roleLabelPlural = vertical === "GROOMING" ? "groomers" : "doctors"

  const activeStaff = useMemo(
    () => board.staff.filter((member) => member.isActive),
    [board.staff]
  )

  function refresh(nextDate = dateKey, nextVertical = vertical) {
    startTransition(async () => {
      try {
        const next = await getStoreRosterBoard(nextDate, nextVertical)
        setBoard(next)
        setDateKey(next.dateKey)
        setVertical(nextVertical)
        setError("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roster")
      }
    })
  }

  function switchVertical(nextVertical: ServiceVertical) {
    if (nextVertical === vertical) return
    setCustomDraft({})
    setSaved("")
    setError("")
    refresh(dateKey, nextVertical)
  }

  function run(
    message: string,
    action: () => Promise<unknown>,
    after?: () => void
  ) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await action()
        const next = await getStoreRosterBoard(dateKey, vertical)
        setBoard(next)
        after?.()
        setSaved(message)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  function handleDateChange(value: string) {
    setDateKey(value)
    refresh(value)
  }

  function assignDay(
    staffId: string,
    mode: "WORKING" | "OFF" | "CUSTOM",
    draft?: { startTime: string; endTime: string; note: string }
  ) {
    run(
      mode === "OFF"
        ? "Marked off for this day."
        : mode === "CUSTOM"
          ? "Custom hours saved."
          : "Using weekly roster for this day.",
      () =>
        setDayAssignment({
          staffId,
          dateKey,
          mode,
          startTime: draft?.startTime,
          endTime: draft?.endTime,
          note: draft?.note,
        })
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
          Store ops
        </p>
        <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
          {vertical === "GROOMING" ? "Grooming" : "Clinic"} roster
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Same day board for grooming and clinic — assign who works, set the
          weekly template, and move bookings between {roleLabelPlural}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "GROOMING", label: "Grooming" },
            { id: "CLINIC", label: "Clinic" },
          ] as const
        ).map((item) => {
          const active = vertical === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchVertical(item.id)}
              className={`border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-muted hover:border-ink/30 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "today", label: "Today’s board", icon: CalendarDays },
            { id: "weekly", label: "Weekly template", icon: Clock3 },
            { id: "team", label: "Team & services", icon: Users },
          ] as const
        ).map((item) => {
          const Icon = item.icon
          const active = panelTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPanelTab(item.id)}
              className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-muted hover:border-ink/30 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </button>
          )
        })}
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

      {panelTab === "today" && (
        <TodayBoard
          dateKey={dateKey}
          dayStatus={board.dayStatus}
          dayBookings={board.dayBookings}
          activeStaff={activeStaff}
          isPending={isPending}
          roleLabel={roleLabel}
          customDraft={customDraft}
          onDateChange={handleDateChange}
          onJumpToday={() => handleDateChange(todayDateKey())}
          onAssign={assignDay}
          onCustomDraftChange={(staffId, draft) =>
            setCustomDraft((current) => ({ ...current, [staffId]: draft }))
          }
          onReassign={(bookingId, staffId) =>
            run("Booking reassigned.", () =>
              reassignBooking({ bookingId, staffId })
            )
          }
          onStatus={(bookingId, status) =>
            run("Booking updated.", () =>
              updateBookingStatus({ bookingId, status })
            )
          }
        />
      )}

      {panelTab === "weekly" && (
        <WeeklyTemplate
          staff={activeStaff}
          isPending={isPending}
          onSave={(staffId, dayOfWeek, startTime, endTime) =>
            run("Weekly roster saved.", () =>
              setWeeklyRosterDay({
                staffId,
                dayOfWeek,
                startTime,
                endTime,
              })
            )
          }
          onClear={(staffId, dayOfWeek) =>
            run("Day cleared from weekly roster.", () =>
              clearWeeklyRosterDay({ staffId, dayOfWeek })
            )
          }
        />
      )}

      {panelTab === "team" && (
        <TeamServices
          staff={activeStaff}
          services={board.services.filter((s) => s.isActive)}
          isPending={isPending}
          roleLabel={roleLabel}
          onSave={(staffId, serviceIds) =>
            run("Service assignments saved.", () =>
              setStaffServices({ staffId, serviceIds })
            )
          }
        />
      )}
    </div>
  )
}

function TodayBoard({
  dateKey,
  dayStatus,
  dayBookings,
  activeStaff,
  isPending,
  roleLabel,
  customDraft,
  onDateChange,
  onJumpToday,
  onAssign,
  onCustomDraftChange,
  onReassign,
  onStatus,
}: {
  dateKey: string
  dayStatus: DayStaffStatus[]
  dayBookings: DayBookingRow[]
  activeStaff: RosterStaffRow[]
  isPending: boolean
  roleLabel: string
  customDraft: Record<
    string,
    { startTime: string; endTime: string; note: string }
  >
  onDateChange: (value: string) => void
  onJumpToday: () => void
  onAssign: (
    staffId: string,
    mode: "WORKING" | "OFF" | "CUSTOM",
    draft?: { startTime: string; endTime: string; note: string }
  ) => void
  onCustomDraftChange: (
    staffId: string,
    draft: { startTime: string; endTime: string; note: string }
  ) => void
  onReassign: (bookingId: string, staffId: string) => void
  onStatus: (bookingId: string, status: BookingStatus) => void
}) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block text-sm">
          <span className="font-medium text-ink">Date</span>
          <input
            type="date"
            value={dateKey}
            onChange={(event) => onDateChange(event.target.value)}
            className="mt-1 block w-full border border-line bg-surface px-3 py-2 text-sm text-ink sm:w-auto"
          />
        </label>
        <button
          type="button"
          onClick={onJumpToday}
          disabled={isPending}
          className="border border-line px-3 py-2 text-sm font-medium text-ink-muted hover:border-ink/30 hover:text-ink disabled:opacity-50"
        >
          Jump to today
        </button>
      </div>

      <section>
        <h3 className="font-display text-lg font-medium text-ink">
          Who’s on
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Set each {roleLabel} for this date. Working uses the weekly template
          unless you set custom hours.
        </p>

        {dayStatus.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No active {roleLabel}s yet.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {dayStatus.map((row) => {
              const draft = customDraft[row.staffId] ?? {
                startTime: row.startTime ?? "09:00",
                endTime: row.endTime ?? "17:00",
                note: row.exceptionNote ?? "",
              }
              return (
                <li key={row.staffId} className="py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-display text-base font-medium text-ink">
                        {row.name}
                      </p>
                      {row.title ? (
                        <p className="text-sm text-highlight">{row.title}</p>
                      ) : null}
                      <p className="mt-2 text-sm text-ink-muted">
                        {row.status === "WORKING" &&
                          `${row.startTime}–${row.endTime}${
                            row.exceptionType === "CUSTOM_HOURS"
                              ? " · custom"
                              : ""
                          }`}
                        {row.status === "OFF" && "Off today"}
                        {row.status === "UNROSTERED" &&
                          "No weekly hours for this weekday"}
                        {" · "}
                        {row.bookingCount} booking
                        {row.bookingCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onAssign(row.staffId, "WORKING")}
                        className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:border-ink disabled:opacity-50"
                      >
                        On (weekly)
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onAssign(row.staffId, "OFF")}
                        className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:border-ink disabled:opacity-50"
                      >
                        Off
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <label className="text-xs text-ink-muted sm:col-span-1">
                      Start
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(event) =>
                          onCustomDraftChange(row.staffId, {
                            ...draft,
                            startTime: event.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                      />
                    </label>
                    <label className="text-xs text-ink-muted sm:col-span-1">
                      End
                      <input
                        type="time"
                        value={draft.endTime}
                        onChange={(event) =>
                          onCustomDraftChange(row.staffId, {
                            ...draft,
                            endTime: event.target.value,
                          })
                        }
                        className="mt-1 block w-full border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                      />
                    </label>
                    <label className="text-xs text-ink-muted sm:col-span-1">
                      Note
                      <input
                        type="text"
                        value={draft.note}
                        onChange={(event) =>
                          onCustomDraftChange(row.staffId, {
                            ...draft,
                            note: event.target.value,
                          })
                        }
                        placeholder="Optional"
                        className="mt-1 block w-full border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                      />
                    </label>
                    <div className="flex items-end sm:col-span-1">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onAssign(row.staffId, "CUSTOM", draft)}
                        className="w-full border border-ink bg-ink px-3 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
                      >
                        Save custom
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-display text-lg font-medium text-ink">
          Day’s bookings
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Reassign or cancel appointments. Cancelling frees the slot for other
          customers.
        </p>

        {dayBookings.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">No bookings on this date.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {dayBookings.map((booking) => {
              const locked =
                booking.status === "CANCELLED" ||
                booking.status === "COMPLETED"
              return (
              <li
                key={booking.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {formatSlotLabel(booking.startAt)}–{formatSlotLabel(booking.endAt)}{" "}
                    · {booking.serviceName}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {booking.customerName} · {booking.staffName} ·{" "}
                    {booking.status.replace("_", " ").toLowerCase()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    disabled={isPending || locked}
                    value={booking.staffId}
                    onChange={(event) => {
                      if (event.target.value !== booking.staffId) {
                        onReassign(booking.id, event.target.value)
                      }
                    }}
                    className="border border-line bg-surface px-2 py-1.5 text-sm text-ink disabled:opacity-50"
                    aria-label="Reassign staff"
                  >
                    {activeStaff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <select
                    disabled={isPending || booking.status === "CANCELLED"}
                    value={booking.status}
                    onChange={(event) =>
                      onStatus(booking.id, event.target.value as BookingStatus)
                    }
                    className="border border-line bg-surface px-2 py-1.5 text-sm text-ink disabled:opacity-50"
                    aria-label="Update booking status"
                  >
                    {(
                      [
                        "PENDING",
                        "CONFIRMED",
                        "COMPLETED",
                        "CANCELLED",
                        "NO_SHOW",
                      ] as BookingStatus[]
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status === "CANCELLED"
                          ? "cancel"
                          : status.replace("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function WeeklyTemplate({
  staff,
  isPending,
  onSave,
  onClear,
}: {
  staff: RosterStaffRow[]
  isPending: boolean
  onSave: (
    staffId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ) => void
  onClear: (staffId: string, dayOfWeek: number) => void
}) {
  const [drafts, setDrafts] = useState<
    Record<string, { startTime: string; endTime: string }>
  >({})

  function draftKey(staffId: string, day: number) {
    return `${staffId}:${day}`
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">
        Default hours by weekday. Daily overrides on the board take priority.
      </p>
      {staff.length === 0 ? (
        <p className="text-sm text-ink-muted">No active staff.</p>
      ) : (
        staff.map((member) => (
          <section key={member.id} className="border-t border-line pt-6">
            <h3 className="font-display text-lg font-medium text-ink">
              {member.name}
            </h3>
            <ul className="mt-4 space-y-3">
              {DAY_LABELS.map((label, dayOfWeek) => {
                const existing = member.weekly.find(
                  (row) => row.dayOfWeek === dayOfWeek
                )
                const key = draftKey(member.id, dayOfWeek)
                const draft = drafts[key] ?? {
                  startTime: existing?.startTime ?? "09:00",
                  endTime: existing?.endTime ?? "17:00",
                }
                return (
                  <li
                    key={dayOfWeek}
                    className="grid gap-2 sm:grid-cols-[3rem_1fr_1fr_auto_auto] sm:items-end"
                  >
                    <span className="text-sm font-medium text-ink">{label}</span>
                    <label className="text-xs text-ink-muted">
                      Start
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [key]: {
                              ...draft,
                              startTime: event.target.value,
                            },
                          }))
                        }
                        className="mt-1 block w-full border border-line bg-surface px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-ink-muted">
                      End
                      <input
                        type="time"
                        value={draft.endTime}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [key]: {
                              ...draft,
                              endTime: event.target.value,
                            },
                          }))
                        }
                        className="mt-1 block w-full border border-line bg-surface px-2 py-1.5 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        onSave(
                          member.id,
                          dayOfWeek,
                          draft.startTime,
                          draft.endTime
                        )
                      }
                      className="border border-ink bg-ink px-3 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !existing}
                      onClick={() => onClear(member.id, dayOfWeek)}
                      className="border border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink-muted disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function TeamServices({
  staff,
  services,
  isPending,
  roleLabel,
  onSave,
}: {
  staff: RosterStaffRow[]
  services: RosterServiceRow[]
  isPending: boolean
  roleLabel: string
  onSave: (staffId: string, serviceIds: string[]) => void
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    for (const member of staff) {
      initial[member.id] = [...member.serviceIds]
    }
    return initial
  })

  function toggle(staffId: string, serviceId: string) {
    setSelected((current) => {
      const list = current[staffId] ?? []
      return {
        ...current,
        [staffId]: list.includes(serviceId)
          ? list.filter((id) => id !== serviceId)
          : [...list, serviceId],
      }
    })
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">
        Choose which services each {roleLabel} can take. Customers only see
        assigned people for a service.
      </p>
      {staff.length === 0 ? (
        <p className="text-sm text-ink-muted">No active staff.</p>
      ) : (
        staff.map((member) => (
          <section key={member.id} className="border-t border-line pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-medium text-ink">
                  {member.name}
                </h3>
                {member.title ? (
                  <p className="text-sm text-highlight">{member.title}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onSave(member.id, selected[member.id] ?? [])}
                className="border border-ink bg-ink px-3 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
              >
                Save assignments
              </button>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {services.map((service) => {
                const checked = (selected[member.id] ?? []).includes(service.id)
                return (
                  <li key={service.id}>
                    <label className="flex cursor-pointer items-start gap-3 border border-line px-3 py-3 text-sm hover:border-ink/30">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(member.id, service.id)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium text-ink">
                          {service.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-muted">
                          {service.durationMins} min
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

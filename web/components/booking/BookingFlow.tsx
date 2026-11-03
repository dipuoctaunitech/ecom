"use client"

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { signIn, useSession } from "next-auth/react"
import { ArrowLeft, CalendarDays, Check } from "lucide-react"
import {
  createBooking,
  getAvailableSlots,
  type BookingSlotOption,
} from "@/app/actions/booking"
import { formatMoney } from "@/lib/money"
import {
  dayOfWeekFromDateKey,
  formatSlotLabel,
  todayDateKey,
  type DateKey,
} from "@/lib/roster"
import type { VerticalService } from "@/components/booking/ServiceVerticalPage"

type Step = "when" | "who" | "slot" | "confirm"

const STEPS: { id: Step; label: string }[] = [
  { id: "when", label: "When" },
  { id: "who", label: "Who" },
  { id: "slot", label: "Time" },
  { id: "confirm", label: "Confirm" },
]

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

function addDays(dateKey: DateKey, days: number): DateKey {
  const [y, m, d] = dateKey.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

function formatFriendlyDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function upcomingDays(count = 14): { key: DateKey; label: string; sub: string }[] {
  const start = todayDateKey()
  const out: { key: DateKey; label: string; sub: string }[] = []
  for (let i = 0; i < count; i++) {
    const key = addDays(start, i)
    const [y, m, d] = key.split("-").map(Number)
    out.push({
      key,
      label: i === 0 ? "Today" : DAY_SHORT[dayOfWeekFromDateKey(key)],
      sub: `${d}/${m}`,
    })
  }
  return out
}

export function BookingFlow({
  service,
  onClose,
  personLabel = "groomer",
  tone = "light",
}: {
  service: VerticalService
  onClose: () => void
  personLabel?: string
  tone?: "light" | "dark"
}) {
  const { data: session, status, update: refreshSession } = useSession()
  const [step, setStep] = useState<Step>("when")
  const [dateKey, setDateKey] = useState(todayDateKey())
  const [staffId, setStaffId] = useState<string>("")
  const [slots, setSlots] = useState<BookingSlotOption[]>([])
  const [selected, setSelected] = useState<BookingSlotOption | null>(null)
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [doneId, setDoneId] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [authBusy, setAuthBusy] = useState(false)
  const dark = tone === "dark"
  const signedIn = status === "authenticated" && Boolean(session?.user)
  const dayOptions = useMemo(() => upcomingDays(14), [])

  const title = dark ? "text-white" : "text-ink"
  const muted = dark ? "text-white/80" : "text-ink-muted"
  const hoverMuted = dark
    ? "text-white/70 hover:text-white"
    : "text-ink-muted hover:text-ink"
  const line = dark ? "border-white/20" : "border-line"
  const divide = dark ? "divide-white/15" : "divide-line"
  const trackIdle = dark ? "bg-white/25" : "bg-line"
  const field = dark
    ? "border border-white/25 bg-black/40 text-white placeholder:text-white/50 focus:border-highlight"
    : "border border-line bg-surface text-ink focus:border-ink"
  const ghostBtn = dark
    ? `inline-flex items-center gap-2 border border-white/30 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white hover:border-white/55`
    : `inline-flex items-center gap-2 border border-line px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-muted hover:border-ink/30 hover:text-ink`
  const primaryBtn =
    "bg-highlight px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-highlight-dark"
  const panel = dark
    ? "mt-8 border border-white/15 bg-black/35 p-5 sm:p-6"
    : "mt-8 border border-line bg-surface p-5 sm:p-6"
  const chipIdle = dark
    ? "border border-white/25 bg-black/30 text-white hover:border-white/45"
    : "border border-line bg-surface text-ink hover:border-ink/40"
  const chipActive = "border-highlight bg-highlight text-white"

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  async function handleInlineSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError("")
    setAuthBusy(true)
    try {
      const result = await signIn("credentials", {
        email: authEmail,
        password: authPassword,
        redirect: false,
      })
      if (result?.error) {
        setAuthError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password."
            : result.error
        )
        return
      }
      if (!result?.ok) {
        setAuthError("Sign in failed. Please try again.")
        return
      }
      await refreshSession()
      setStep("when")
    } catch {
      setAuthError("Sign in failed. Please try again.")
    } finally {
      setAuthBusy(false)
    }
  }

  // Load slots only on the Time step — never clear selection on Confirm.
  useEffect(() => {
    if (step !== "slot") return
    if (!signedIn) return

    let cancelled = false
    setError("")
    setSelected(null)
    startTransition(async () => {
      try {
        const result = await getAvailableSlots({
          serviceId: service.id,
          dateKey,
          staffId: staffId || null,
        })
        if (cancelled) return
        setSlots(result.slots)
        if (result.slots.length === 0) {
          setError(
            `No open times on ${formatFriendlyDate(dateKey)}. Try another day or ${personLabel}.`
          )
        }
      } catch (err) {
        if (cancelled) return
        setSlots([])
        setError(err instanceof Error ? err.message : "Could not load times")
      }
    })

    return () => {
      cancelled = true
    }
  }, [step, dateKey, staffId, service.id, signedIn, personLabel])

  function confirm() {
    if (!selected) {
      setError("Pick a time first.")
      setStep("slot")
      return
    }
    setError("")
    startTransition(async () => {
      try {
        const result = await createBooking({
          serviceId: service.id,
          staffId: selected.staffId,
          startAt: selected.startAt,
          notes,
        })
        setDoneId(result.bookingId)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Booking failed")
      }
    })
  }

  if (doneId) {
    return (
      <div className="px-1 py-2 sm:px-2">
        <div className={`${panel} mx-auto max-w-lg`}>
          <span className="flex h-10 w-10 items-center justify-center bg-meadow/20 text-meadow">
            <Check className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <p className={`mt-5 font-display text-3xl font-bold tracking-tight ${title}`}>
            You’re all set
          </p>
          <p className={`mt-3 text-base leading-relaxed ${muted}`}>
            {service.name} with{" "}
            <span className={`font-semibold ${title}`}>{selected?.staffName}</span>
            {" · "}
            {formatFriendlyDate(dateKey)} at{" "}
            {selected ? formatSlotLabel(selected.startAt) : ""}
          </p>
          <p className={`mt-2 text-xs font-medium uppercase tracking-wide ${muted}`}>
            Booking {doneId.slice(0, 8).toUpperCase()}
          </p>
          <p className={`mt-4 text-sm leading-relaxed ${muted}`}>
            Saved to your account. Cancel anytime from My Account → Bookings.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/account?tab=bookings" className={primaryBtn}>
              View my bookings
            </Link>
            <button type="button" onClick={onClose} className={ghostBtn}>
              Back to services
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-1 py-2 sm:px-2">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-highlight">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
              Booking
            </p>
            <h3 className={`mt-2 font-display text-2xl font-bold tracking-tight ${title}`}>
              {service.name}
            </h3>
            <p className={`mt-1 text-sm ${muted}`}>
              {formatMoney(service.price)}
              {service.compareAtPrice != null &&
              service.compareAtPrice > service.price ? (
                <span className="ml-2 line-through">
                  {formatMoney(service.compareAtPrice)}
                </span>
              ) : null}
              {" · "}
              {service.durationMins} min
              {service.isCombo ? " · package" : ""}
              {service.loyaltyPoints > 0
                ? ` · earn ${service.loyaltyPoints} pts`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 text-sm font-medium transition-colors ${hoverMuted}`}
          >
            Cancel
          </button>
        </div>

        <ol className="mt-8 flex gap-1 sm:gap-2" aria-label="Booking steps">
          {STEPS.map((item, index) => {
            const done = index < stepIndex
            const active = item.id === step
            return (
              <li key={item.id} className="flex-1">
                <div
                  className={`h-1.5 w-full transition-colors ${
                    done || active ? "bg-highlight" : trackIdle
                  }`}
                />
                <p
                  className={`mt-2 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${
                    active ? title : muted
                  }`}
                >
                  {item.label}
                </p>
              </li>
            )
          })}
        </ol>

        <div className={panel}>
          {status === "loading" ? (
            <p className={`text-sm font-medium ${title}`}>Checking your account…</p>
          ) : !signedIn ? (
            <div className="space-y-5">
              <div>
                <h4 className={`font-display text-xl font-bold ${title}`}>
                  Sign in to book
                </h4>
                <p className={`mt-1 text-sm ${muted}`}>
                  Then pick a day, {personLabel}, and time — and confirm.
                </p>
              </div>
              <form onSubmit={handleInlineSignIn} className="max-w-sm space-y-3">
                <label className="block text-sm">
                  <span className={`font-medium ${title}`}>Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    className={`mt-1.5 block w-full px-4 py-3 text-sm outline-none ${field}`}
                  />
                </label>
                <label className="block text-sm">
                  <span className={`font-medium ${title}`}>Password</span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    className={`mt-1.5 block w-full px-4 py-3 text-sm outline-none ${field}`}
                  />
                </label>
                {authError ? (
                  <p className="text-sm text-red-300" role="alert">
                    {authError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={authBusy}
                  className={`${primaryBtn} disabled:opacity-50`}
                >
                  {authBusy ? "Signing in…" : "Sign in & continue"}
                </button>
              </form>
              <p className={`text-sm ${muted}`}>
                New here?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-highlight underline-offset-2 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          ) : step === "when" ? (
            <div className="space-y-6">
              <div>
                <h4 className={`font-display text-xl font-bold ${title}`}>
                  1. Pick a day
                </h4>
                <p className={`mt-1 text-sm ${muted}`}>
                  Choose a date, then continue.
                </p>
              </div>
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {dayOptions.map((day) => {
                  const active = dateKey === day.key
                  return (
                    <li key={day.key}>
                      <button
                        type="button"
                        onClick={() => setDateKey(day.key)}
                        className={`flex w-full flex-col items-center gap-0.5 px-2 py-3 text-center transition-colors ${
                          active ? chipActive : chipIdle
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {day.label}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {day.sub}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                onClick={() => setStep("who")}
                className={primaryBtn}
              >
                Continue
              </button>
            </div>
          ) : step === "who" ? (
            <div className="space-y-6">
              <div>
                <h4 className={`font-display text-xl font-bold ${title}`}>
                  2. Choose a {personLabel}
                </h4>
                <p className={`mt-1 text-sm ${muted}`}>
                  Or leave open for the next free slot.
                </p>
              </div>
              <ul className={`${divide} border-y ${line}`}>
                <li>
                  <button
                    type="button"
                    onClick={() => setStaffId("")}
                    className={`flex w-full items-center justify-between py-4 text-left transition-colors ${
                      staffId === "" ? title : hoverMuted
                    }`}
                  >
                    <span className="font-medium">Anyone available</span>
                    {staffId === "" ? (
                      <Check className="h-4 w-4 text-highlight" strokeWidth={2.5} />
                    ) : null}
                  </button>
                </li>
                {service.staff.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => setStaffId(member.id)}
                      className={`flex w-full items-center justify-between py-4 text-left transition-colors ${
                        staffId === member.id ? title : hoverMuted
                      }`}
                    >
                      <span>
                        <span className="block font-medium">{member.name}</span>
                        {member.title ? (
                          <span className={`mt-0.5 block text-xs ${muted}`}>
                            {member.title}
                          </span>
                        ) : null}
                      </span>
                      {staffId === member.id ? (
                        <Check
                          className="h-4 w-4 text-highlight"
                          strokeWidth={2.5}
                        />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("when")}
                  className={ghostBtn}
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("slot")}
                  className={primaryBtn}
                >
                  See times
                </button>
              </div>
            </div>
          ) : step === "slot" ? (
            <div className="space-y-6">
              <div>
                <h4 className={`font-display text-xl font-bold ${title}`}>
                  3. Pick a time
                </h4>
                <p className={`mt-1 text-sm ${muted}`}>
                  {formatFriendlyDate(dateKey)}
                  {staffId
                    ? ` · ${service.staff.find((m) => m.id === staffId)?.name ?? personLabel}`
                    : " · first available"}
                </p>
              </div>

              {isPending && slots.length === 0 ? (
                <p className={`text-sm ${muted}`}>Finding open times…</p>
              ) : null}

              {slots.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const active =
                      selected?.startAt === slot.startAt &&
                      selected?.staffId === slot.staffId
                    return (
                      <li key={`${slot.staffId}-${slot.startAt}`}>
                        <button
                          type="button"
                          onClick={() => setSelected(slot)}
                          className={`w-full border px-3 py-3 text-left transition-colors ${
                            active ? chipActive : chipIdle
                          }`}
                        >
                          <span className="block text-base font-semibold tabular-nums">
                            {formatSlotLabel(slot.startAt)}
                          </span>
                          <span
                            className={`mt-0.5 block text-xs ${
                              active ? "text-white/80" : muted
                            }`}
                          >
                            {slot.staffName}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : !isPending ? (
                <p className={`text-sm ${muted}`}>
                  No open times on this day. Go back and try another date.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    setStep("who")
                  }}
                  className={ghostBtn}
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => setStep("confirm")}
                  className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Continue to confirm
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className={`font-display text-xl font-bold ${title}`}>
                  4. Confirm booking
                </h4>
                {selected ? (
                  <p className={`mt-3 text-sm leading-relaxed ${title}`}>
                    <span className="font-semibold">{service.name}</span>
                    {" · "}
                    {selected.staffName}
                    <br />
                    {formatFriendlyDate(dateKey)} at{" "}
                    {formatSlotLabel(selected.startAt)}
                    {" · "}
                    {formatMoney(service.price)}
                  </p>
                ) : (
                  <p className={`mt-3 text-sm ${muted}`}>
                    No time selected yet.
                  </p>
                )}
              </div>
              {selected ? (
                <label className="block text-sm">
                  <span className={`font-medium ${title}`}>
                    Anything we should know?
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Pet’s name, breed, temperament…"
                    className={`mt-2 block w-full px-4 py-3 text-sm outline-none ${field}`}
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(selected ? "slot" : "when")}
                  className={ghostBtn}
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  Back
                </button>
                {selected ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={confirm}
                    className={`${primaryBtn} disabled:opacity-50`}
                  >
                    {isPending ? "Booking…" : "Confirm booking"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep("slot")}
                    className={primaryBtn}
                  >
                    Pick a time
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {error ? (
          <p
            className={`mt-4 text-sm font-medium ${dark ? "text-red-300" : "text-red-700"}`}
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

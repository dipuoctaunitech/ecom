/** Calendar date as YYYY-MM-DD (store-local wall clock, no TZ math). */
export type DateKey = string

export type WorkingWindow = {
  startTime: string
  endTime: string
  slotDurationMins: number
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidTime(value: string): boolean {
  return TIME_RE.test(normalizeTime(value))
}

/** Accept HH:mm or HH:mm:ss from `<input type="time">`. */
export function normalizeTime(value: string): string {
  const trimmed = value.trim()
  const withSeconds = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(trimmed)
  if (!withSeconds) return trimmed
  return `${withSeconds[1]}:${withSeconds[2]}`
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

export function todayDateKey(): DateKey {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD key (UTC calendar). */
export function dayOfWeekFromDateKey(dateKey: DateKey): number {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Prisma @db.Date value for a calendar key. */
export function dateKeyToUtcDate(dateKey: DateKey): Date {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function utcDateToDateKey(value: Date): DateKey {
  const y = value.getUTCFullYear()
  const m = String(value.getUTCMonth() + 1).padStart(2, "0")
  const d = String(value.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseTimeToMinutes(time: string): number {
  const normalized = normalizeTime(time)
  if (!TIME_RE.test(normalized)) {
    throw new Error(`Invalid time "${time}". Use HH:mm.`)
  }
  const [h, m] = normalized.split(":").map(Number)
  return h * 60 + m
}

export function minutesToTime(totalMins: number): string {
  const mins = ((totalMins % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Combine YYYY-MM-DD + HH:mm into a UTC Date (demo wall-clock storage). */
export function combineDateAndTime(dateKey: DateKey, time: string): Date {
  if (!isValidDateKey(dateKey)) {
    throw new Error("Invalid date.")
  }
  const normalized = normalizeTime(time)
  if (!TIME_RE.test(normalized)) {
    throw new Error("Invalid time.")
  }
  return new Date(`${dateKey}T${normalized}:00.000Z`)
}

export function formatSlotLabel(iso: string): string {
  const dt = new Date(iso)
  return minutesToTime(dt.getUTCHours() * 60 + dt.getUTCMinutes())
}

export type TimeFrameLike = {
  startTime: string
  endTime: string
  slotDurationMins: number
  daysOfWeek: number[]
  isActive?: boolean
}

/** Whether a time frame applies on this calendar date. Empty daysOfWeek = every day. */
export function timeFrameAppliesOnDate(
  frame: Pick<TimeFrameLike, "daysOfWeek" | "isActive">,
  dateKey: DateKey
): boolean {
  if (frame.isActive === false) return false
  if (!frame.daysOfWeek || frame.daysOfWeek.length === 0) return true
  return frame.daysOfWeek.includes(dayOfWeekFromDateKey(dateKey))
}

/**
 * Resolve working hours for one staff member on one date.
 * Prefer store time frames mapped to the staff; fall back to weekly roster.
 * Exceptions override for that day.
 */
export function resolveWorkingWindows(input: {
  dateKey: DateKey
  weekly: { dayOfWeek: number; startTime: string; endTime: string; slotDurationMins: number }[]
  timeFrames: TimeFrameLike[]
  exception: {
    type: "OFF" | "CUSTOM_HOURS"
    startTime: string | null
    endTime: string | null
  } | null
}): WorkingWindow[] {
  if (input.exception?.type === "OFF") {
    return []
  }

  if (input.exception?.type === "CUSTOM_HOURS") {
    if (!input.exception.startTime || !input.exception.endTime) {
      return []
    }
    const fromFrames = input.timeFrames.filter((frame) =>
      timeFrameAppliesOnDate(frame, input.dateKey)
    )
    const slotDurationMins =
      fromFrames[0]?.slotDurationMins ??
      input.weekly.find(
        (row) => row.dayOfWeek === dayOfWeekFromDateKey(input.dateKey)
      )?.slotDurationMins ??
      30
    return [
      {
        startTime: input.exception.startTime,
        endTime: input.exception.endTime,
        slotDurationMins,
      },
    ]
  }

  const frameWindows = input.timeFrames
    .filter((frame) => timeFrameAppliesOnDate(frame, input.dateKey))
    .map((frame) => ({
      startTime: frame.startTime,
      endTime: frame.endTime,
      slotDurationMins: frame.slotDurationMins,
    }))
    .filter((window) => {
      try {
        return (
          parseTimeToMinutes(window.endTime) >
          parseTimeToMinutes(window.startTime)
        )
      } catch {
        return false
      }
    })

  if (frameWindows.length > 0) {
    return frameWindows
  }

  const dow = dayOfWeekFromDateKey(input.dateKey)
  const weekly = input.weekly.find((row) => row.dayOfWeek === dow) ?? null
  if (!weekly) return []

  return [
    {
      startTime: weekly.startTime,
      endTime: weekly.endTime,
      slotDurationMins: weekly.slotDurationMins,
    },
  ]
}

/** @deprecated Prefer resolveWorkingWindows — kept for callers expecting one window. */
export function resolveWorkingWindow(input: {
  dateKey: DateKey
  weekly: { dayOfWeek: number; startTime: string; endTime: string; slotDurationMins: number }[]
  timeFrames?: TimeFrameLike[]
  exception: {
    type: "OFF" | "CUSTOM_HOURS"
    startTime: string | null
    endTime: string | null
  } | null
}): WorkingWindow | null {
  const windows = resolveWorkingWindows({
    ...input,
    timeFrames: input.timeFrames ?? [],
  })
  return windows[0] ?? null
}

/** Position of HH:mm on a 0–24 hour line (0–100%). */
export function timeToDayPercent(time: string): number {
  const mins = parseTimeToMinutes(time)
  return (mins / (24 * 60)) * 100
}

/**
 * Candidate start times that fit `durationMins` inside the working window
 * and do not overlap existing bookings.
 */
export function generateAvailableSlots(input: {
  dateKey: DateKey
  window: WorkingWindow
  durationMins: number
  bookings: { startAt: Date; endAt: Date }[]
  /** Step between candidate starts; defaults to roster slot size. */
  stepMins?: number
}): string[] {
  const step = input.stepMins ?? input.window.slotDurationMins
  if (step <= 0 || input.durationMins <= 0) return []

  const dayStart = parseTimeToMinutes(input.window.startTime)
  const dayEnd = parseTimeToMinutes(input.window.endTime)
  if (dayEnd <= dayStart) return []

  const busy = input.bookings.map((b) => ({
    start: b.startAt.getTime(),
    end: b.endAt.getTime(),
  }))

  const slots: string[] = []
  for (let start = dayStart; start + input.durationMins <= dayEnd; start += step) {
    const startAt = combineDateAndTime(input.dateKey, minutesToTime(start))
    const endAt = new Date(startAt.getTime() + input.durationMins * 60_000)
    const overlaps = busy.some(
      (b) => startAt.getTime() < b.end && endAt.getTime() > b.start
    )
    if (!overlaps) {
      slots.push(startAt.toISOString())
    }
  }

  return slots
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

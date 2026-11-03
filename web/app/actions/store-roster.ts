"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidateBookingPaths } from "@/lib/booking-paths"
import { canManageStoreCatalog, requireActiveStore } from "@/lib/store"
import {
  dateKeyToUtcDate,
  DAY_LABELS,
  isValidDateKey,
  normalizeTime,
  parseTimeToMinutes,
  todayDateKey,
  type DateKey,
} from "@/lib/roster"
import type { BookingStatus, ServiceVertical, StaffType } from "@prisma/client"
import { toAmount } from "@/lib/money"

/** Statuses that occupy a staff time window. */
const SLOT_BLOCKING: BookingStatus[] = ["PENDING", "CONFIRMED"]

export type RosterStaffRow = {
  id: string
  name: string
  title: string | null
  bio: string | null
  type: StaffType
  isActive: boolean
  weekly: {
    dayOfWeek: number
    dayLabel: string
    startTime: string
    endTime: string
    slotDurationMins: number
  }[]
  serviceIds: string[]
}

export type RosterServiceRow = {
  id: string
  name: string
  vertical: ServiceVertical
  durationMins: number
  price: number
  isActive: boolean
}

export type DayStaffStatus = {
  staffId: string
  name: string
  title: string | null
  /** Effective status for the selected date. */
  status: "WORKING" | "OFF" | "UNROSTERED"
  startTime: string | null
  endTime: string | null
  exceptionType: "OFF" | "CUSTOM_HOURS" | null
  exceptionNote: string | null
  bookingCount: number
}

export type DayBookingRow = {
  id: string
  startAt: string
  endAt: string
  status: BookingStatus
  notes: string | null
  customerName: string
  customerEmail: string
  serviceId: string
  serviceName: string
  staffId: string
  staffName: string
}

export type StoreRosterBoard = {
  dateKey: DateKey
  staff: RosterStaffRow[]
  services: RosterServiceRow[]
  dayStatus: DayStaffStatus[]
  dayBookings: DayBookingRow[]
}

async function requireRosterManager() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }
  const allowed = await canManageStoreCatalog(session.user.id)
  if (!allowed) {
    throw new Error(
      "Unauthorized. Only store owners and managers can edit the roster."
    )
  }
  return session
}

function revalidateRosterPaths() {
  revalidateBookingPaths()
}

function assertTimeOrder(startTime: string, endTime: string): {
  startTime: string
  endTime: string
} {
  const start = normalizeTime(startTime)
  const end = normalizeTime(endTime)
  try {
    if (parseTimeToMinutes(end) <= parseTimeToMinutes(start)) {
      throw new Error("End time must be after start time.")
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("End time")) throw err
    throw new Error("Times must be HH:mm.")
  }
  return { startTime: start, endTime: end }
}

export async function getStoreRosterBoard(
  dateKeyInput?: string,
  vertical: ServiceVertical = "GROOMING"
): Promise<StoreRosterBoard> {
  await requireRosterManager()
  const store = await requireActiveStore()
  const dateKey =
    dateKeyInput && isValidDateKey(dateKeyInput)
      ? dateKeyInput
      : todayDateKey()
  const date = dateKeyToUtcDate(dateKey)
  const staffType: StaffType = vertical === "GROOMING" ? "GROOMER" : "DOCTOR"

  const [staffRows, services, exceptions, bookings] = await Promise.all([
    prisma.staffMember.findMany({
      where: { storeId: store.id, type: staffType },
      include: {
        weeklyRoster: true,
        services: { select: { serviceId: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.bookableService.findMany({
      where: { storeId: store.id, vertical },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.rosterException.findMany({
      where: {
        date,
        staff: { storeId: store.id, type: staffType },
      },
    }),
    prisma.booking.findMany({
      where: {
        storeId: store.id,
        startAt: {
          gte: new Date(`${dateKey}T00:00:00.000Z`),
          lt: new Date(`${dateKey}T23:59:59.999Z`),
        },
        service: { vertical },
      },
      include: {
        customer: { select: { name: true, email: true } },
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
  ])

  const exceptionByStaff = new Map(
    exceptions.map((row) => [row.staffId, row])
  )
  const bookingCountByStaff = new Map<string, number>()
  for (const booking of bookings) {
    if (booking.status === "CANCELLED" || booking.status === "NO_SHOW") continue
    bookingCountByStaff.set(
      booking.staffId,
      (bookingCountByStaff.get(booking.staffId) ?? 0) + 1
    )
  }

  const staff: RosterStaffRow[] = staffRows.map((member) => ({
    id: member.id,
    name: member.name,
    title: member.title,
    bio: member.bio,
    type: member.type,
    isActive: member.isActive,
    weekly: member.weeklyRoster
      .slice()
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((row) => ({
        dayOfWeek: row.dayOfWeek,
        dayLabel: DAY_LABELS[row.dayOfWeek] ?? String(row.dayOfWeek),
        startTime: row.startTime,
        endTime: row.endTime,
        slotDurationMins: row.slotDurationMins,
      })),
    serviceIds: member.services.map((link) => link.serviceId),
  }))

  const dayStatus: DayStaffStatus[] = staffRows
    .filter((member) => member.isActive)
    .map((member) => {
      const dow = date.getUTCDay()
      const weekly = member.weeklyRoster.find((row) => row.dayOfWeek === dow)
      const exception = exceptionByStaff.get(member.id) ?? null

      if (exception?.type === "OFF") {
        return {
          staffId: member.id,
          name: member.name,
          title: member.title,
          status: "OFF" as const,
          startTime: null,
          endTime: null,
          exceptionType: "OFF" as const,
          exceptionNote: exception.note,
          bookingCount: bookingCountByStaff.get(member.id) ?? 0,
        }
      }

      if (exception?.type === "CUSTOM_HOURS") {
        return {
          staffId: member.id,
          name: member.name,
          title: member.title,
          status: "WORKING" as const,
          startTime: exception.startTime,
          endTime: exception.endTime,
          exceptionType: "CUSTOM_HOURS" as const,
          exceptionNote: exception.note,
          bookingCount: bookingCountByStaff.get(member.id) ?? 0,
        }
      }

      if (!weekly) {
        return {
          staffId: member.id,
          name: member.name,
          title: member.title,
          status: "UNROSTERED" as const,
          startTime: null,
          endTime: null,
          exceptionType: null,
          exceptionNote: null,
          bookingCount: bookingCountByStaff.get(member.id) ?? 0,
        }
      }

      return {
        staffId: member.id,
        name: member.name,
        title: member.title,
        status: "WORKING" as const,
        startTime: weekly.startTime,
        endTime: weekly.endTime,
        exceptionType: null,
        exceptionNote: null,
        bookingCount: bookingCountByStaff.get(member.id) ?? 0,
      }
    })

  return {
    dateKey,
    staff,
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      vertical: service.vertical,
      durationMins: service.durationMins,
      price: toAmount(service.price),
      isActive: service.isActive,
    })),
    dayStatus,
    dayBookings: bookings.map((booking) => ({
      id: booking.id,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
      notes: booking.notes,
      customerName: booking.customer.name ?? "Customer",
      customerEmail: booking.customer.email ?? "",
      serviceId: booking.service.id,
      serviceName: booking.service.name,
      staffId: booking.staff.id,
      staffName: booking.staff.name,
    })),
  }
}

export async function setWeeklyRosterDay(input: {
  staffId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMins?: number
}): Promise<{ success: true }> {
  await requireRosterManager()
  const store = await requireActiveStore()

  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new Error("dayOfWeek must be 0–6.")
  }
  const times = assertTimeOrder(input.startTime, input.endTime)
  const slotDurationMins = input.slotDurationMins ?? 30
  if (slotDurationMins < 10 || slotDurationMins > 180) {
    throw new Error("Slot duration must be between 10 and 180 minutes.")
  }

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, storeId: store.id },
    select: { id: true },
  })
  if (!staff) throw new Error("Staff member not found.")

  await prisma.weeklyRoster.upsert({
    where: {
      staffId_dayOfWeek: {
        staffId: input.staffId,
        dayOfWeek: input.dayOfWeek,
      },
    },
    update: {
      startTime: times.startTime,
      endTime: times.endTime,
      slotDurationMins,
    },
    create: {
      staffId: input.staffId,
      dayOfWeek: input.dayOfWeek,
      startTime: times.startTime,
      endTime: times.endTime,
      slotDurationMins,
    },
  })

  revalidateRosterPaths()
  return { success: true }
}

export async function clearWeeklyRosterDay(input: {
  staffId: string
  dayOfWeek: number
}): Promise<{ success: true }> {
  await requireRosterManager()
  const store = await requireActiveStore()

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, storeId: store.id },
    select: { id: true },
  })
  if (!staff) throw new Error("Staff member not found.")

  await prisma.weeklyRoster.deleteMany({
    where: { staffId: input.staffId, dayOfWeek: input.dayOfWeek },
  })

  revalidateRosterPaths()
  return { success: true }
}

export async function setDayAssignment(input: {
  staffId: string
  dateKey: string
  /** WORKING uses weekly hours unless custom times are provided. */
  mode: "WORKING" | "OFF" | "CUSTOM"
  startTime?: string
  endTime?: string
  note?: string
}): Promise<{ success: true }> {
  await requireRosterManager()
  const store = await requireActiveStore()

  if (!isValidDateKey(input.dateKey)) {
    throw new Error("Invalid date.")
  }

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, storeId: store.id, isActive: true },
    select: { id: true },
  })
  if (!staff) throw new Error("Staff member not found.")

  const date = dateKeyToUtcDate(input.dateKey)
  const note = input.note?.trim() || null

  if (input.mode === "WORKING") {
    // Clear exception so weekly roster applies
    await prisma.rosterException.deleteMany({
      where: { staffId: input.staffId, date },
    })
    revalidateRosterPaths()
    return { success: true }
  }

  if (input.mode === "OFF") {
    await prisma.rosterException.upsert({
      where: { staffId_date: { staffId: input.staffId, date } },
      update: {
        type: "OFF",
        startTime: null,
        endTime: null,
        note,
      },
      create: {
        staffId: input.staffId,
        date,
        type: "OFF",
        note,
      },
    })
    revalidateRosterPaths()
    return { success: true }
  }

  // CUSTOM
  if (!input.startTime || !input.endTime) {
    throw new Error("Custom hours need start and end times.")
  }
  const times = assertTimeOrder(input.startTime, input.endTime)

  await prisma.rosterException.upsert({
    where: { staffId_date: { staffId: input.staffId, date } },
    update: {
      type: "CUSTOM_HOURS",
      startTime: times.startTime,
      endTime: times.endTime,
      note,
    },
    create: {
      staffId: input.staffId,
      date,
      type: "CUSTOM_HOURS",
      startTime: times.startTime,
      endTime: times.endTime,
      note,
    },
  })

  revalidateRosterPaths()
  return { success: true }
}

export async function setStaffServices(input: {
  staffId: string
  serviceIds: string[]
}): Promise<{ success: true }> {
  await requireRosterManager()
  const store = await requireActiveStore()

  const staff = await prisma.staffMember.findFirst({
    where: { id: input.staffId, storeId: store.id },
    select: { id: true, type: true },
  })
  if (!staff) throw new Error("Staff member not found.")

  const vertical: ServiceVertical =
    staff.type === "GROOMER" ? "GROOMING" : "CLINIC"

  const services = await prisma.bookableService.findMany({
    where: {
      storeId: store.id,
      vertical,
      id: { in: input.serviceIds },
      isActive: true,
    },
    select: { id: true },
  })
  const validIds = new Set(services.map((s) => s.id))
  const nextIds = input.serviceIds.filter((id) => validIds.has(id))

  await prisma.$transaction(async (tx) => {
    await tx.staffService.deleteMany({ where: { staffId: input.staffId } })
    if (nextIds.length > 0) {
      await tx.staffService.createMany({
        data: nextIds.map((serviceId) => ({
          staffId: input.staffId,
          serviceId,
        })),
      })
    }
  })

  revalidateRosterPaths()
  return { success: true }
}

export async function reassignBooking(input: {
  bookingId: string
  staffId: string
}): Promise<{ success: true; booking: DayBookingRow }> {
  await requireRosterManager()
  const store = await requireActiveStore()

  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, storeId: store.id },
    include: {
      service: { select: { id: true, name: true, vertical: true } },
    },
  })
  if (!booking) throw new Error("Booking not found.")
  if (booking.status === "CANCELLED") {
    throw new Error("Cannot reassign a cancelled booking.")
  }

  const staff = await prisma.staffMember.findFirst({
    where: {
      id: input.staffId,
      storeId: store.id,
      isActive: true,
      type: booking.service.vertical === "GROOMING" ? "GROOMER" : "DOCTOR",
    },
    include: {
      services: { where: { serviceId: booking.serviceId }, select: { id: true } },
    },
  })
  if (!staff) throw new Error("Staff member not found for this vertical.")
  if (staff.services.length === 0) {
    throw new Error("That person is not assigned to this service.")
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      staffId: input.staffId,
      id: { not: booking.id },
      status: { in: SLOT_BLOCKING },
      startAt: { lt: booking.endAt },
      endAt: { gt: booking.startAt },
    },
    select: { id: true },
  })
  if (overlap) {
    throw new Error("That person already has a booking in this slot.")
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { staffId: input.staffId },
    include: {
      customer: { select: { name: true, email: true } },
      service: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true } },
    },
  })

  revalidateRosterPaths()
  return {
    success: true,
    booking: {
      id: updated.id,
      startAt: updated.startAt.toISOString(),
      endAt: updated.endAt.toISOString(),
      status: updated.status,
      notes: updated.notes,
      customerName: updated.customer.name ?? "Customer",
      customerEmail: updated.customer.email ?? "",
      serviceId: updated.service.id,
      serviceName: updated.service.name,
      staffId: updated.staff.id,
      staffName: updated.staff.name,
    },
  }
}

export async function updateBookingStatus(input: {
  bookingId: string
  status: BookingStatus
}): Promise<{ success: true }> {
  await requireRosterManager()
  const store = await requireActiveStore()

  const allowed: BookingStatus[] = [
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]
  if (!allowed.includes(input.status)) {
    throw new Error("Invalid booking status.")
  }

  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, storeId: store.id },
    select: { id: true },
  })
  if (!booking) throw new Error("Booking not found.")

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: input.status },
  })

  revalidateRosterPaths()
  return { success: true }
}

/** Lightweight check used by seller page data loading. */
export async function canLoadStoreRoster(userId: string): Promise<boolean> {
  return canManageStoreCatalog(userId)
}


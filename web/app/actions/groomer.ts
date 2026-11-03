"use server"

import { getServerSession } from "next-auth"
import type { BookingStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { revalidateBookingPaths } from "@/lib/booking-paths"
import { prisma } from "@/lib/prisma"
import {
  dateKeyToUtcDate,
  DAY_LABELS,
  isValidDateKey,
  todayDateKey,
  type DateKey,
} from "@/lib/roster"

export type GroomerProfile = {
  staffId: string
  name: string
  title: string | null
  bio: string | null
  storeId: string
  storeName: string
}

export type GroomerDayAvailability = {
  status: "WORKING" | "OFF" | "UNROSTERED"
  startTime: string | null
  endTime: string | null
  exceptionType: "OFF" | "CUSTOM_HOURS" | null
  exceptionNote: string | null
}

export type GroomerBookingRow = {
  id: string
  startAt: string
  endAt: string
  status: BookingStatus
  notes: string | null
  customerName: string
  customerEmail: string
  serviceName: string
  serviceDurationMins: number
}

export type GroomerDayCustomer = {
  customerEmail: string
  customerName: string
  bookingCount: number
  nextStartAt: string
  services: string[]
}

export type GroomerWeeklyDay = {
  dayOfWeek: number
  dayLabel: string
  startTime: string
  endTime: string
  slotDurationMins: number
}

export type GroomerDayBoard = {
  dateKey: DateKey
  profile: GroomerProfile
  availability: GroomerDayAvailability
  weekly: GroomerWeeklyDay[]
  bookings: GroomerBookingRow[]
  customers: GroomerDayCustomer[]
  summary: {
    bookingCount: number
    customerCount: number
    upcomingCount: number
    completedCount: number
  }
}

async function requireGroomerStaff(): Promise<{
  userId: string
  staff: {
    id: string
    name: string
    title: string | null
    bio: string | null
    storeId: string
    storeName: string
  }
}> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }

  const staff = await prisma.staffMember.findFirst({
    where: {
      userId: session.user.id,
      type: "GROOMER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      title: true,
      bio: true,
      storeId: true,
      store: { select: { name: true } },
    },
  })

  if (!staff) {
    throw new Error("Unauthorized. No groomer profile linked to this account.")
  }

  return {
    userId: session.user.id,
    staff: {
      id: staff.id,
      name: staff.name,
      title: staff.title,
      bio: staff.bio,
      storeId: staff.storeId,
      storeName: staff.store.name,
    },
  }
}

/** True when the user has an active linked groomer staff profile. */
export async function userHasGroomerPortal(userId: string): Promise<boolean> {
  const staff = await prisma.staffMember.findFirst({
    where: { userId, type: "GROOMER", isActive: true },
    select: { id: true },
  })
  return Boolean(staff)
}

export async function getGroomerProfile(): Promise<GroomerProfile | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const staff = await prisma.staffMember.findFirst({
    where: {
      userId: session.user.id,
      type: "GROOMER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      title: true,
      bio: true,
      storeId: true,
      store: { select: { name: true } },
    },
  })

  if (!staff) return null

  return {
    staffId: staff.id,
    name: staff.name,
    title: staff.title,
    bio: staff.bio,
    storeId: staff.storeId,
    storeName: staff.store.name,
  }
}

export async function getGroomerDayBoard(
  dateKeyInput?: string
): Promise<GroomerDayBoard> {
  const { staff } = await requireGroomerStaff()
  const dateKey =
    dateKeyInput && isValidDateKey(dateKeyInput)
      ? dateKeyInput
      : todayDateKey()
  const date = dateKeyToUtcDate(dateKey)
  const dow = date.getUTCDay()

  const [member, exception, bookings] = await Promise.all([
    prisma.staffMember.findUnique({
      where: { id: staff.id },
      include: { weeklyRoster: true },
    }),
    prisma.rosterException.findUnique({
      where: {
        staffId_date: { staffId: staff.id, date },
      },
    }),
    prisma.booking.findMany({
      where: {
        staffId: staff.id,
        startAt: {
          gte: new Date(`${dateKey}T00:00:00.000Z`),
          lt: new Date(`${dateKey}T23:59:59.999Z`),
        },
      },
      include: {
        customer: { select: { name: true, email: true } },
        service: { select: { name: true, durationMins: true } },
      },
      orderBy: { startAt: "asc" },
    }),
  ])

  if (!member) {
    throw new Error("Groomer profile not found.")
  }

  const weekly = member.weeklyRoster
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((row) => ({
      dayOfWeek: row.dayOfWeek,
      dayLabel: DAY_LABELS[row.dayOfWeek] ?? String(row.dayOfWeek),
      startTime: row.startTime,
      endTime: row.endTime,
      slotDurationMins: row.slotDurationMins,
    }))

  const weeklyToday = member.weeklyRoster.find((row) => row.dayOfWeek === dow)

  let availability: GroomerDayAvailability
  if (exception?.type === "OFF") {
    availability = {
      status: "OFF",
      startTime: null,
      endTime: null,
      exceptionType: "OFF",
      exceptionNote: exception.note,
    }
  } else if (exception?.type === "CUSTOM_HOURS") {
    availability = {
      status: "WORKING",
      startTime: exception.startTime,
      endTime: exception.endTime,
      exceptionType: "CUSTOM_HOURS",
      exceptionNote: exception.note,
    }
  } else if (!weeklyToday) {
    availability = {
      status: "UNROSTERED",
      startTime: null,
      endTime: null,
      exceptionType: null,
      exceptionNote: null,
    }
  } else {
    availability = {
      status: "WORKING",
      startTime: weeklyToday.startTime,
      endTime: weeklyToday.endTime,
      exceptionType: null,
      exceptionNote: null,
    }
  }

  const bookingRows: GroomerBookingRow[] = bookings.map((booking) => ({
    id: booking.id,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
    notes: booking.notes,
    customerName: booking.customer.name ?? "Customer",
    customerEmail: booking.customer.email ?? "",
    serviceName: booking.service.name,
    serviceDurationMins: booking.service.durationMins,
  }))

  const customerMap = new Map<string, GroomerDayCustomer>()
  for (const booking of bookingRows) {
    if (booking.status === "CANCELLED") continue
    const key = booking.customerEmail || booking.customerName
    const existing = customerMap.get(key)
    if (!existing) {
      customerMap.set(key, {
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        bookingCount: 1,
        nextStartAt: booking.startAt,
        services: [booking.serviceName],
      })
      continue
    }
    existing.bookingCount += 1
    if (!existing.services.includes(booking.serviceName)) {
      existing.services.push(booking.serviceName)
    }
    if (booking.startAt < existing.nextStartAt) {
      existing.nextStartAt = booking.startAt
    }
  }

  const customers = Array.from(customerMap.values()).sort((a, b) =>
    a.nextStartAt.localeCompare(b.nextStartAt)
  )

  const activeBookings = bookingRows.filter((b) => b.status !== "CANCELLED")
  const now = Date.now()

  return {
    dateKey,
    profile: {
      staffId: staff.id,
      name: staff.name,
      title: staff.title,
      bio: staff.bio,
      storeId: staff.storeId,
      storeName: staff.storeName,
    },
    availability,
    weekly,
    bookings: bookingRows,
    customers,
    summary: {
      bookingCount: activeBookings.length,
      customerCount: customers.length,
      upcomingCount: activeBookings.filter(
        (b) =>
          new Date(b.startAt).getTime() >= now &&
          (b.status === "PENDING" || b.status === "CONFIRMED")
      ).length,
      completedCount: activeBookings.filter((b) => b.status === "COMPLETED")
        .length,
    },
  }
}

export async function updateGroomerBookingStatus(input: {
  bookingId: string
  status: BookingStatus
}): Promise<{ success: true }> {
  const { staff } = await requireGroomerStaff()

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
    where: { id: input.bookingId, staffId: staff.id },
    select: { id: true },
  })
  if (!booking) throw new Error("Booking not found.")

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: input.status },
  })

  revalidateBookingPaths()
  return { success: true }
}

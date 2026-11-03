"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidateBookingPaths } from "@/lib/booking-paths"
import { requireActiveStore } from "@/lib/store"
import {
  generateAvailableSlots,
  isValidDateKey,
  parseTimeToMinutes,
  resolveWorkingWindows,
  todayDateKey,
} from "@/lib/roster"
import type { BookingStatus, ServiceVertical } from "@prisma/client"
import { toAmount } from "@/lib/money"

/** Statuses that occupy a staff time window (cancelled / no-show free the slot). */
const SLOT_BLOCKING: BookingStatus[] = ["PENDING", "CONFIRMED"]

const CANCELLABLE: BookingStatus[] = ["PENDING", "CONFIRMED"]

export type BookingSlotOption = {
  startAt: string
  staffId: string
  staffName: string
}

export type AvailableSlotsResult = {
  dateKey: string
  serviceId: string
  durationMins: number
  slots: BookingSlotOption[]
}

async function requireBuyer() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Sign in to book a slot.")
  }
  return session
}

export async function getAvailableSlots(input: {
  serviceId: string
  dateKey: string
  staffId?: string | null
}): Promise<AvailableSlotsResult> {
  const store = await requireActiveStore()

  if (!isValidDateKey(input.dateKey)) {
    throw new Error("Invalid date.")
  }
  if (input.dateKey < todayDateKey()) {
    throw new Error("Pick today or a future date.")
  }

  const service = await prisma.bookableService.findFirst({
    where: {
      id: input.serviceId,
      storeId: store.id,
      isActive: true,
    },
    include: {
      staffLinks: {
        include: {
          staff: {
            include: {
              weeklyRoster: true,
              exceptions: {
                where: { date: new Date(`${input.dateKey}T00:00:00.000Z`) },
              },
              timeFrames: {
                include: {
                  timeFrame: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!service) throw new Error("Service not found.")

  let linkedStaff = service.staffLinks
    .map((link) => link.staff)
    .filter((member) => member.isActive)

  if (input.staffId) {
    linkedStaff = linkedStaff.filter((member) => member.id === input.staffId)
  }

  if (linkedStaff.length === 0) {
    return {
      dateKey: input.dateKey,
      serviceId: service.id,
      durationMins: service.durationMins,
      slots: [],
    }
  }

  const dayStart = new Date(`${input.dateKey}T00:00:00.000Z`)
  const dayEnd = new Date(`${input.dateKey}T23:59:59.999Z`)

  const bookings = await prisma.booking.findMany({
    where: {
      storeId: store.id,
      staffId: { in: linkedStaff.map((s) => s.id) },
      status: { in: SLOT_BLOCKING },
      startAt: { gte: dayStart, lte: dayEnd },
    },
    select: { staffId: true, startAt: true, endAt: true },
  })

  const slots: BookingSlotOption[] = []

  for (const member of linkedStaff) {
    const timeFrames = member.timeFrames
      .map((link) => link.timeFrame)
      .filter(
        (frame) =>
          frame.isActive &&
          frame.vertical === service.vertical &&
          frame.storeId === store.id
      )
      .map((frame) => ({
        startTime: frame.startTime,
        endTime: frame.endTime,
        slotDurationMins: frame.slotDurationMins,
        daysOfWeek: frame.daysOfWeek,
        isActive: frame.isActive,
      }))

    const windows = resolveWorkingWindows({
      dateKey: input.dateKey,
      weekly: member.weeklyRoster,
      timeFrames,
      exception: member.exceptions[0]
        ? {
            type: member.exceptions[0].type,
            startTime: member.exceptions[0].startTime,
            endTime: member.exceptions[0].endTime,
          }
        : null,
    })

    const memberBookings = bookings.filter((b) => b.staffId === member.id)

    for (const window of windows) {
      const starts = generateAvailableSlots({
        dateKey: input.dateKey,
        window,
        durationMins: service.durationMins,
        bookings: memberBookings,
      })

      for (const startAt of starts) {
        if (input.dateKey === todayDateKey()) {
          const startMs = new Date(startAt).getTime()
          if (startMs <= Date.now()) continue
        }
        slots.push({
          startAt,
          staffId: member.id,
          staffName: member.name,
        })
      }
    }
  }

  // Overlapping time frames can emit the same staff+start twice — keep one.
  const unique = new Map<string, BookingSlotOption>()
  for (const slot of slots) {
    unique.set(`${slot.staffId}|${slot.startAt}`, slot)
  }
  const deduped = Array.from(unique.values())
  deduped.sort((a, b) => {
    const byTime = a.startAt.localeCompare(b.startAt)
    if (byTime !== 0) return byTime
    return a.staffName.localeCompare(b.staffName)
  })

  return {
    dateKey: input.dateKey,
    serviceId: service.id,
    durationMins: service.durationMins,
    slots: deduped,
  }
}

export async function createBooking(input: {
  serviceId: string
  staffId: string
  startAt: string
  notes?: string
}): Promise<{ success: true; bookingId: string }> {
  const session = await requireBuyer()
  const store = await requireActiveStore()

  const startAt = new Date(input.startAt)
  if (Number.isNaN(startAt.getTime())) {
    throw new Error("Invalid start time.")
  }
  if (startAt.getTime() <= Date.now()) {
    throw new Error("That slot is in the past.")
  }

  const service = await prisma.bookableService.findFirst({
    where: {
      id: input.serviceId,
      storeId: store.id,
      isActive: true,
    },
    include: {
      staffLinks: {
        where: { staffId: input.staffId },
        select: { id: true },
      },
    },
  })
  if (!service) throw new Error("Service not found.")
  if (service.staffLinks.length === 0) {
    throw new Error("That person is not available for this service.")
  }

  const staff = await prisma.staffMember.findFirst({
    where: {
      id: input.staffId,
      storeId: store.id,
      isActive: true,
    },
    include: {
      weeklyRoster: true,
      exceptions: {
        where: {
          date: new Date(
            `${startAt.toISOString().slice(0, 10)}T00:00:00.000Z`
          ),
        },
      },
      timeFrames: {
        include: { timeFrame: true },
      },
    },
  })
  if (!staff) throw new Error("Staff member not found.")

  const dateKey = startAt.toISOString().slice(0, 10)
  const timeFrames = staff.timeFrames
    .map((link) => link.timeFrame)
    .filter(
      (frame) =>
        frame.isActive &&
        frame.vertical === service.vertical &&
        frame.storeId === store.id
    )
    .map((frame) => ({
      startTime: frame.startTime,
      endTime: frame.endTime,
      slotDurationMins: frame.slotDurationMins,
      daysOfWeek: frame.daysOfWeek,
      isActive: frame.isActive,
    }))

  const windows = resolveWorkingWindows({
    dateKey,
    weekly: staff.weeklyRoster,
    timeFrames,
    exception: staff.exceptions[0]
      ? {
          type: staff.exceptions[0].type,
          startTime: staff.exceptions[0].startTime,
          endTime: staff.exceptions[0].endTime,
        }
      : null,
  })
  if (windows.length === 0) {
    throw new Error("That person is not rostered on this date.")
  }

  const endAt = new Date(startAt.getTime() + service.durationMins * 60_000)
  const startMins =
    startAt.getUTCHours() * 60 + startAt.getUTCMinutes()
  const endMins = endAt.getUTCHours() * 60 + endAt.getUTCMinutes()
  const fits = windows.some((window) => {
    const winStart = parseTimeToMinutes(window.startTime)
    const winEnd = parseTimeToMinutes(window.endTime)
    return startMins >= winStart && endMins <= winEnd
  })
  if (!fits) {
    throw new Error("Slot is outside working hours.")
  }

  const notes = input.notes?.trim() || null
  if (notes && notes.length > 500) {
    throw new Error("Notes must be 500 characters or fewer.")
  }

  // Atomic overlap check + insert so two buyers cannot claim the same slot.
  const booking = await prisma.$transaction(async (tx) => {
    const overlap = await tx.booking.findFirst({
      where: {
        staffId: staff.id,
        status: { in: SLOT_BLOCKING },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    })
    if (overlap) {
      throw new Error("That slot was just taken. Pick another time.")
    }

    return tx.booking.create({
      data: {
        storeId: store.id,
        customerId: session.user.id,
        staffId: staff.id,
        serviceId: service.id,
        startAt,
        endAt,
        status: "CONFIRMED",
        notes,
      },
      select: { id: true },
    })
  })

  revalidateBookingPaths()

  return { success: true, bookingId: booking.id }
}

/** Buyer cancels their own upcoming grooming/clinic booking and frees the slot. */
export async function cancelCustomerBooking(
  bookingId: string
): Promise<{ success: true }> {
  const session = await requireBuyer()

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      customerId: session.user.id,
    },
    select: { id: true, status: true, startAt: true },
  })
  if (!booking) throw new Error("Booking not found.")
  if (!CANCELLABLE.includes(booking.status)) {
    throw new Error("This booking can no longer be cancelled.")
  }
  if (booking.startAt.getTime() <= Date.now()) {
    throw new Error("Past bookings cannot be cancelled.")
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  })

  revalidateBookingPaths()
  return { success: true }
}

export async function getServiceBookingMeta(serviceId: string): Promise<{
  id: string
  name: string
  vertical: ServiceVertical
  durationMins: number
  price: number
  staff: { id: string; name: string; title: string | null }[]
} | null> {
  const store = await requireActiveStore()
  const service = await prisma.bookableService.findFirst({
    where: { id: serviceId, storeId: store.id, isActive: true },
    include: {
      staffLinks: {
        include: {
          staff: {
            select: { id: true, name: true, title: true, isActive: true },
          },
        },
      },
    },
  })
  if (!service) return null

  return {
    id: service.id,
    name: service.name,
    vertical: service.vertical,
    durationMins: service.durationMins,
    price: toAmount(service.price),
    staff: service.staffLinks
      .filter((link) => link.staff.isActive)
      .map((link) => ({
        id: link.staff.id,
        name: link.staff.name,
        title: link.staff.title,
      })),
  }
}

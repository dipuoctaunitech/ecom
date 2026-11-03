import { prisma } from "@/lib/prisma"
import { toAmount } from "@/lib/money"
import {
  dayOfWeekFromDateKey,
  generateAvailableSlots,
  minutesToTime,
  todayDateKey,
} from "@/lib/roster"
import type { ServiceVertical, StaffType } from "@prisma/client"
import type {
  VerticalService,
  VerticalStaff,
  VerticalTimeFrame,
} from "@/components/booking/ServiceVerticalPage"

function staffTypeFor(vertical: ServiceVertical): StaffType {
  return vertical === "GROOMING" ? "GROOMER" : "DOCTOR"
}

/** Shared loader so /grooming and /clinic stay in lockstep. */
export async function loadVerticalPageData(
  storeId: string,
  vertical: ServiceVertical
): Promise<{
  services: VerticalService[]
  staff: VerticalStaff[]
  timeFrames: VerticalTimeFrame[]
}> {
  const dateKey = todayDateKey()
  const dow = dayOfWeekFromDateKey(dateKey)
  const staffType = staffTypeFor(vertical)

  const [services, staff, frames] = await Promise.all([
    prisma.bookableService.findMany({
      where: { storeId, vertical, isActive: true },
      include: {
        staffLinks: {
          include: {
            staff: {
              select: { id: true, name: true, title: true, isActive: true },
            },
          },
        },
        comboItems: {
          include: { service: { select: { name: true } } },
          orderBy: { service: { name: "asc" } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.staffMember.findMany({
      where: { storeId, type: staffType, isActive: true },
      include: {
        weeklyRoster: { select: { dayOfWeek: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.serviceTimeFrame.findMany({
      where: { storeId, vertical, isActive: true },
      include: {
        staffLinks: {
          include: {
            staff: { select: { name: true, isActive: true } },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
    }),
  ])

  const timeFrames = frames
    .filter(
      (frame) =>
        frame.daysOfWeek.length === 0 || frame.daysOfWeek.includes(dow)
    )
    .map((frame) => {
      const previewSlots = generateAvailableSlots({
        dateKey,
        window: {
          startTime: frame.startTime,
          endTime: frame.endTime,
          slotDurationMins: frame.slotDurationMins,
        },
        durationMins: frame.slotDurationMins,
        bookings: [],
      }).map((iso) => {
        const dt = new Date(iso)
        return minutesToTime(dt.getUTCHours() * 60 + dt.getUTCMinutes())
      })

      return {
        id: frame.id,
        name: frame.name,
        startTime: frame.startTime,
        endTime: frame.endTime,
        staffNames: frame.staffLinks
          .filter((link) => link.staff.isActive)
          .map((link) => link.staff.name),
        previewSlots,
      }
    })

  return {
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMins: service.durationMins,
      price: toAmount(service.price),
      compareAtPrice:
        service.compareAtPrice != null
          ? toAmount(service.compareAtPrice)
          : null,
      loyaltyPoints: service.loyaltyPoints,
      imageUrl: service.imageUrl,
      isCombo: service.isCombo,
      includedServiceNames: service.comboItems.map((item) => item.service.name),
      staff: service.staffLinks
        .filter((link) => link.staff.isActive)
        .map((link) => ({
          id: link.staff.id,
          name: link.staff.name,
          title: link.staff.title,
        })),
    })),
    staff: staff.map((member) => ({
      id: member.id,
      name: member.name,
      title: member.title,
      bio: member.bio,
      rosterDays: member.weeklyRoster.map((row) => row.dayOfWeek),
    })),
    timeFrames,
  }
}

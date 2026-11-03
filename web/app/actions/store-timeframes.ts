"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { canManageStoreCatalog, requireActiveStore } from "@/lib/store"
import {
  generateAvailableSlots,
  minutesToTime,
  normalizeTime,
  parseTimeToMinutes,
  todayDateKey,
} from "@/lib/roster"
import type { ServiceVertical, StaffType } from "@prisma/client"

export type TimeFrameStaffOption = {
  id: string
  name: string
  title: string | null
  isActive: boolean
}

export type ManagedTimeFrame = {
  id: string
  vertical: ServiceVertical
  name: string
  startTime: string
  endTime: string
  slotDurationMins: number
  daysOfWeek: number[]
  isActive: boolean
  sortOrder: number
  staffIds: string[]
  staffNames: string[]
  /** Preview slot starts for today (HH:mm), ignoring bookings. */
  previewSlots: string[]
}

export type TimeFrameBoard = {
  vertical: ServiceVertical
  frames: ManagedTimeFrame[]
  staff: TimeFrameStaffOption[]
}

export type TimeFrameInput = {
  vertical: ServiceVertical
  name: string
  startTime: string
  endTime: string
  slotDurationMins?: number
  daysOfWeek?: number[]
  isActive?: boolean
  staffIds?: string[]
}

async function requireFrameManager() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }
  const allowed = await canManageStoreCatalog(session.user.id)
  if (!allowed) {
    throw new Error(
      "Unauthorized. Only admins and store managers can edit time frames."
    )
  }
  return session
}

function revalidateFramePaths() {
  revalidatePath("/admin")
  revalidatePath("/seller")
  revalidatePath("/manager")
  revalidatePath("/grooming")
  revalidatePath("/clinic")
}

function staffTypeForVertical(vertical: ServiceVertical): StaffType {
  return vertical === "GROOMING" ? "GROOMER" : "DOCTOR"
}

function assertFrameFields(data: TimeFrameInput) {
  const name = data.name.trim()
  if (name.length < 2 || name.length > 60) {
    throw new Error("Frame name must be 2–60 characters.")
  }
  if (data.vertical !== "GROOMING" && data.vertical !== "CLINIC") {
    throw new Error("Pick Grooming or Clinic.")
  }

  const startTime = normalizeTime(data.startTime)
  const endTime = normalizeTime(data.endTime)
  let startMins: number
  let endMins: number
  try {
    startMins = parseTimeToMinutes(startTime)
    endMins = parseTimeToMinutes(endTime)
  } catch {
    throw new Error("Times must be HH:mm.")
  }
  if (endMins <= startMins) {
    throw new Error("End time must be after start time (same day).")
  }

  const slotDurationMins = data.slotDurationMins ?? 30
  if (slotDurationMins < 10 || slotDurationMins > 180) {
    throw new Error("Slot length must be 10–180 minutes.")
  }

  const daysOfWeek = [...new Set(data.daysOfWeek ?? [])].filter(
    (day) => day >= 0 && day <= 6
  )

  return {
    name,
    vertical: data.vertical,
    startTime,
    endTime,
    slotDurationMins: Math.round(slotDurationMins),
    daysOfWeek,
    isActive: data.isActive !== false,
    staffIds: [...new Set(data.staffIds ?? [])],
  }
}

function previewSlotsForFrame(frame: {
  startTime: string
  endTime: string
  slotDurationMins: number
}): string[] {
  const dateKey = todayDateKey()
  return generateAvailableSlots({
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
}

function mapFrame(row: {
  id: string
  vertical: ServiceVertical
  name: string
  startTime: string
  endTime: string
  slotDurationMins: number
  daysOfWeek: number[]
  isActive: boolean
  sortOrder: number
  staffLinks: { staffId: string; staff: { name: string } }[]
}): ManagedTimeFrame {
  return {
    id: row.id,
    vertical: row.vertical,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    slotDurationMins: row.slotDurationMins,
    daysOfWeek: row.daysOfWeek,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    staffIds: row.staffLinks.map((link) => link.staffId),
    staffNames: row.staffLinks.map((link) => link.staff.name),
    previewSlots: previewSlotsForFrame(row),
  }
}

const frameInclude = {
  staffLinks: {
    include: { staff: { select: { name: true } } },
    orderBy: { staff: { name: "asc" as const } },
  },
}

export async function getTimeFrameBoard(
  vertical: ServiceVertical = "GROOMING"
): Promise<TimeFrameBoard> {
  await requireFrameManager()
  const store = await requireActiveStore()
  const staffType = staffTypeForVertical(vertical)

  const [frames, staff] = await Promise.all([
    prisma.serviceTimeFrame.findMany({
      where: { storeId: store.id, vertical },
      include: frameInclude,
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
    }),
    prisma.staffMember.findMany({
      where: { storeId: store.id, type: staffType },
      select: { id: true, name: true, title: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  ])

  return {
    vertical,
    frames: frames.map(mapFrame),
    staff,
  }
}

export async function createTimeFrame(
  data: TimeFrameInput
): Promise<{ success: true; frame: ManagedTimeFrame }> {
  await requireFrameManager()
  const store = await requireActiveStore()
  const fields = assertFrameFields(data)

  await assertStaffBelong(
    store.id,
    fields.vertical,
    fields.staffIds
  )
  await assertNoOverlap(store.id, fields)

  const maxOrder = await prisma.serviceTimeFrame.aggregate({
    where: { storeId: store.id, vertical: fields.vertical },
    _max: { sortOrder: true },
  })

  const created = await prisma.serviceTimeFrame.create({
    data: {
      storeId: store.id,
      vertical: fields.vertical,
      name: fields.name,
      startTime: fields.startTime,
      endTime: fields.endTime,
      slotDurationMins: fields.slotDurationMins,
      daysOfWeek: fields.daysOfWeek,
      isActive: fields.isActive,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      staffLinks: {
        create: fields.staffIds.map((staffId) => ({ staffId })),
      },
    },
    include: frameInclude,
  })

  revalidateFramePaths()
  return { success: true, frame: mapFrame(created) }
}

export async function updateTimeFrame(
  frameId: string,
  data: TimeFrameInput
): Promise<{ success: true; frame: ManagedTimeFrame }> {
  await requireFrameManager()
  const store = await requireActiveStore()
  const fields = assertFrameFields(data)

  const existing = await prisma.serviceTimeFrame.findFirst({
    where: { id: frameId, storeId: store.id },
    select: { id: true, vertical: true },
  })
  if (!existing) throw new Error("Time frame not found.")
  if (existing.vertical !== fields.vertical) {
    throw new Error("Cannot change a frame’s vertical.")
  }

  await assertStaffBelong(store.id, fields.vertical, fields.staffIds)
  await assertNoOverlap(store.id, fields, frameId)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.timeFrameStaff.deleteMany({ where: { timeFrameId: frameId } })
    return tx.serviceTimeFrame.update({
      where: { id: frameId },
      data: {
        name: fields.name,
        startTime: fields.startTime,
        endTime: fields.endTime,
        slotDurationMins: fields.slotDurationMins,
        daysOfWeek: fields.daysOfWeek,
        isActive: fields.isActive,
        staffLinks: {
          create: fields.staffIds.map((staffId) => ({ staffId })),
        },
      },
      include: frameInclude,
    })
  })

  revalidateFramePaths()
  return { success: true, frame: mapFrame(updated) }
}

export async function deleteTimeFrame(
  frameId: string
): Promise<{ success: true }> {
  await requireFrameManager()
  const store = await requireActiveStore()

  const existing = await prisma.serviceTimeFrame.findFirst({
    where: { id: frameId, storeId: store.id },
    select: { id: true },
  })
  if (!existing) throw new Error("Time frame not found.")

  await prisma.serviceTimeFrame.delete({ where: { id: frameId } })
  revalidateFramePaths()
  return { success: true }
}

export async function setTimeFrameActive(
  frameId: string,
  isActive: boolean
): Promise<{ success: true }> {
  await requireFrameManager()
  const store = await requireActiveStore()

  const existing = await prisma.serviceTimeFrame.findFirst({
    where: { id: frameId, storeId: store.id },
    select: { id: true },
  })
  if (!existing) throw new Error("Time frame not found.")

  await prisma.serviceTimeFrame.update({
    where: { id: frameId },
    data: { isActive },
  })
  revalidateFramePaths()
  return { success: true }
}

async function assertStaffBelong(
  storeId: string,
  vertical: ServiceVertical,
  staffIds: string[]
) {
  if (staffIds.length === 0) return
  const staffType = staffTypeForVertical(vertical)
  const rows = await prisma.staffMember.findMany({
    where: {
      storeId,
      type: staffType,
      id: { in: staffIds },
      isActive: true,
    },
    select: { id: true },
  })
  if (rows.length !== staffIds.length) {
    throw new Error("Map only active staff from this vertical.")
  }
}

async function assertNoOverlap(
  storeId: string,
  fields: {
    vertical: ServiceVertical
    startTime: string
    endTime: string
    daysOfWeek: number[]
  },
  excludeId?: string
) {
  const others = await prisma.serviceTimeFrame.findMany({
    where: {
      storeId,
      vertical: fields.vertical,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      daysOfWeek: true,
    },
  })

  const start = parseTimeToMinutes(fields.startTime)
  const end = parseTimeToMinutes(fields.endTime)
  const days =
    fields.daysOfWeek.length === 0
      ? [0, 1, 2, 3, 4, 5, 6]
      : fields.daysOfWeek

  for (const other of others) {
    const otherDays =
      other.daysOfWeek.length === 0
        ? [0, 1, 2, 3, 4, 5, 6]
        : other.daysOfWeek
    const sharesDay = days.some((day) => otherDays.includes(day))
    if (!sharesDay) continue

    const oStart = parseTimeToMinutes(other.startTime)
    const oEnd = parseTimeToMinutes(other.endTime)
    if (start < oEnd && end > oStart) {
      throw new Error(
        `Overlaps “${other.name}” (${other.startTime}–${other.endTime}). Adjust times or days.`
      )
    }
  }
}

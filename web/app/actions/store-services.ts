"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { canManageStoreCatalog, requireActiveStore } from "@/lib/store"
import { isValidServiceImageUrl } from "@/lib/auth-guards"
import { toAmount } from "@/lib/money"
import { assertValidLoyaltyPoints } from "@/lib/product-meta"
import type { ServiceVertical } from "@prisma/client"

export type ManagedService = {
  id: string
  vertical: ServiceVertical
  name: string
  description: string
  durationMins: number
  price: number
  compareAtPrice: number | null
  loyaltyPoints: number
  imageUrl: string | null
  isCombo: boolean
  isActive: boolean
  sortOrder: number
  includedServiceIds: string[]
  includedServiceNames: string[]
}

export type ServiceInput = {
  vertical: ServiceVertical
  name: string
  description: string
  durationMins: number
  price: number
  compareAtPrice?: number | null
  loyaltyPoints?: number
  imageUrl?: string | null
  isCombo?: boolean
  isActive?: boolean
  includedServiceIds?: string[]
}

async function requireServiceManager() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }
  const allowed = await canManageStoreCatalog(session.user.id)
  if (!allowed) {
    throw new Error(
      "Unauthorized. Only admins and store managers can edit services."
    )
  }
  return session
}

function revalidateServicePaths() {
  revalidatePath("/admin")
  revalidatePath("/seller")
  revalidatePath("/manager")
  revalidatePath("/grooming")
  revalidatePath("/clinic")
}

function mapService(row: {
  id: string
  vertical: ServiceVertical
  name: string
  description: string
  durationMins: number
  price: { toString(): string } | number
  compareAtPrice: { toString(): string } | number | null
  loyaltyPoints: number
  imageUrl: string | null
  isCombo: boolean
  isActive: boolean
  sortOrder: number
  comboItems: { serviceId: string; service: { name: string } }[]
}): ManagedService {
  return {
    id: row.id,
    vertical: row.vertical,
    name: row.name,
    description: row.description,
    durationMins: row.durationMins,
    price: toAmount(row.price),
    compareAtPrice:
      row.compareAtPrice != null ? toAmount(row.compareAtPrice) : null,
    loyaltyPoints: row.loyaltyPoints,
    imageUrl: row.imageUrl,
    isCombo: row.isCombo,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    includedServiceIds: row.comboItems.map((item) => item.serviceId),
    includedServiceNames: row.comboItems.map((item) => item.service.name),
  }
}

const serviceInclude = {
  comboItems: {
    include: { service: { select: { name: true } } },
    orderBy: { service: { name: "asc" as const } },
  },
}

function assertServiceFields(data: ServiceInput) {
  const name = data.name.trim()
  if (name.length < 2 || name.length > 80) {
    throw new Error("Service name must be 2–80 characters.")
  }
  const description = data.description.trim()
  if (description.length < 8 || description.length > 2000) {
    throw new Error("Description must be 8–2000 characters.")
  }
  if (
    !Number.isFinite(data.durationMins) ||
    data.durationMins < 10 ||
    data.durationMins > 480
  ) {
    throw new Error("Duration must be between 10 and 480 minutes.")
  }
  if (!Number.isFinite(data.price) || data.price < 0) {
    throw new Error("Price must be zero or greater.")
  }

  let compareAtPrice: number | null = null
  if (
    data.compareAtPrice !== undefined &&
    data.compareAtPrice !== null &&
    !(typeof data.compareAtPrice === "number" && Number.isNaN(data.compareAtPrice))
  ) {
    if (!Number.isFinite(data.compareAtPrice) || data.compareAtPrice < 0) {
      throw new Error("Compare-at price must be zero or greater.")
    }
    if (data.compareAtPrice <= data.price) {
      throw new Error("Offer price needs a higher compare-at (original) price.")
    }
    compareAtPrice = data.compareAtPrice
  }

  let imageUrl: string | null = null
  if (data.imageUrl) {
    if (!isValidServiceImageUrl(data.imageUrl)) {
      throw new Error("Upload a service image through the app, or use Unsplash.")
    }
    imageUrl = data.imageUrl
  }

  const loyaltyRaw =
    data.loyaltyPoints === undefined ||
    data.loyaltyPoints === null ||
    Number.isNaN(data.loyaltyPoints)
      ? 0
      : data.loyaltyPoints
  const loyaltyPoints = assertValidLoyaltyPoints(Math.round(loyaltyRaw))

  const vertical = data.vertical
  if (vertical !== "GROOMING" && vertical !== "CLINIC") {
    throw new Error("Pick Grooming or Clinic.")
  }

  return {
    name,
    description,
    durationMins: Math.round(data.durationMins),
    price: data.price,
    compareAtPrice,
    loyaltyPoints,
    imageUrl,
    isCombo: Boolean(data.isCombo),
    isActive: data.isActive !== false,
    vertical,
    includedServiceIds: [...new Set(data.includedServiceIds ?? [])],
  }
}

export async function getManagedServices(
  vertical?: ServiceVertical
): Promise<ManagedService[]> {
  await requireServiceManager()
  const store = await requireActiveStore()

  const rows = await prisma.bookableService.findMany({
    where: {
      storeId: store.id,
      ...(vertical ? { vertical } : {}),
    },
    include: serviceInclude,
    orderBy: [{ vertical: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  })

  return rows.map(mapService)
}

export async function createBookableService(
  data: ServiceInput
): Promise<{ success: true; service: ManagedService }> {
  await requireServiceManager()
  const store = await requireActiveStore()
  const fields = assertServiceFields(data)

  if (fields.isCombo && fields.includedServiceIds.length < 2) {
    throw new Error("A combo needs at least two included services.")
  }

  if (fields.includedServiceIds.length > 0) {
    const included = await prisma.bookableService.findMany({
      where: {
        storeId: store.id,
        vertical: fields.vertical,
        id: { in: fields.includedServiceIds },
        isCombo: false,
        isActive: true,
      },
      select: { id: true },
    })
    if (included.length !== fields.includedServiceIds.length) {
      throw new Error(
        "Combo items must be active base services in the same vertical."
      )
    }
  }

  const maxOrder = await prisma.bookableService.aggregate({
    where: { storeId: store.id, vertical: fields.vertical },
    _max: { sortOrder: true },
  })

  const created = await prisma.bookableService.create({
    data: {
      storeId: store.id,
      vertical: fields.vertical,
      name: fields.name,
      description: fields.description,
      durationMins: fields.durationMins,
      price: fields.price,
      compareAtPrice: fields.compareAtPrice,
      loyaltyPoints: fields.loyaltyPoints,
      imageUrl: fields.imageUrl,
      isCombo: fields.isCombo,
      isActive: fields.isActive,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      comboItems: fields.isCombo
        ? {
            create: fields.includedServiceIds.map((serviceId) => ({
              serviceId,
            })),
          }
        : undefined,
    },
    include: serviceInclude,
  })

  revalidateServicePaths()
  return { success: true, service: mapService(created) }
}

export async function updateBookableService(
  serviceId: string,
  data: ServiceInput
): Promise<{ success: true; service: ManagedService }> {
  await requireServiceManager()
  const store = await requireActiveStore()
  const fields = assertServiceFields(data)

  const existing = await prisma.bookableService.findFirst({
    where: { id: serviceId, storeId: store.id },
    select: { id: true, vertical: true },
  })
  if (!existing) throw new Error("Service not found.")

  if (fields.vertical !== existing.vertical) {
    throw new Error("Cannot change a service’s vertical.")
  }

  if (fields.isCombo && fields.includedServiceIds.length < 2) {
    throw new Error("A combo needs at least two included services.")
  }

  if (fields.includedServiceIds.includes(serviceId)) {
    throw new Error("A combo cannot include itself.")
  }

  if (fields.isCombo && fields.includedServiceIds.length > 0) {
    const included = await prisma.bookableService.findMany({
      where: {
        storeId: store.id,
        vertical: fields.vertical,
        id: { in: fields.includedServiceIds },
        isCombo: false,
      },
      select: { id: true },
    })
    if (included.length !== fields.includedServiceIds.length) {
      throw new Error(
        "Combo items must be base services (not other combos) in the same vertical."
      )
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.serviceComboItem.deleteMany({ where: { comboId: serviceId } })

    return tx.bookableService.update({
      where: { id: serviceId },
      data: {
        name: fields.name,
        description: fields.description,
        durationMins: fields.durationMins,
        price: fields.price,
        compareAtPrice: fields.compareAtPrice,
        loyaltyPoints: fields.loyaltyPoints,
        imageUrl: fields.imageUrl,
        isCombo: fields.isCombo,
        isActive: fields.isActive,
        comboItems: fields.isCombo
          ? {
              create: fields.includedServiceIds.map((id) => ({
                serviceId: id,
              })),
            }
          : undefined,
      },
      include: serviceInclude,
    })
  })

  revalidateServicePaths()
  return { success: true, service: mapService(updated) }
}

export async function setBookableServiceActive(
  serviceId: string,
  isActive: boolean
): Promise<{ success: true }> {
  await requireServiceManager()
  const store = await requireActiveStore()

  const existing = await prisma.bookableService.findFirst({
    where: { id: serviceId, storeId: store.id },
    select: { id: true },
  })
  if (!existing) throw new Error("Service not found.")

  await prisma.bookableService.update({
    where: { id: serviceId },
    data: { isActive },
  })

  revalidateServicePaths()
  return { success: true }
}

export async function deleteBookableService(
  serviceId: string
): Promise<{ success: true }> {
  await requireServiceManager()
  const store = await requireActiveStore()

  const existing = await prisma.bookableService.findFirst({
    where: { id: serviceId, storeId: store.id },
    include: { _count: { select: { bookings: true } } },
  })
  if (!existing) throw new Error("Service not found.")

  if (existing._count.bookings > 0) {
    await prisma.bookableService.update({
      where: { id: serviceId },
      data: { isActive: false },
    })
    revalidateServicePaths()
    throw new Error(
      "This service has bookings, so it was deactivated instead of deleted."
    )
  }

  await prisma.bookableService.delete({ where: { id: serviceId } })
  revalidateServicePaths()
  return { success: true }
}

export async function reorderBookableServices(
  vertical: ServiceVertical,
  orderedIds: string[]
): Promise<{ success: true }> {
  await requireServiceManager()
  const store = await requireActiveStore()

  if (orderedIds.length === 0) {
    throw new Error("Provide the service order.")
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new Error("Duplicate service ids in order list.")
  }

  const existing = await prisma.bookableService.findMany({
    where: { storeId: store.id, vertical },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((row) => row.id))
  if (
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("Order list must include every service in this vertical.")
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.bookableService.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    )
  )

  revalidateServicePaths()
  return { success: true }
}

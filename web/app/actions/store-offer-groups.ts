"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getStoreCatalogAccess } from "@/lib/store"
import {
  assertValidOfferGroupCopy,
  assertValidOfferPercentRange,
} from "@/lib/validation"

export type StoreOfferGroup = {
  id: string
  title: string
  description: string
  minPercent: number
  maxPercent: number
  sortOrder: number
  isActive: boolean
}

async function requireCatalogManager() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }

  const access = await getStoreCatalogAccess(session.user.id)
  if (!access.ok) {
    throw new Error(
      "Unauthorized. Only admins and store managers can edit offer groups."
    )
  }

  return session
}

function revalidateOfferPaths() {
  revalidatePath("/admin")
  revalidatePath("/seller")
  revalidatePath("/manager")
  revalidatePath("/items")
  revalidatePath("/")
}

function mapGroup(group: {
  id: string
  title: string
  description: string
  minPercent: number
  maxPercent: number
  sortOrder: number
  isActive: boolean
}): StoreOfferGroup {
  return {
    id: group.id,
    title: group.title,
    description: group.description,
    minPercent: group.minPercent,
    maxPercent: group.maxPercent,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
  }
}

async function assertNoOverlap(
  minPercent: number,
  maxPercent: number,
  excludeId?: string
) {
  const others = await prisma.offerGroup.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { id: true, title: true, minPercent: true, maxPercent: true },
  })

  const clash = others.find(
    (group) =>
      minPercent <= group.maxPercent && maxPercent >= group.minPercent
  )
  if (clash) {
    throw new Error(
      `That range overlaps “${clash.title}” (${clash.minPercent}–${clash.maxPercent}% off).`
    )
  }
}

export async function getStoreOfferGroups(): Promise<StoreOfferGroup[]> {
  await requireCatalogManager()

  const groups = await prisma.offerGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { minPercent: "asc" }],
  })

  return groups.map(mapGroup)
}

export async function createStoreOfferGroup(data: {
  title: string
  description: string
  minPercent: number
  maxPercent: number
}): Promise<{ success: true; group: StoreOfferGroup }> {
  await requireCatalogManager()

  const { title, description } = assertValidOfferGroupCopy(data)
  const { minPercent, maxPercent } = assertValidOfferPercentRange(
    data.minPercent,
    data.maxPercent
  )
  await assertNoOverlap(minPercent, maxPercent)

  const maxOrder = await prisma.offerGroup.aggregate({
    _max: { sortOrder: true },
  })

  const group = await prisma.offerGroup.create({
    data: {
      title,
      description,
      minPercent,
      maxPercent,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      isActive: true,
    },
  })

  revalidateOfferPaths()
  return { success: true, group: mapGroup(group) }
}

export async function updateStoreOfferGroup(
  groupId: string,
  data: {
    title?: string
    description?: string
    minPercent?: number
    maxPercent?: number
    isActive?: boolean
  }
): Promise<{ success: true; group: StoreOfferGroup }> {
  await requireCatalogManager()

  const existing = await prisma.offerGroup.findUnique({
    where: { id: groupId },
  })
  if (!existing) {
    throw new Error("Offer group not found.")
  }

  const title =
    data.title !== undefined
      ? assertValidOfferGroupCopy({
          title: data.title,
          description: data.description ?? existing.description,
        }).title
      : existing.title
  const description =
    data.description !== undefined
      ? assertValidOfferGroupCopy({
          title: data.title ?? existing.title,
          description: data.description,
        }).description
      : existing.description

  const minPercent = data.minPercent ?? existing.minPercent
  const maxPercent = data.maxPercent ?? existing.maxPercent
  assertValidOfferPercentRange(minPercent, maxPercent)
  await assertNoOverlap(minPercent, maxPercent, groupId)

  const group = await prisma.offerGroup.update({
    where: { id: groupId },
    data: {
      title,
      description,
      minPercent,
      maxPercent,
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })

  revalidateOfferPaths()
  return { success: true, group: mapGroup(group) }
}

export async function deleteStoreOfferGroup(groupId: string) {
  await requireCatalogManager()

  const group = await prisma.offerGroup.findUnique({
    where: { id: groupId },
    select: { id: true },
  })
  if (!group) {
    throw new Error("Offer group not found.")
  }

  await prisma.offerGroup.delete({ where: { id: groupId } })

  const remaining = await prisma.offerGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { minPercent: "asc" }],
    select: { id: true },
  })
  if (remaining.length > 0) {
    await prisma.$transaction(
      remaining.map((item, index) =>
        prisma.offerGroup.update({
          where: { id: item.id },
          data: { sortOrder: index },
        })
      )
    )
  }

  revalidateOfferPaths()
  return { success: true as const }
}

export async function reorderStoreOfferGroups(orderedIds: string[]) {
  await requireCatalogManager()

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error("Provide the offer group order.")
  }

  const uniqueIds = [...new Set(orderedIds)]
  if (uniqueIds.length !== orderedIds.length) {
    throw new Error("Duplicate offer group ids in order list.")
  }

  const existing = await prisma.offerGroup.findMany({ select: { id: true } })
  const existingIds = new Set(existing.map((g) => g.id))

  if (
    uniqueIds.length !== existingIds.size ||
    uniqueIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("Order list must include every offer group exactly once.")
  }

  await prisma.$transaction(
    uniqueIds.map((id, index) =>
      prisma.offerGroup.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidateOfferPaths()
  return { success: true as const }
}

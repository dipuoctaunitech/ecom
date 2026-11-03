"use server"

import { requireManagerSession } from "@/lib/auth-guards"
import { getStoreMembership } from "@/lib/store"
import { prisma } from "@/lib/prisma"

export type ManagerProfile = {
  id: string
  name: string | null
  email: string | null
  storeId: string
  storeName: string
}

export type ManagerOverview = {
  serviceCount: number
  activeServiceCount: number
  categoryCount: number
  collectionCount: number
  offerGroupCount: number
  staffCount: number
  openBookingCount: number
}

export async function getManagerProfile(): Promise<ManagerProfile | null> {
  const session = await requireManagerSession()
  if (!session?.user?.id) return null

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    }),
    getStoreMembership(session.user.id),
  ])

  if (!user || !membership || membership.role !== "MANAGER") {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    storeId: membership.storeId,
    storeName: membership.storeName,
  }
}

export async function getManagerOverview(): Promise<ManagerOverview> {
  const session = await requireManagerSession()
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Manager access required.")
  }

  const membership = await getStoreMembership(session.user.id)
  if (!membership || membership.role !== "MANAGER") {
    throw new Error("Unauthorized. Manager access required.")
  }

  const storeId = membership.storeId

  const [
    serviceCount,
    activeServiceCount,
    categoryCount,
    collectionCount,
    offerGroupCount,
    staffCount,
    openBookingCount,
  ] = await Promise.all([
    prisma.bookableService.count({ where: { storeId } }),
    prisma.bookableService.count({ where: { storeId, isActive: true } }),
    prisma.category.count({ where: { sellerId: null } }),
    prisma.petCollection.count(),
    prisma.offerGroup.count({ where: { isActive: true } }),
    prisma.staffMember.count({ where: { storeId, isActive: true } }),
    prisma.booking.count({
      where: {
        storeId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
  ])

  return {
    serviceCount,
    activeServiceCount,
    categoryCount,
    collectionCount,
    offerGroupCount,
    staffCount,
    openBookingCount,
  }
}

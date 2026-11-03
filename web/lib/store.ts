import { prisma } from "@/lib/prisma"
import type { StoreMemberRole } from "@prisma/client"

/** Default tenant slug until multi-tenant routing (subdomain / path) exists. */
export const DEFAULT_STORE_SLUG = "forma"

/**
 * Resolve the active store for the request.
 * Today: single default store. Later: derive from host, path, or session.
 */
export async function getActiveStore() {
  const store = await prisma.store.findFirst({
    where: { slug: DEFAULT_STORE_SLUG, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      ownerId: true,
    },
  })

  return store
}

export async function requireActiveStore() {
  const store = await getActiveStore()
  if (!store) {
    throw new Error(
      `No active store found for slug "${DEFAULT_STORE_SLUG}". Run the database seed.`
    )
  }
  return store
}

const CATALOG_MANAGER_ROLES: StoreMemberRole[] = ["OWNER", "MANAGER"]

/**
 * Who may edit store-wide Shop by Category entries:
 * platform ADMIN, or store OWNER / MANAGER.
 */
export async function getStoreCatalogAccess(userId: string): Promise<
  | { ok: true; isAdmin: true }
  | { ok: true; isAdmin: false; storeRole: StoreMemberRole }
  | { ok: false }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role === "ADMIN") {
    return { ok: true, isAdmin: true }
  }

  const store = await getActiveStore()
  if (!store) return { ok: false }

  const member = await prisma.storeMember.findUnique({
    where: {
      storeId_userId: { storeId: store.id, userId },
    },
    select: { role: true },
  })

  if (member && CATALOG_MANAGER_ROLES.includes(member.role)) {
    return { ok: true, isAdmin: false, storeRole: member.role }
  }

  return { ok: false }
}

export async function canManageStoreCatalog(userId: string): Promise<boolean> {
  const access = await getStoreCatalogAccess(userId)
  return access.ok
}

/** Active-store membership for a user, if any. */
export async function getStoreMembership(userId: string): Promise<{
  storeId: string
  storeName: string
  role: StoreMemberRole
} | null> {
  const store = await getActiveStore()
  if (!store) return null

  const member = await prisma.storeMember.findUnique({
    where: {
      storeId_userId: { storeId: store.id, userId },
    },
    select: { role: true },
  })

  if (!member) return null

  return {
    storeId: store.id,
    storeName: store.name,
    role: member.role,
  }
}

export async function isStoreManager(userId: string): Promise<boolean> {
  const membership = await getStoreMembership(userId)
  return membership?.role === "MANAGER"
}

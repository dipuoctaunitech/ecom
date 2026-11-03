"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { assertValidCategoryName, toCategorySlug } from "@/lib/validation"
import { isValidStoreCategoryImageUrl } from "@/lib/auth-guards"
import { getStoreCatalogAccess } from "@/lib/store"

export type StoreCategory = {
  id: string
  name: string
  slug: string
  image: string | null
  sortOrder: number
  productCount: number
}

async function requireCatalogManager() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }

  const access = await getStoreCatalogAccess(session.user.id)
  if (!access.ok) {
    throw new Error(
      "Unauthorized. Only admins and store managers can edit shop categories."
    )
  }

  return session
}

function revalidateCategoryPaths() {
  revalidatePath("/admin")
  revalidatePath("/seller")
  revalidatePath("/manager")
  revalidatePath("/items")
  revalidatePath("/")
}

export async function getStoreCategories(): Promise<StoreCategory[]> {
  await requireCatalogManager()

  const categories = await prisma.category.findMany({
    where: { sellerId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  })

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    sortOrder: category.sortOrder,
    productCount: category._count.products,
  }))
}

export async function createStoreCategory(data: {
  name: string
  image: string
}): Promise<{ success: true; category: StoreCategory }> {
  await requireCatalogManager()

  const name = assertValidCategoryName(data.name)
  if (!isValidStoreCategoryImageUrl(data.image)) {
    throw new Error("Upload a category cover image through the app.")
  }

  const slug = toCategorySlug(name)
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (existing) {
    throw new Error("A shop category with that name already exists.")
  }

  const maxOrder = await prisma.category.aggregate({
    where: { sellerId: null },
    _max: { sortOrder: true },
  })
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      image: data.image,
      sellerId: null,
      sortOrder,
    },
    include: { _count: { select: { products: true } } },
  })

  revalidateCategoryPaths()

  return {
    success: true,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
    },
  }
}

export async function updateStoreCategory(
  categoryId: string,
  data: { name?: string; image?: string }
): Promise<{ success: true; category: StoreCategory }> {
  await requireCatalogManager()

  const existing = await prisma.category.findFirst({
    where: { id: categoryId, sellerId: null },
    select: { id: true, slug: true },
  })
  if (!existing) {
    throw new Error("Shop category not found.")
  }

  const updates: { name?: string; slug?: string; image?: string } = {}

  if (data.name !== undefined) {
    const name = assertValidCategoryName(data.name)
    const slug = toCategorySlug(name)
    if (slug !== existing.slug) {
      const clash = await prisma.category.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (clash) {
        throw new Error("A shop category with that name already exists.")
      }
      updates.slug = slug
    }
    updates.name = name
  }

  if (data.image !== undefined) {
    if (!isValidStoreCategoryImageUrl(data.image)) {
      throw new Error("Upload a category cover image through the app.")
    }
    updates.image = data.image
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: updates,
    include: { _count: { select: { products: true } } },
  })

  revalidateCategoryPaths()

  return {
    success: true,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
    },
  }
}

export async function deleteStoreCategory(categoryId: string) {
  await requireCatalogManager()

  const category = await prisma.category.findFirst({
    where: { id: categoryId, sellerId: null },
    select: { id: true },
  })
  if (!category) {
    throw new Error("Shop category not found.")
  }

  await prisma.category.delete({ where: { id: categoryId } })
  revalidateCategoryPaths()
  return { success: true as const }
}

/** Persist display order for Shop by Category. `orderedIds` is first → last. */
export async function reorderStoreCategories(orderedIds: string[]) {
  await requireCatalogManager()

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error("Provide the category order.")
  }

  const uniqueIds = [...new Set(orderedIds)]
  if (uniqueIds.length !== orderedIds.length) {
    throw new Error("Duplicate category ids in order list.")
  }

  const existing = await prisma.category.findMany({
    where: { sellerId: null },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((c) => c.id))

  if (
    uniqueIds.length !== existingIds.size ||
    uniqueIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error("Order list must include every shop category exactly once.")
  }

  await prisma.$transaction(
    uniqueIds.map((id, index) =>
      prisma.category.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidateCategoryPaths()
  return { success: true as const }
}

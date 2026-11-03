"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import {
  assertValidCategoryName,
  assertValidCollectionTag,
  toCategorySlug,
} from "@/lib/validation"
import { isValidStoreCategoryImageUrl } from "@/lib/auth-guards"
import { getStoreCatalogAccess } from "@/lib/store"

export type StoreCollection = {
  id: string
  name: string
  slug: string
  tag: string
  image: string
  sortOrder: number
  categoryId: string | null
  categoryName: string | null
}

export type StoreCollectionCategoryOption = {
  id: string
  name: string
  slug: string
}

async function requireCatalogManager() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }

  const access = await getStoreCatalogAccess(session.user.id)
  if (!access.ok) {
    throw new Error(
      "Unauthorized. Only admins and store managers can edit pet collections."
    )
  }

  return session
}

function revalidateCollectionPaths() {
  revalidatePath("/admin")
  revalidatePath("/seller")
  revalidatePath("/manager")
  revalidatePath("/items")
  revalidatePath("/")
}

function mapCollection(collection: {
  id: string
  name: string
  slug: string
  tag: string
  image: string
  sortOrder: number
  categoryId: string | null
  category: { name: string } | null
}): StoreCollection {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    tag: collection.tag,
    image: collection.image,
    sortOrder: collection.sortOrder,
    categoryId: collection.categoryId,
    categoryName: collection.category?.name ?? null,
  }
}

export async function getStoreCollectionCategoryOptions(): Promise<
  StoreCollectionCategoryOption[]
> {
  await requireCatalogManager()

  return prisma.category.findMany({
    where: { sellerId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  })
}

export async function getStoreCollections(): Promise<StoreCollection[]> {
  await requireCatalogManager()

  const collections = await prisma.petCollection.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  })

  return collections.map(mapCollection)
}

export async function createStoreCollection(data: {
  name: string
  tag: string
  image: string
  categoryId?: string | null
}): Promise<{ success: true; collection: StoreCollection }> {
  await requireCatalogManager()

  const name = assertValidCategoryName(data.name)
  const tag = assertValidCollectionTag(data.tag)
  if (!isValidStoreCategoryImageUrl(data.image)) {
    throw new Error("Upload a collection cover image through the app.")
  }

  const slug = toCategorySlug(name)
  const existing = await prisma.petCollection.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (existing) {
    throw new Error("A pet collection with that name already exists.")
  }

  let categoryId: string | null = data.categoryId?.trim() || null
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, sellerId: null },
      select: { id: true },
    })
    if (!category) {
      throw new Error("Linked shop category not found.")
    }
  }

  const maxOrder = await prisma.petCollection.aggregate({
    _max: { sortOrder: true },
  })

  const collection = await prisma.petCollection.create({
    data: {
      name,
      slug,
      tag,
      image: data.image,
      categoryId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: { category: { select: { name: true } } },
  })

  revalidateCollectionPaths()
  return { success: true, collection: mapCollection(collection) }
}

export async function updateStoreCollection(
  collectionId: string,
  data: {
    name?: string
    tag?: string
    image?: string
    categoryId?: string | null
  }
): Promise<{ success: true; collection: StoreCollection }> {
  await requireCatalogManager()

  const existing = await prisma.petCollection.findUnique({
    where: { id: collectionId },
    select: { id: true, slug: true },
  })
  if (!existing) {
    throw new Error("Pet collection not found.")
  }

  const updates: {
    name?: string
    slug?: string
    tag?: string
    image?: string
    categoryId?: string | null
  } = {}

  if (data.name !== undefined) {
    const name = assertValidCategoryName(data.name)
    const slug = toCategorySlug(name)
    if (slug !== existing.slug) {
      const clash = await prisma.petCollection.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (clash) {
        throw new Error("A pet collection with that name already exists.")
      }
      updates.slug = slug
    }
    updates.name = name
  }

  if (data.tag !== undefined) {
    updates.tag = assertValidCollectionTag(data.tag)
  }

  if (data.image !== undefined) {
    if (!isValidStoreCategoryImageUrl(data.image)) {
      throw new Error("Upload a collection cover image through the app.")
    }
    updates.image = data.image
  }

  if (data.categoryId !== undefined) {
    const categoryId = data.categoryId?.trim() || null
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, sellerId: null },
        select: { id: true },
      })
      if (!category) {
        throw new Error("Linked shop category not found.")
      }
    }
    updates.categoryId = categoryId
  }

  const collection = await prisma.petCollection.update({
    where: { id: collectionId },
    data: updates,
    include: { category: { select: { name: true } } },
  })

  revalidateCollectionPaths()
  return { success: true, collection: mapCollection(collection) }
}

export async function deleteStoreCollection(collectionId: string) {
  await requireCatalogManager()

  const collection = await prisma.petCollection.findUnique({
    where: { id: collectionId },
    select: { id: true },
  })
  if (!collection) {
    throw new Error("Pet collection not found.")
  }

  await prisma.petCollection.delete({ where: { id: collectionId } })
  revalidateCollectionPaths()
  return { success: true as const }
}

export async function reorderStoreCollections(orderedIds: string[]) {
  await requireCatalogManager()

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error("Provide the collection order.")
  }

  const uniqueIds = [...new Set(orderedIds)]
  if (uniqueIds.length !== orderedIds.length) {
    throw new Error("Duplicate collection ids in order list.")
  }

  const existing = await prisma.petCollection.findMany({
    select: { id: true },
  })
  const existingIds = new Set(existing.map((c) => c.id))

  if (
    uniqueIds.length !== existingIds.size ||
    uniqueIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error(
      "Order list must include every pet collection exactly once."
    )
  }

  await prisma.$transaction(
    uniqueIds.map((id, index) =>
      prisma.petCollection.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  revalidateCollectionPaths()
  return { success: true as const }
}

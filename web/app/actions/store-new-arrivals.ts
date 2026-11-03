"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getStoreCatalogAccess } from "@/lib/store"
import { NEW_ARRIVALS_LIMIT } from "@/lib/new-arrivals"
import { resolveProductImageUrl } from "@/lib/images"

export type NewArrivalManagedItem = {
  id: string
  productId: string
  sortOrder: number
  title: string
  imageUrl: string
  price: number
  createdAt: string
}

export type NewArrivalProductOption = {
  id: string
  title: string
  imageUrl: string
  price: number
  createdAt: string
  alreadyListed: boolean
}

async function requireCatalogManager() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized. Sign in required.")
  }

  const access = await getStoreCatalogAccess(session.user.id)
  if (!access.ok) {
    throw new Error(
      "Unauthorized. Only admins and store managers can edit New Arrivals."
    )
  }

  return session
}

function revalidateNewArrivalPaths() {
  revalidatePath("/admin")
  revalidatePath("/seller")
  revalidatePath("/manager")
  revalidatePath("/items")
  revalidatePath("/")
}

function primaryImage(images: string[]): string {
  return resolveProductImageUrl(images[0] ?? "") || ""
}

export async function getManagedNewArrivals(): Promise<{
  items: NewArrivalManagedItem[]
  isCurated: boolean
  limit: number
}> {
  await requireCatalogManager()

  const entries = await prisma.newArrivalEntry.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      product: {
        select: {
          id: true,
          title: true,
          images: true,
          price: true,
          createdAt: true,
        },
      },
    },
  })

  return {
    items: entries.map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      sortOrder: entry.sortOrder,
      title: entry.product.title,
      imageUrl: primaryImage(entry.product.images),
      price: Number(entry.product.price),
      createdAt: entry.product.createdAt.toISOString(),
    })),
    isCurated: entries.length > 0,
    limit: NEW_ARRIVALS_LIMIT,
  }
}

export async function getNewArrivalProductOptions(): Promise<
  NewArrivalProductOption[]
> {
  await requireCatalogManager()

  const [products, listed] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        title: true,
        images: true,
        price: true,
        createdAt: true,
      },
    }),
    prisma.newArrivalEntry.findMany({ select: { productId: true } }),
  ])

  const listedIds = new Set(listed.map((entry) => entry.productId))

  return products.map((product) => ({
    id: product.id,
    title: product.title,
    imageUrl: primaryImage(product.images),
    price: Number(product.price),
    createdAt: product.createdAt.toISOString(),
    alreadyListed: listedIds.has(product.id),
  }))
}

export async function addNewArrivalProduct(productId: string) {
  await requireCatalogManager()

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true, images: true, price: true, createdAt: true },
  })
  if (!product) {
    throw new Error("Product not found.")
  }

  const existing = await prisma.newArrivalEntry.findUnique({
    where: { productId },
    select: { id: true },
  })
  if (existing) {
    throw new Error("That product is already in New Arrivals.")
  }

  const count = await prisma.newArrivalEntry.count()
  if (count >= NEW_ARRIVALS_LIMIT) {
    throw new Error(
      `New Arrivals can hold at most ${NEW_ARRIVALS_LIMIT} products.`
    )
  }

  const maxOrder = await prisma.newArrivalEntry.aggregate({
    _max: { sortOrder: true },
  })

  const entry = await prisma.newArrivalEntry.create({
    data: {
      productId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })

  revalidateNewArrivalPaths()

  return {
    success: true as const,
    item: {
      id: entry.id,
      productId: product.id,
      sortOrder: entry.sortOrder,
      title: product.title,
      imageUrl: primaryImage(product.images),
      price: Number(product.price),
      createdAt: product.createdAt.toISOString(),
    } satisfies NewArrivalManagedItem,
  }
}

export async function removeNewArrivalProduct(productId: string) {
  await requireCatalogManager()

  const entry = await prisma.newArrivalEntry.findUnique({
    where: { productId },
    select: { id: true },
  })
  if (!entry) {
    throw new Error("Product is not in New Arrivals.")
  }

  await prisma.newArrivalEntry.delete({ where: { id: entry.id } })

  const remaining = await prisma.newArrivalEntry.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  })

  if (remaining.length > 0) {
    await prisma.$transaction(
      remaining.map((item, index) =>
        prisma.newArrivalEntry.update({
          where: { id: item.id },
          data: { sortOrder: index },
        })
      )
    )
  }

  revalidateNewArrivalPaths()
  return { success: true as const }
}

export async function reorderNewArrivals(orderedProductIds: string[]) {
  await requireCatalogManager()

  if (!Array.isArray(orderedProductIds) || orderedProductIds.length === 0) {
    throw new Error("Provide the New Arrivals order.")
  }

  const uniqueIds = [...new Set(orderedProductIds)]
  if (uniqueIds.length !== orderedProductIds.length) {
    throw new Error("Duplicate products in order list.")
  }

  const existing = await prisma.newArrivalEntry.findMany({
    select: { id: true, productId: true },
  })
  const byProductId = new Map(
    existing.map((entry) => [entry.productId, entry.id])
  )

  if (
    uniqueIds.length !== byProductId.size ||
    uniqueIds.some((id) => !byProductId.has(id))
  ) {
    throw new Error(
      "Order list must include every New Arrivals product exactly once."
    )
  }

  await prisma.$transaction(
    uniqueIds.map((productId, index) =>
      prisma.newArrivalEntry.update({
        where: { id: byProductId.get(productId)! },
        data: { sortOrder: index },
      })
    )
  )

  revalidateNewArrivalPaths()
  return { success: true as const }
}

/** Replace the curated shelf with the 15 most recently added products. */
export async function syncNewArrivalsFromLatest() {
  await requireCatalogManager()

  const latest = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: NEW_ARRIVALS_LIMIT,
    select: {
      id: true,
      title: true,
      images: true,
      price: true,
      createdAt: true,
    },
  })

  await prisma.$transaction(async (tx) => {
    await tx.newArrivalEntry.deleteMany()
    if (latest.length === 0) return
    await tx.newArrivalEntry.createMany({
      data: latest.map((product, index) => ({
        productId: product.id,
        sortOrder: index,
      })),
    })
  })

  const entries = await prisma.newArrivalEntry.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      product: {
        select: {
          id: true,
          title: true,
          images: true,
          price: true,
          createdAt: true,
        },
      },
    },
  })

  revalidateNewArrivalPaths()

  return {
    success: true as const,
    items: entries.map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      sortOrder: entry.sortOrder,
      title: entry.product.title,
      imageUrl: primaryImage(entry.product.images),
      price: Number(entry.product.price),
      createdAt: entry.product.createdAt.toISOString(),
    })) satisfies NewArrivalManagedItem[],
  }
}

/** Clear curation so the shop uses the automatic last-15 list. */
export async function clearNewArrivalsCuration() {
  await requireCatalogManager()
  await prisma.newArrivalEntry.deleteMany()
  revalidateNewArrivalPaths()
  return { success: true as const }
}

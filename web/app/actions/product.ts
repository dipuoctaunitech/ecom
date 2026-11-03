'use server'

import { prisma } from "@/lib/prisma"
import {
  isValidProductImageUrl,
  requireSellerSession,
} from "@/lib/auth-guards"
import {
  assertValidProductFields,
  assertValidProductMedia,
} from "@/lib/validation"
import { assertValidLoyaltyPoints } from "@/lib/product-meta"
import { revalidatePath } from "next/cache"

async function assertSellerCanUseCategories(
  categoryIds: string[],
  sellerId: string
) {
  if (categoryIds.length === 0) return

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, sellerId: true },
  })

  if (categories.length !== categoryIds.length) {
    throw new Error("One or more categories were not found.")
  }

  for (const category of categories) {
    if (category.sellerId && category.sellerId !== sellerId) {
      throw new Error("That category is not available to your shop.")
    }
  }
}

export async function createProduct(formData: {
  title: string
  description: string
  brand: string
  animals: string[]
  tags: string[]
  price: number
  compareAtPrice?: number | null
  loyaltyPoints?: number
  stock: number
  images: string[]
  categoryIds?: string[]
  locationName?: string
  locationAddress?: string
  locationCity?: string
  locationCountry?: string
}) {
  const session = await requireSellerSession()

  if (!session) {
    throw new Error("Unauthorized. Only sellers can create products.")
  }

  if (!Number.isFinite(formData.price) || formData.price < 0) {
    throw new Error("Price must be a non-negative number.")
  }

  const compareAtPrice =
    formData.compareAtPrice === undefined ||
    formData.compareAtPrice === null ||
    Number.isNaN(formData.compareAtPrice)
      ? null
      : formData.compareAtPrice

  if (
    compareAtPrice !== null &&
    (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)
  ) {
    throw new Error("Compare-at price must be a non-negative number.")
  }

  if (compareAtPrice !== null && compareAtPrice <= formData.price) {
    throw new Error("Compare-at price must be higher than the selling price.")
  }

  if (!Number.isInteger(formData.stock) || formData.stock < 0) {
    throw new Error("Quantity must be a non-negative integer.")
  }

  const loyaltyPoints = assertValidLoyaltyPoints(
    formData.loyaltyPoints === undefined ||
      formData.loyaltyPoints === null ||
      Number.isNaN(formData.loyaltyPoints)
      ? 0
      : formData.loyaltyPoints
  )

  const images = assertValidProductMedia(formData.images)
  if (!images.every(isValidProductImageUrl)) {
    throw new Error("All product media must be uploaded through the app.")
  }

  const { title, description, brand, animals, tags } =
    assertValidProductFields(formData)

  const categoryIds = Array.from(
    new Set(
      (formData.categoryIds ?? [])
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )

  if (categoryIds.length === 0) {
    throw new Error("Select at least one category.")
  }

  await assertSellerCanUseCategories(categoryIds, session.user.id)

  const product = await prisma.product.create({
    data: {
      title,
      description,
      brand,
      animals,
      tags,
      price: formData.price,
      compareAtPrice,
      loyaltyPoints,
      stock: formData.stock,
      images,
      sellerId: session.user.id,
      categories: {
        connect: categoryIds.map((id) => ({ id })),
      },
      locationName: formData.locationName?.trim() || null,
      locationAddress: formData.locationAddress?.trim() || null,
      locationCity: formData.locationCity?.trim() || null,
      locationCountry: formData.locationCountry?.trim() || null,
    },
  })

  revalidatePath("/")
  revalidatePath("/items")
  revalidatePath("/seller")
  return { success: true, productId: product.id }
}

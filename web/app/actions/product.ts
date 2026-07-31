'use server'

import { prisma } from "@/lib/prisma"
import {
  isValidProductImageUrl,
  requireSellerSession,
} from "@/lib/auth-guards"
import { assertValidProductFields } from "@/lib/validation"
import { revalidatePath } from "next/cache"

export async function createProduct(formData: {
  title: string
  description: string
  price: number
  compareAtPrice?: number | null
  stock: number
  images: string[]
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
    throw new Error("Stock must be a non-negative integer.")
  }

  if (
    formData.images.length === 0 ||
    !formData.images.every(isValidProductImageUrl)
  ) {
    throw new Error("All product media must be uploaded through the app.")
  }

  const { title, description } = assertValidProductFields(formData)

  const product = await prisma.product.create({
    data: {
      title,
      description,
      price: formData.price,
      compareAtPrice,
      stock: formData.stock,
      images: formData.images,
      sellerId: session.user.id,
      locationName: formData.locationName?.trim() || null,
      locationAddress: formData.locationAddress?.trim() || null,
      locationCity: formData.locationCity?.trim() || null,
      locationCountry: formData.locationCountry?.trim() || null,
    },
  })

  revalidatePath("/")
  revalidatePath("/seller")
  return { success: true, productId: product.id }
}

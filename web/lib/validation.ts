import { DiscountType } from "@prisma/client"
import {
  isProductAnimal,
  normalizeTag,
  PRODUCT_ANIMALS_MAX,
  PRODUCT_BRAND_MAX,
  PRODUCT_MEDIA_MAX,
  PRODUCT_TAG_MAX,
  PRODUCT_TAGS_MAX,
} from "@/lib/product-meta"

export const PRODUCT_TITLE_MAX = 200
export const PRODUCT_DESCRIPTION_MAX = 5000
export const PRODUCT_LOCATION_MAX = 200
export const CATEGORY_NAME_MAX = 60
export const COLLECTION_TAG_MAX = 40
export const OFFER_GROUP_TITLE_MAX = 80
export const OFFER_GROUP_DESCRIPTION_MAX = 280
export const PASSWORD_MIN_LENGTH = 8

export {
  PRODUCT_MEDIA_MAX,
  PRODUCT_BRAND_MAX,
  PRODUCT_TAG_MAX,
  PRODUCT_TAGS_MAX,
}

export function toCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function assertValidCategoryName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error("Category name is required.")
  }
  if (trimmed.length > CATEGORY_NAME_MAX) {
    throw new Error(`Category name must be ${CATEGORY_NAME_MAX} characters or less.`)
  }
  if (!toCategorySlug(trimmed)) {
    throw new Error("Category name must include letters or numbers.")
  }
  return trimmed
}

export function assertValidCollectionTag(tag: string): string {
  const trimmed = tag.trim()
  if (!trimmed) {
    throw new Error("Collection tag is required.")
  }
  if (trimmed.length > COLLECTION_TAG_MAX) {
    throw new Error(
      `Collection tag must be ${COLLECTION_TAG_MAX} characters or less.`
    )
  }
  return trimmed
}

export function assertValidOfferGroupCopy(data: {
  title: string
  description: string
}): { title: string; description: string } {
  const title = data.title.trim()
  const description = data.description.trim()

  if (!title) {
    throw new Error("Offer group title is required.")
  }
  if (title.length > OFFER_GROUP_TITLE_MAX) {
    throw new Error(
      `Offer group title must be ${OFFER_GROUP_TITLE_MAX} characters or less.`
    )
  }
  if (!description) {
    throw new Error("Offer group description is required.")
  }
  if (description.length > OFFER_GROUP_DESCRIPTION_MAX) {
    throw new Error(
      `Offer group description must be ${OFFER_GROUP_DESCRIPTION_MAX} characters or less.`
    )
  }

  return { title, description }
}

export function assertValidOfferPercentRange(
  minPercent: number,
  maxPercent: number
): { minPercent: number; maxPercent: number } {
  if (
    !Number.isInteger(minPercent) ||
    !Number.isInteger(maxPercent) ||
    minPercent < 1 ||
    maxPercent > 100 ||
    minPercent > maxPercent
  ) {
    throw new Error(
      "Discount range must be whole numbers from 1 to 100, with min ≤ max."
    )
  }
  return { minPercent, maxPercent }
}

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

export function assertValidPassword(password: string, label = "Password") {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`${label} must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  }
  if (!PASSWORD_COMPLEXITY.test(password)) {
    throw new Error(
      `${label} must include uppercase, lowercase, and a number.`
    )
  }
}

/** Indian GSTIN: 15 chars, e.g. 29ABCDE1234F1Z5 */
const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export function normalizeGstNumber(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim().toUpperCase()
  return trimmed || null
}

export function assertValidGstNumber(
  value: string | null | undefined,
  { required = false, label = "GST number" }: { required?: boolean; label?: string } = {}
): string | null {
  const normalized = normalizeGstNumber(value)
  if (!normalized) {
    if (required) {
      throw new Error(`${label} is required.`)
    }
    return null
  }
  if (normalized.length !== 15 || !GSTIN_PATTERN.test(normalized)) {
    throw new Error(
      `${label} must be a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5).`
    )
  }
  return normalized
}

export function assertValidProductTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) {
    throw new Error("Add at least one tag so shoppers can find this product.")
  }
  if (tags.length > PRODUCT_TAGS_MAX) {
    throw new Error(`You can add up to ${PRODUCT_TAGS_MAX} tags.`)
  }

  const normalized: string[] = []
  const seen = new Set<string>()

  for (const raw of tags) {
    const tag = normalizeTag(raw)
    if (!tag) continue
    if (tag.length > PRODUCT_TAG_MAX) {
      throw new Error(
        `Each tag must be ${PRODUCT_TAG_MAX} characters or less.`
      )
    }
    if (seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag)
  }

  if (normalized.length === 0) {
    throw new Error("Add at least one tag so shoppers can find this product.")
  }

  return normalized
}

export function assertValidProductAnimals(
  animals: string[] | undefined
): string[] {
  if (!animals || animals.length === 0) {
    throw new Error("Select at least one animal this product is for.")
  }
  if (animals.length > PRODUCT_ANIMALS_MAX) {
    throw new Error(`You can select up to ${PRODUCT_ANIMALS_MAX} animals.`)
  }

  const normalized: string[] = []
  const seen = new Set<string>()

  for (const raw of animals) {
    const animal = raw.trim()
    if (!animal) continue
    if (!isProductAnimal(animal)) {
      throw new Error(`“${animal}” is not a valid animal.`)
    }
    if (seen.has(animal)) continue
    seen.add(animal)
    normalized.push(animal)
  }

  if (normalized.length === 0) {
    throw new Error("Select at least one animal this product is for.")
  }

  return normalized
}

export function assertValidProductMedia(images: string[]): string[] {
  if (images.length === 0) {
    throw new Error("Upload at least one photo or video.")
  }
  if (images.length > PRODUCT_MEDIA_MAX) {
    throw new Error(
      `You can upload up to ${PRODUCT_MEDIA_MAX} photos or videos.`
    )
  }
  return images
}

export function assertValidProductFields(data: {
  title: string
  description: string
  brand?: string
  animals?: string[]
  tags?: string[]
  locationName?: string | null
  locationAddress?: string | null
  locationCity?: string | null
  locationCountry?: string | null
}) {
  const title = data.title.trim()
  const description = data.description.trim()

  if (!title) {
    throw new Error("Product title is required.")
  }
  if (title.length > PRODUCT_TITLE_MAX) {
    throw new Error(`Product title must be ${PRODUCT_TITLE_MAX} characters or less.`)
  }
  if (!description) {
    throw new Error("Product description is required.")
  }
  if (description.length > PRODUCT_DESCRIPTION_MAX) {
    throw new Error(
      `Product description must be ${PRODUCT_DESCRIPTION_MAX} characters or less.`
    )
  }

  const hasListingMeta =
    data.brand !== undefined ||
    data.animals !== undefined ||
    data.tags !== undefined

  let brand = ""
  let animals: string[] = []
  let tags: string[] = []

  if (hasListingMeta) {
    brand = (data.brand ?? "").trim()

    if (!brand) {
      throw new Error("Brand is required.")
    }
    if (brand.length > PRODUCT_BRAND_MAX) {
      throw new Error(`Brand must be ${PRODUCT_BRAND_MAX} characters or less.`)
    }

    animals = assertValidProductAnimals(data.animals)
    tags = assertValidProductTags(data.tags)
  }

  for (const [field, value] of [
    ["Location name", data.locationName],
    ["Location address", data.locationAddress],
    ["Location city", data.locationCity],
    ["Location country", data.locationCountry],
  ] as const) {
    if (value && value.trim().length > PRODUCT_LOCATION_MAX) {
      throw new Error(`${field} must be ${PRODUCT_LOCATION_MAX} characters or less.`)
    }
  }

  return { title, description, brand, animals, tags }
}

export function assertValidDiscountInput(data: {
  type: DiscountType
  value: number
  minOrderAmount?: number
  maxUses?: number
}) {
  if (!Number.isFinite(data.value) || data.value <= 0) {
    throw new Error("Discount value must be a positive number.")
  }

  if (data.type === "PERCENTAGE" && data.value > 100) {
    throw new Error("Percentage discounts cannot exceed 100%.")
  }

  if (data.type === "FIXED" && data.value > 1_000_000) {
    throw new Error("Fixed discount amount is too large.")
  }

  if (
    data.minOrderAmount !== undefined &&
    (!Number.isFinite(data.minOrderAmount) || data.minOrderAmount < 0)
  ) {
    throw new Error("Minimum order amount must be a non-negative number.")
  }

  if (
    data.maxUses !== undefined &&
    (!Number.isInteger(data.maxUses) || data.maxUses < 1)
  ) {
    throw new Error("Max uses must be a positive integer.")
  }
}

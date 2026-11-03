/** Allowed animal values for product listings and shop-by-pet filters. */
export const PRODUCT_ANIMALS = [
  "Dogs",
  "Cats",
  "Birds",
  "Small Pets",
  "Fish",
  "Reptiles",
] as const

export type ProductAnimal = (typeof PRODUCT_ANIMALS)[number]

export const PRODUCT_MEDIA_MAX = 5
export const PRODUCT_TAG_MAX = 40
export const PRODUCT_TAGS_MAX = 20
export const PRODUCT_BRAND_MAX = 80
export const PRODUCT_ANIMALS_MAX = PRODUCT_ANIMALS.length

export function toAnimalSlug(animal: string): string {
  return animal
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, " ")
}

export function isProductAnimal(value: string): value is ProductAnimal {
  return (PRODUCT_ANIMALS as readonly string[]).includes(value)
}

export const PRODUCT_LOYALTY_POINTS_MAX = 1_000_000

/** Loyalty points as a percent of selling price (1 decimal), or null if price is 0. */
export function loyaltyPointsPercentOfPrice(
  loyaltyPoints: number,
  price: number
): number | null {
  if (!Number.isFinite(loyaltyPoints) || !Number.isFinite(price) || price <= 0) {
    return null
  }
  return Math.round((loyaltyPoints / price) * 1000) / 10
}

/** Round points from a percent of price. */
export function loyaltyPointsFromPercent(
  percent: number,
  price: number
): number {
  if (!Number.isFinite(percent) || !Number.isFinite(price) || price < 0) {
    return 0
  }
  return Math.max(0, Math.round((percent / 100) * price))
}

export function assertValidLoyaltyPoints(loyaltyPoints: number): number {
  if (!Number.isInteger(loyaltyPoints) || loyaltyPoints < 0) {
    throw new Error("Loyalty points must be a non-negative whole number.")
  }
  if (loyaltyPoints > PRODUCT_LOYALTY_POINTS_MAX) {
    throw new Error(
      `Loyalty points cannot exceed ${PRODUCT_LOYALTY_POINTS_MAX.toLocaleString()}.`
    )
  }
  return loyaltyPoints
}

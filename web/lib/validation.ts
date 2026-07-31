import { DiscountType } from "@prisma/client"

export const PRODUCT_TITLE_MAX = 200
export const PRODUCT_DESCRIPTION_MAX = 5000
export const PRODUCT_LOCATION_MAX = 200
export const PASSWORD_MIN_LENGTH = 8

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

export function assertValidProductFields(data: {
  title: string
  description: string
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

  return { title, description }
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

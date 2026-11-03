const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatINR(amount: number): string {
  return inrFormatter.format(amount)
}

/** Coerce Prisma Decimal / number / string for display. */
export function toAmount(
  value: { toString(): string } | number | string | null | undefined
): number {
  if (value == null) return 0
  const amount = typeof value === "number" ? value : Number(value.toString())
  return Number.isFinite(amount) ? amount : 0
}

export function formatMoney(
  value: { toString(): string } | number | string | null | undefined
): string {
  return formatINR(toAmount(value))
}

/** Per-unit savings when compare-at is higher than the paid/selling price. */
export function unitSavings(
  price: number,
  compareAtPrice: number | null | undefined
): number {
  const paid = toAmount(price)
  const compareAt = compareAtPrice == null ? null : toAmount(compareAtPrice)
  if (compareAt == null || compareAt <= paid) return 0
  return Math.round((compareAt - paid) * 100) / 100
}

/** Line savings for quantity. */
export function lineSavings(
  price: number,
  compareAtPrice: number | null | undefined,
  quantity: number
): number {
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0
  return Math.round(unitSavings(price, compareAtPrice) * qty * 100) / 100
}

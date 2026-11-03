import { prisma } from "@/lib/prisma"
import { toProduct } from "@/lib/products"
import type { Product } from "@shared/types"

export const NEW_ARRIVALS_LIMIT = 15

const productInclude = {
  seller: { select: { id: true, name: true, email: true } },
  categories: { select: { name: true, slug: true } },
  reviews: { select: { rating: true } },
  _count: { select: { reviews: true } },
} as const

/**
 * Resolve products for the New Arrivals row.
 * Curated entries win when present; otherwise the 15 newest products.
 */
export async function getNewArrivalProducts(): Promise<{
  products: Product[]
  isCurated: boolean
}> {
  const curated = await prisma.newArrivalEntry.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: NEW_ARRIVALS_LIMIT,
    include: { product: { include: productInclude } },
  })

  if (curated.length > 0) {
    return {
      products: curated.map((entry) => toProduct(entry.product)),
      isCurated: true,
    }
  }

  const latest = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: NEW_ARRIVALS_LIMIT,
    include: productInclude,
  })

  return {
    products: latest.map(toProduct),
    isCurated: false,
  }
}

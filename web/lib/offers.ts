import { prisma } from "@/lib/prisma"
import type { Product } from "@shared/types"
import { getDiscountPercent } from "@shared/types"

export type OfferGroupBand = {
  id: string
  title: string
  description: string
  minPercent: number
  maxPercent: number
  sortOrder: number
  products: Product[]
}

export async function getActiveOfferGroups() {
  return prisma.offerGroup.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { minPercent: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      minPercent: true,
      maxPercent: true,
      sortOrder: true,
    },
  })
}

/** Place on-offer products into admin-defined percent bands. */
export function groupProductsByOfferBands(
  products: Product[],
  groups: Awaited<ReturnType<typeof getActiveOfferGroups>>
): OfferGroupBand[] {
  const bands: OfferGroupBand[] = groups.map((group) => ({
    ...group,
    products: [],
  }))

  for (const product of products) {
    const percent = getDiscountPercent(product)
    if (percent == null) continue

    const band = bands.find(
      (group) => percent >= group.minPercent && percent <= group.maxPercent
    )
    if (band) {
      band.products.push(product)
    }
  }

  return bands.filter((band) => band.products.length > 0)
}

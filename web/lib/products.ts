import type { Category, Product as PrismaProduct, User } from "@prisma/client"
import type { Product } from "@shared/types"
import { resolveProductImageUrl } from "@/lib/images"
import { toAnimalSlug } from "@/lib/product-meta"

type ProductWithSeller = PrismaProduct & {
  seller?: (Pick<User, "name" | "email"> & { id?: string }) | null
  categories?: Pick<Category, "name" | "slug">[]
  /** @deprecated legacy single category include — prefer `categories` */
  category?: Pick<Category, "name" | "slug"> | null
  _count?: { reviews?: number }
  reviews?: { rating: number }[]
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

export function productMatchesShopFilter(
  product: Product,
  opts: { query?: string | null; category?: string | null; tag?: string | null }
): boolean {
  const query = opts.query?.trim().toLowerCase() || ""
  const activeCategory = opts.category?.trim().toLowerCase() || ""
  const activeTag = opts.tag?.trim().toLowerCase() || ""
  const tags = product.tags ?? []
  const animals = product.animals ?? []
  const categories = product.categories ?? []
  const animalSlugs = animals.map(toAnimalSlug)

  const matchesQuery =
    !query ||
    product.name.toLowerCase().includes(query) ||
    product.description.toLowerCase().includes(query) ||
    (product.brand ?? "").toLowerCase().includes(query) ||
    animals.some((animal) => animal.toLowerCase().includes(query)) ||
    categories.some(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query)
    ) ||
    tags.some((tag) => tag.toLowerCase().includes(query))

  const matchesCategory =
    !activeCategory ||
    product.categorySlug === activeCategory ||
    categories.some((category) => category.slug === activeCategory) ||
    animalSlugs.includes(activeCategory)

  const matchesTag =
    !activeTag || tags.some((tag) => tag.toLowerCase() === activeTag)

  return matchesQuery && matchesCategory && matchesTag
}

export function toProduct(product: ProductWithSeller): Product {
  const images = product.images.map(resolveProductImageUrl).filter(Boolean)
  const primaryImage = images.find((url) => !isVideoUrl(url)) ?? images[0] ?? ""

  const reviewCount =
    product._count?.reviews ?? product.reviews?.length ?? undefined
  const averageRating =
    product.reviews && product.reviews.length > 0
      ? Math.round(
          (product.reviews.reduce((sum, review) => sum + review.rating, 0) /
            product.reviews.length) *
            10
        ) / 10
      : undefined

  const categories =
    product.categories && product.categories.length > 0
      ? product.categories.map((category) => ({
          name: category.name,
          slug: category.slug,
        }))
      : product.category
        ? [{ name: product.category.name, slug: product.category.slug }]
        : []

  const primaryCategory = categories[0]

  return {
    id: product.id,
    name: product.title,
    description: product.description,
    brand: product.brand || undefined,
    animals: product.animals ?? [],
    tags: product.tags ?? [],
    price: Number(product.price),
    compareAtPrice:
      product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    loyaltyPoints: product.loyaltyPoints ?? 0,
    imageUrl: primaryImage,
    images,
    category:
      primaryCategory?.name ?? product.seller?.name ?? "Marketplace",
    categorySlug: primaryCategory?.slug ?? null,
    categories,
    sellerId: product.sellerId,
    sellerName:
      product.seller?.name?.trim() ||
      product.seller?.email?.split("@")[0] ||
      "Seller",
    stock: product.stock,
    averageRating,
    reviewCount,
  }
}

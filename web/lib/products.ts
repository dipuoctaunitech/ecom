import type { Category, Product as PrismaProduct, User } from "@prisma/client"
import type { Product } from "@shared/types"
import { resolveProductImageUrl } from "@/lib/images"

type ProductWithSeller = PrismaProduct & {
  seller?: Pick<User, "name"> | null
  category?: Pick<Category, "name" | "slug"> | null
  _count?: { reviews?: number }
  reviews?: { rating: number }[]
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
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

  return {
    id: product.id,
    name: product.title,
    description: product.description,
    price: Number(product.price),
    compareAtPrice:
      product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    imageUrl: primaryImage,
    images,
    category: product.category?.name ?? product.seller?.name ?? "Marketplace",
    categorySlug: product.category?.slug ?? null,
    stock: product.stock,
    averageRating,
    reviewCount,
  }
}

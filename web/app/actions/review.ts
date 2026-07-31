'use server'

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { requireUserSession } from "@/lib/auth-guards"
import { revalidatePath } from "next/cache"
import type { ProductReview, ProductReviewSummary } from "@shared/types"

const REVIEW_TITLE_MAX = 120
const REVIEW_COMMENT_MAX = 2000

function toReview(
  review: {
    id: string
    productId: string
    userId: string
    rating: number
    title: string | null
    comment: string
    createdAt: Date
    user: { name: string | null }
  },
  currentUserId?: string | null
): ProductReview {
  return {
    id: review.id,
    productId: review.productId,
    userId: review.userId,
    userName: review.user.name?.trim() || "Customer",
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    isOwn: currentUserId ? review.userId === currentUserId : false,
  }
}

export async function getProductReviews(productId: string): Promise<{
  reviews: ProductReview[]
  summary: ProductReviewSummary
  currentUserReviewId: string | null
}> {
  const session = await getServerSession(authOptions)
  const currentUserId = session?.user?.id ?? null

  const [reviews, aggregate] = await Promise.all([
    prisma.productReview.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ])

  return {
    reviews: reviews.map((review) => toReview(review, currentUserId)),
    summary: {
      averageRating: aggregate._avg.rating
        ? Math.round(aggregate._avg.rating * 10) / 10
        : 0,
      reviewCount: aggregate._count._all,
    },
    currentUserReviewId:
      reviews.find((review) => review.userId === currentUserId)?.id ?? null,
  }
}

export async function createProductReview(input: {
  productId: string
  rating: number
  title?: string
  comment: string
}) {
  const session = await requireUserSession()

  if (!session) {
    throw new Error("Sign in to leave a review.")
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  })

  if (!product) {
    throw new Error("Product not found.")
  }

  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    throw new Error("Rating must be between 1 and 5 stars.")
  }

  const title = input.title?.trim() || null
  const comment = input.comment.trim()

  if (title && title.length > REVIEW_TITLE_MAX) {
    throw new Error(`Title must be ${REVIEW_TITLE_MAX} characters or less.`)
  }

  if (!comment) {
    throw new Error("Please write a comment with your review.")
  }

  if (comment.length > REVIEW_COMMENT_MAX) {
    throw new Error(`Comment must be ${REVIEW_COMMENT_MAX} characters or less.`)
  }

  // Without this any account could rate any product, including a seller
  // rating their own listing.
  const purchaseCount = await prisma.orderItem.count({
    where: {
      productId: input.productId,
      order: { buyerId: session.user.id },
    },
  })

  if (purchaseCount === 0) {
    throw new Error("You can only review products you have purchased.")
  }

  const existing = await prisma.productReview.findUnique({
    where: {
      productId_userId: {
        productId: input.productId,
        userId: session.user.id,
      },
    },
    select: { id: true },
  })

  if (existing) {
    throw new Error("You have already reviewed this product.")
  }

  const review = await prisma.productReview.create({
    data: {
      productId: input.productId,
      userId: session.user.id,
      rating: input.rating,
      title,
      comment,
    },
    include: { user: { select: { name: true } } },
  })

  revalidatePath(`/product/${input.productId}`)
  revalidatePath("/")

  return { success: true as const, review: toReview(review, session.user.id) }
}

export async function deleteProductReview(reviewId: string) {
  const session = await requireUserSession()

  if (!session) {
    throw new Error("Sign in to manage your reviews.")
  }

  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, userId: true },
  })

  if (!review) {
    throw new Error("Review not found.")
  }

  const isAdmin = session.user.role === "ADMIN"
  if (review.userId !== session.user.id && !isAdmin) {
    throw new Error("You can only delete your own review.")
  }

  await prisma.productReview.delete({ where: { id: reviewId } })

  revalidatePath(`/product/${review.productId}`)
  revalidatePath("/")

  return { success: true as const }
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingBag, Check, Play, Star } from "lucide-react";
import type { Product, ProductReview, ProductReviewSummary } from "@shared/types";
import { useCartStore } from "@/store/useCartStore";
import { CartSidebar } from "@/components/CartSidebar";
import { ProductImageZoom } from "@/components/ProductImageZoom";
import { ProductReviews } from "@/components/ProductReviews";

interface ProductDetailViewProps {
  product: Product;
  reviews: ProductReview[];
  reviewSummary: ProductReviewSummary;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export function ProductDetailView({
  product,
  reviews,
  reviewSummary,
}: ProductDetailViewProps) {
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);

  const media =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  const cartQuantity =
    items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const remainingStock = Math.max(0, product.stock - cartQuantity);
  const maxSelectable = Math.max(1, remainingStock);
  const outOfStock = product.stock <= 0;
  const atMaxInCart = remainingStock <= 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const activeUrl = media[activeIndex] ?? "";
  const activeIsVideo = isVideoUrl(activeUrl);
  const selectedQuantity = Math.min(quantity, maxSelectable);
  const canAdd = !outOfStock && !atMaxInCart;

  function handleAddToCart() {
    if (!canAdd) return;

    addItem(product, selectedQuantity);
    setQuantity(1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <main className="min-h-screen bg-surface">
      <CartSidebar />

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Store
        </Link>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-16 md:items-start">
          <div className="animate-fade-up space-y-3">
            {activeUrl ? (
              activeIsVideo ? (
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#eceae7]">
                  <video
                    key={activeUrl}
                    src={activeUrl}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <ProductImageZoom
                  key={activeUrl}
                  src={activeUrl}
                  alt={product.name}
                />
              )
            ) : (
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-[#eceae7] text-sm text-ink-muted">
                No image
              </div>
            )}

            {media.length > 1 && (
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                role="listbox"
                aria-label="Product media"
              >
                {media.map((url, index) => {
                  const video = isVideoUrl(url);
                  const selected = index === activeIndex;

                  return (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      aria-label={
                        video
                          ? `Show video ${index + 1}`
                          : `Show image ${index + 1}`
                      }
                      onClick={() => setActiveIndex(index)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border transition-colors ${
                        selected
                          ? "border-ink"
                          : "border-line hover:border-ink/40"
                      }`}
                    >
                      {video ? (
                        <>
                          <video
                            src={url}
                            muted
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Play
                              className="h-4 w-4 text-white"
                              fill="currentColor"
                              strokeWidth={0}
                            />
                          </span>
                        </>
                      ) : (
                        <Image
                          src={url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="animate-fade-up delay-100 flex flex-col md:pt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              {product.category}
            </p>
            <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink md:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 flex items-baseline gap-3 font-display text-2xl font-medium tabular-nums text-ink">
              <span>${product.price.toFixed(2)}</span>
              {product.compareAtPrice != null &&
                product.compareAtPrice > product.price && (
                  <span className="text-lg font-normal text-ink-muted line-through">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                )}
            </p>

            {reviewSummary.reviewCount > 0 && (
              <a
                href="#reviews"
                className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
              >
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className={`h-3.5 w-3.5 ${
                        index < Math.round(reviewSummary.averageRating)
                          ? "fill-ink text-ink"
                          : "text-line"
                      }`}
                      strokeWidth={1.5}
                    />
                  ))}
                </span>
                <span className="tabular-nums">
                  {reviewSummary.averageRating.toFixed(1)}
                </span>
                <span>
                  ({reviewSummary.reviewCount} review
                  {reviewSummary.reviewCount === 1 ? "" : "s"})
                </span>
              </a>
            )}
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted">
              {product.description}
            </p>

            <p className="mt-4 text-sm text-ink-muted">
              {outOfStock
                ? "Out of stock"
                : atMaxInCart
                  ? "Maximum available quantity already in cart"
                  : `${product.stock} available`}
            </p>

            <div className="mt-10 flex items-center gap-4">
              <span className="text-sm text-ink-muted">Quantity</span>
              <div className="inline-flex items-center border border-line">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!canAdd || selectedQuantity <= 1}
                  className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <span className="w-10 text-center text-sm tabular-nums text-ink">
                  {canAdd ? selectedQuantity : 0}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(remainingStock, q + 1))
                  }
                  disabled={!canAdd || selectedQuantity >= remainingStock}
                  className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAdd}
              className="mt-8 inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 bg-ink text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-ink/40 disabled:hover:bg-ink/40"
              aria-label={
                outOfStock
                  ? `${product.name} is out of stock`
                  : atMaxInCart
                    ? `Maximum available quantity already in cart for ${product.name}`
                    : `Add ${product.name} to cart`
              }
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={2} />
                  Added
                </>
              ) : outOfStock ? (
                "Out of Stock"
              ) : atMaxInCart ? (
                "Max in Cart"
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>

        <div id="reviews">
          <ProductReviews
            productId={product.id}
            initialReviews={reviews}
            initialSummary={reviewSummary}
          />
        </div>
      </div>
    </main>
  );
}

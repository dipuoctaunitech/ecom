"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Plus, Star } from "lucide-react";
import { useState } from "react";
import type { Product } from "@shared/types";
import { isProductOnOffer } from "@shared/types";
import { useCartStore } from "@/store/useCartStore";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className = "" }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cartQuantity = useCartStore(
    (state) =>
      state.items.find((item) => item.product.id === product.id)?.quantity ?? 0
  );
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;
  const atMaxQuantity = cartQuantity >= product.stock;
  const canAdd = !outOfStock && !atMaxQuantity;
  const onOffer = isProductOnOffer(product);
  const hasReviews =
    product.reviewCount != null &&
    product.reviewCount > 0 &&
    product.averageRating != null;

  const discountPercent =
    onOffer && product.compareAtPrice
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) *
            100
        )
      : null;

  const handleAdd = () => {
    if (!canAdd) return;
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article
      className={`group relative flex w-full shrink-0 flex-col rounded-2xl bg-surface-elevated p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-line transition-shadow hover:shadow-md ${className}`}
    >
      <div className="relative mb-3">
        <Link
          href={`/product/${product.id}`}
          className="relative block aspect-square overflow-hidden rounded-xl bg-surface"
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 45vw, (max-width: 1200px) 220px, 240px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-ink-muted">
              No image
            </div>
          )}

          {discountPercent != null && discountPercent > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              {discountPercent}% off
            </span>
          )}

          {outOfStock && (
            <span className="absolute inset-x-2 bottom-2 rounded-md bg-noir/85 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
              Out of stock
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={`absolute -bottom-3 right-2 flex h-8 min-w-14 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-bold shadow-md transition-colors disabled:cursor-not-allowed ${
            added
              ? "bg-emerald-600 text-white"
              : "bg-white text-emerald-700 ring-1 ring-emerald-600 hover:bg-emerald-600 hover:text-white disabled:bg-neutral-200 disabled:text-neutral-400 disabled:ring-neutral-300"
          }`}
          aria-label={
            outOfStock
              ? `${product.name} is out of stock`
              : atMaxQuantity
                ? `Maximum available quantity already in cart for ${product.name}`
                : `Add ${product.name} to cart`
          }
        >
          {added ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <>
              <Plus className="h-3 w-3" strokeWidth={2.5} />
              Add
            </>
          )}
        </button>
      </div>

      <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
        {product.category}
      </p>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.2em] font-display text-sm font-medium leading-snug tracking-tight text-ink">
        <Link href={`/product/${product.id}`} className="hover:text-ink-muted">
          {product.name}
        </Link>
      </h3>

      {hasReviews && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-muted">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" strokeWidth={0} />
          <span className="font-medium text-ink">
            {product.averageRating!.toFixed(1)}
          </span>
          <span>({product.reviewCount})</span>
        </p>
      )}

      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-sm font-bold tabular-nums text-ink">
          ${product.price.toFixed(2)}
        </span>
        {onOffer && product.compareAtPrice != null && (
          <span className="text-xs tabular-nums text-ink-muted line-through">
            ${product.compareAtPrice.toFixed(2)}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-ink-muted">
        {outOfStock ? "Out of stock" : `${product.stock} in stock`}
      </p>
    </article>
  );
}

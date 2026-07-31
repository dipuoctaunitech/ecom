"use client";

import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export function CartSidebar() {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface-elevated shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-ink" strokeWidth={1.5} />
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              Cart
              {itemCount > 0 && (
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  ({itemCount})
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="flex h-9 w-9 items-center justify-center text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag
                className="h-10 w-10 text-ink-muted/40"
                strokeWidth={1.25}
              />
              <p className="font-display text-base font-medium text-ink">
                Your cart is empty
              </p>
              <p className="max-w-[220px] text-sm text-ink-muted">
                Add something from the collection to get started.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-6">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-[#eceae7]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-medium text-ink">
                          {product.name}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-muted">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        className="shrink-0 text-ink-muted transition-colors hover:text-ink"
                        aria-label={`Remove ${product.name}`}
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="inline-flex items-center border border-line">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(product.id, quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-surface"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums text-ink">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(product.id, quantity + 1)
                          }
                          disabled={quantity >= product.stock}
                          className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={
                            quantity >= product.stock
                              ? "Maximum available quantity reached"
                              : "Increase quantity"
                          }
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                      <p className="text-sm font-medium tabular-nums text-ink">
                        ${(product.price * quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-line px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-ink-muted">Total</span>
              <span className="font-display text-xl font-medium tabular-nums text-ink">
                ${total.toFixed(2)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex h-12 w-full items-center justify-center bg-ink text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";
import { placeOrder } from "@/app/actions/order";
import { useCartStore } from "@/store/useCartStore";

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  async function handlePlaceOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (status !== "authenticated" || !session?.user?.id) {
      setError("Sign in to place an order so you can track it later.");
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await placeOrder(
        items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        }))
      );
      setOrderId(result.orderId);
      setIsSubmitted(true);
      clearCart();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to place order. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-8">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-[0.08em] text-ink"
          >
            FORMA
          </Link>
          {!isSubmitted && (
            <p className="text-sm text-ink-muted">Checkout</p>
          )}
        </div>
      </header>

      {isSubmitted ? (
        <section className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center md:px-8 md:py-32">
          <div className="animate-fade-up flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2
              className="h-12 w-12 text-emerald-600"
              strokeWidth={1.5}
            />
          </div>
          <h1 className="animate-fade-up delay-100 mt-8 font-display text-3xl font-medium tracking-tight text-ink md:text-4xl">
            Order Confirmed
          </h1>
          <p className="animate-fade-up delay-200 mt-4 text-base leading-relaxed text-ink-muted">
            Thank you for your order. No payment was processed — this is a demo
            checkout.
          </p>
          <p className="animate-fade-up delay-200 mt-6 font-display text-sm tracking-wide text-ink">
            Order{" "}
            <span className="tabular-nums font-medium">
              #{orderId.slice(0, 8).toUpperCase()}
            </span>
          </p>
          <div className="animate-fade-up delay-300 mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/orders"
              className="inline-flex h-12 items-center justify-center bg-ink px-8 text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Track My Order
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center border border-line bg-surface-elevated px-8 text-sm font-medium tracking-wide text-ink transition-colors duration-200 hover:bg-surface"
            >
              Return to Store
            </Link>
          </div>
        </section>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 md:grid-cols-2 md:gap-16 md:px-8 md:py-16">
          <section className="animate-fade-up">
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink md:text-3xl">
              Shipping Details
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Demo checkout — no payment is collected. Sign in to save and track
              your order.
            </p>

            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This is a demo store. Payment is handled externally in production
              (e.g. Stripe). Do not enter real card details here.
            </div>

            {status !== "authenticated" && (
              <p className="mt-4 border border-line bg-surface-elevated px-4 py-3 text-sm text-ink-muted">
                You need to{" "}
                <Link
                  href="/?callbackUrl=/checkout"
                  className="font-medium text-ink underline"
                >
                  sign in
                </Link>{" "}
                before placing an order.
              </p>
            )}

            {error && (
              <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <form
              className="mt-8 flex flex-col gap-5"
              onSubmit={handlePlaceOrder}
            >
              <fieldset className="flex flex-col gap-4">
                <legend className="mb-1 font-display text-sm font-medium tracking-wide text-ink">
                  Contact
                </legend>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-ink-muted">Email</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    defaultValue={session?.user?.email ?? ""}
                    className="h-11 border border-line bg-surface-elevated px-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
                  />
                </label>
              </fieldset>

              <fieldset className="flex flex-col gap-4">
                <legend className="mb-1 font-display text-sm font-medium tracking-wide text-ink">
                  Shipping address
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink-muted">First name</span>
                    <input
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      className="h-11 border border-line bg-surface-elevated px-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink-muted">Last name</span>
                    <input
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      className="h-11 border border-line bg-surface-elevated px-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-ink-muted">Address</span>
                  <input
                    type="text"
                    name="address"
                    autoComplete="street-address"
                    className="h-11 border border-line bg-surface-elevated px-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5 sm:col-span-1">
                    <span className="text-xs text-ink-muted">City</span>
                    <input
                      type="text"
                      name="city"
                      autoComplete="address-level2"
                      className="h-11 border border-line bg-surface-elevated px-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink-muted">State</span>
                    <input
                      type="text"
                      name="state"
                      autoComplete="address-level1"
                      className="h-11 border border-line bg-surface-elevated px-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink-muted">ZIP</span>
                    <input
                      type="text"
                      name="zip"
                      autoComplete="postal-code"
                      className="h-11 border border-line bg-surface-elevated px-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
                    />
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="mt-2 flex h-12 w-full items-center justify-center bg-ink text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Placing order…" : "Place Order"}
              </button>
            </form>
          </section>

          <aside className="animate-fade-up delay-100 md:sticky md:top-8 md:self-start">
            <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
              Order Summary
            </h2>

            {items.length === 0 ? (
              <p className="mt-8 text-sm text-ink-muted">
                Your cart is empty.
              </p>
            ) : (
              <ul className="mt-8 flex flex-col gap-5 border-b border-line pb-6">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="flex gap-4">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[#eceae7]">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-medium text-ink">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-muted">
                            Qty {quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-ink">
                          ${(product.price * quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-ink-muted">Total</span>
              <span className="font-display text-xl font-medium tabular-nums text-ink">
                ${total.toFixed(2)}
              </span>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

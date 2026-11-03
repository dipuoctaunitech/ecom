"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  QrCode,
  Sparkles,
  Store,
} from "lucide-react";
import {
  getCheckoutBuyerInfo,
  getCheckoutSellerInfo,
  placeOrder,
  type CheckoutSellerInfo,
} from "@/app/actions/order";
import { updateCustomerGstNumber } from "@/app/actions/account";
import { useCartStore } from "@/store/useCartStore";
import { BrandLogo } from "@/components/BrandLogo";
import { EnlargeableImage } from "@/components/EnlargeableImage";
import { formatINR, lineSavings } from "@/lib/money";
import { getDiscountPercent, isProductOnOffer, type CartItem } from "@shared/types";

type SellerGroup = {
  sellerId: string
  sellerName: string
  qrCodeUrl: string | null
  gstNumber: string | null
  items: CartItem[]
  subtotal: number
}

type ConfirmedSeller = {
  sellerId: string
  sellerName: string
  qrCodeUrl: string | null
  gstNumber: string | null
  subtotal: number
}

function groupItemsBySeller(
  items: CartItem[],
  sellerInfo: CheckoutSellerInfo[]
): SellerGroup[] {
  const infoByProduct = new Map(
    sellerInfo.map((info) => [info.productId, info])
  )
  const groups = new Map<string, SellerGroup>()

  for (const item of items) {
    const info = infoByProduct.get(item.product.id)
    const sellerId = info?.sellerId ?? item.product.sellerId ?? "unknown"
    const sellerName =
      info?.sellerName ?? item.product.sellerName ?? "Seller"
    const qrCodeUrl = info?.qrCodeUrl ?? null
    const gstNumber = info?.gstNumber ?? null
    const existing = groups.get(sellerId)

    if (existing) {
      existing.items.push(item)
      existing.subtotal += item.product.price * item.quantity
      if (!existing.qrCodeUrl && qrCodeUrl) {
        existing.qrCodeUrl = qrCodeUrl
      }
      if (!existing.gstNumber && gstNumber) {
        existing.gstNumber = gstNumber
      }
      if (existing.sellerName === "Seller" && sellerName !== "Seller") {
        existing.sellerName = sellerName
      }
    } else {
      groups.set(sellerId, {
        sellerId,
        sellerName,
        qrCodeUrl,
        gstNumber,
        items: [item],
        subtotal: item.product.price * item.quantity,
      })
    }
  }

  return Array.from(groups.values())
}

function SellerQrPreview({
  sellerName,
  qrCodeUrl,
  gstNumber,
}: {
  sellerName: string
  qrCodeUrl: string | null
  gstNumber: string | null
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="border border-line bg-surface px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
          Seller GST
        </p>
        <p className="mt-1 font-mono text-sm tracking-wide text-ink">
          {gstNumber ?? "Not provided"}
        </p>
      </div>
      <div className="flex items-start gap-3 border border-line bg-surface p-3">
        {qrCodeUrl ? (
          <EnlargeableImage
            src={qrCodeUrl}
            alt={`Payment QR for ${sellerName}`}
            wrapClassName="h-24 w-24 shrink-0 p-1"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-dashed border-line bg-surface-elevated">
            <QrCode className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
          </div>
        )}
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
            Seller QR
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {qrCodeUrl
              ? `After delivery, scan this QR to pay ${sellerName}. A receipt on My Orders is optional.`
              : "This seller has not added a payment QR yet."}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const [sellerInfo, setSellerInfo] = useState<CheckoutSellerInfo[]>([]);
  const [buyerGstNumber, setBuyerGstNumber] = useState("");
  const [confirmedBuyerGst, setConfirmedBuyerGst] = useState<string | null>(null);
  const [confirmedSellers, setConfirmedSellers] = useState<ConfirmedSeller[]>([]);
  const [confirmedSaved, setConfirmedSaved] = useState(0);
  const [confirmedLoyalty, setConfirmedLoyalty] = useState(0);

  const productIdsKey = items.map((item) => item.product.id).sort().join(",");

  useEffect(() => {
    if (!productIdsKey) {
      setSellerInfo([])
      return
    }

    if (status !== "authenticated") {
      setSellerInfo([])
      return
    }

    let cancelled = false
    getCheckoutSellerInfo(productIdsKey.split(","))
      .then((info) => {
        if (!cancelled) setSellerInfo(info)
      })
      .catch(() => {
        if (!cancelled) setSellerInfo([])
      })

    return () => {
      cancelled = true
    }
  }, [productIdsKey, status, session?.user?.id])

  useEffect(() => {
    if (status !== "authenticated") {
      setBuyerGstNumber("")
      return
    }

    let cancelled = false
    getCheckoutBuyerInfo()
      .then((info) => {
        if (!cancelled) setBuyerGstNumber(info.gstNumber ?? "")
      })
      .catch(() => {
        if (!cancelled) setBuyerGstNumber("")
      })

    return () => {
      cancelled = true
    }
  }, [status, session?.user?.id])

  const sellerGroups = useMemo(
    () => groupItemsBySeller(items, sellerInfo),
    [items, sellerInfo]
  )

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalSaved = items.reduce(
    (sum, item) =>
      sum +
      lineSavings(
        item.product.price,
        item.product.compareAtPrice,
        item.quantity
      ),
    0
  );

  const listTotal = Math.round((total + totalSaved) * 100) / 100;

  const totalLoyaltyPoints = items.reduce(
    (sum, item) =>
      sum + (item.product.loyaltyPoints ?? 0) * item.quantity,
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
      const gstTrimmed = buyerGstNumber.trim().toUpperCase()
      await updateCustomerGstNumber(gstTrimmed || null)

      const result = await placeOrder(
        items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        }))
      );
      setConfirmedBuyerGst(gstTrimmed || null)
      setConfirmedSellers(
        sellerGroups.map((group) => ({
          sellerId: group.sellerId,
          sellerName: group.sellerName,
          qrCodeUrl: group.qrCodeUrl,
          gstNumber: group.gstNumber,
          subtotal: group.subtotal,
        }))
      );
      setConfirmedSaved(totalSaved);
      setConfirmedLoyalty(totalLoyaltyPoints);
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
          <BrandLogo size="sm" />
          {!isSubmitted && (
            <p className="text-sm text-ink-muted">Checkout</p>
          )}
        </div>
      </header>

      {isSubmitted ? (
        <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center md:px-8 md:py-24">
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
            Thank you for your order. When it arrives, mark it received on My
            Orders, scan the seller QR to pay, and optionally add a receipt.
          </p>
          <p className="animate-fade-up delay-200 mt-6 font-display text-sm tracking-wide text-ink">
            Order{" "}
            <span className="tabular-nums font-medium">
              #{orderId.slice(0, 8).toUpperCase()}
            </span>
          </p>

          {(confirmedSaved > 0 || confirmedLoyalty > 0) && (
            <div className="animate-fade-up delay-200 mt-4 flex flex-wrap items-center justify-center gap-2">
              {confirmedSaved > 0 ? (
                <p className="inline-flex border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                  You saved {formatINR(confirmedSaved)} on this order
                </p>
              ) : null}
              {confirmedLoyalty > 0 ? (
                <p className="inline-flex items-center gap-1.5 border border-line bg-surface-elevated px-4 py-2 text-sm font-medium text-ink">
                  <Sparkles className="h-3.5 w-3.5 text-highlight" strokeWidth={1.75} />
                  +{confirmedLoyalty.toLocaleString("en-IN")} loyalty pts
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-8 w-full border border-line bg-surface-elevated px-4 py-3 text-left">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Your GST
            </p>
            <p className="mt-1 font-mono text-sm tracking-wide text-ink">
              {confirmedBuyerGst ?? "Not provided"}
            </p>
          </div>

          {confirmedSellers.length > 0 && (
            <div className="mt-6 w-full text-left">
              {confirmedSellers.map((seller) => (
                <section
                  key={seller.sellerId}
                  className="mb-6 border border-line bg-surface-elevated p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-2 font-display text-sm font-medium text-ink">
                      <Store className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
                      {seller.sellerName}
                    </p>
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {formatINR(seller.subtotal)}
                    </p>
                  </div>
                  <SellerQrPreview
                    sellerName={seller.sellerName}
                    qrCodeUrl={seller.qrCodeUrl}
                    gstNumber={seller.gstNumber}
                  />
                </section>
              ))}
            </div>
          )}

          <div className="animate-fade-up delay-300 mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/account?tab=orders"
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
              Pay after delivery. On My Orders, mark the order received, scan
              each seller QR, and optionally upload a receipt.
            </p>

            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Receipts can be uploaded only after the order status is delivered.
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
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-ink-muted">
                    Your GST number (optional)
                  </span>
                  <input
                    type="text"
                    name="buyerGst"
                    value={buyerGstNumber}
                    onChange={(e) =>
                      setBuyerGstNumber(e.target.value.toUpperCase())
                    }
                    maxLength={15}
                    placeholder="29ABCDE1234F1Z5"
                    className="h-11 border border-line bg-surface-elevated px-3 font-mono text-sm uppercase tracking-wide text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none"
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
              <div className="mt-8 flex flex-col gap-8 border-b border-line pb-6">
                {sellerGroups.map((group) => (
                  <section key={group.sellerId}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <Store
                          className="h-4 w-4 text-ink-muted"
                          strokeWidth={1.75}
                        />
                        <h3 className="font-display text-sm font-medium tracking-wide text-ink">
                          {group.sellerName}
                        </h3>
                      </div>
                      <p className="font-mono text-xs tracking-wide text-ink-muted">
                        GST {group.gstNumber ?? "—"}
                      </p>
                    </div>

                    <ul className="flex flex-col gap-5">
                      {group.items.map(({ product, quantity }) => {
                        const onOffer = isProductOnOffer(product)
                        const discountPct = getDiscountPercent(product)
                        const saved = lineSavings(
                          product.price,
                          product.compareAtPrice,
                          quantity
                        )
                        const linePoints =
                          (product.loyaltyPoints ?? 0) * quantity
                        return (
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
                                    {discountPct != null ? (
                                      <span className="ml-2 text-emerald-700">
                                        {discountPct}% off
                                      </span>
                                    ) : null}
                                  </p>
                                  {linePoints > 0 ? (
                                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
                                      <Sparkles
                                        className="h-3 w-3 text-highlight"
                                        strokeWidth={1.75}
                                      />
                                      +{linePoints.toLocaleString("en-IN")} pts
                                    </p>
                                  ) : null}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-medium tabular-nums text-ink">
                                    {formatINR(product.price * quantity)}
                                  </p>
                                  {onOffer && product.compareAtPrice != null ? (
                                    <p className="mt-0.5 text-xs tabular-nums text-ink-muted line-through">
                                      {formatINR(
                                        product.compareAtPrice * quantity
                                      )}
                                    </p>
                                  ) : null}
                                  {saved > 0 ? (
                                    <p className="mt-0.5 text-xs font-medium tabular-nums text-emerald-700">
                                      Save {formatINR(saved)}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-ink-muted">Seller subtotal</span>
                      <span className="font-medium tabular-nums text-ink">
                        {formatINR(group.subtotal)}
                      </span>
                    </div>

                    <SellerQrPreview
                      sellerName={group.sellerName}
                      qrCodeUrl={group.qrCodeUrl}
                      gstNumber={group.gstNumber}
                    />
                  </section>
                ))}
              </div>
            )}

            <div className="mt-6 border border-line bg-surface px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Your GST
              </p>
              <p className="mt-1 font-mono text-sm tracking-wide text-ink">
                {buyerGstNumber.trim() || "Not provided"}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {totalSaved > 0 ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">List price</span>
                    <span className="tabular-nums text-ink-muted line-through">
                      {formatINR(listTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <span className="text-sm font-medium text-emerald-800">
                      You save
                    </span>
                    <span className="font-display text-lg font-medium tabular-nums text-emerald-800">
                      {formatINR(totalSaved)}
                    </span>
                  </div>
                </>
              ) : null}
              {totalLoyaltyPoints > 0 ? (
                <div className="flex items-center justify-between border border-line bg-surface px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Sparkles
                      className="h-3.5 w-3.5 text-highlight"
                      strokeWidth={1.75}
                    />
                    Loyalty points earned
                  </span>
                  <span className="font-display text-lg font-medium tabular-nums text-ink">
                    +{totalLoyaltyPoints.toLocaleString("en-IN")}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">Total</span>
                <span className="font-display text-xl font-medium tabular-nums text-ink">
                  {formatINR(total)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

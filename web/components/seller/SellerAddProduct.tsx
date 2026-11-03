"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProduct } from "@/app/actions/product";
import { Percent, Tag, X } from "lucide-react";
import type { SellerCategory } from "@/app/actions/seller";
import { uploadFile } from "@/lib/upload-client";
import {
  loyaltyPointsFromPercent,
  loyaltyPointsPercentOfPrice,
  PRODUCT_ANIMALS,
  PRODUCT_MEDIA_MAX,
  PRODUCT_TAG_MAX,
  PRODUCT_TAGS_MAX,
} from "@/lib/product-meta";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export default function SellerAddProduct({
  categories,
}: {
  categories: SellerCategory[];
}) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [priceDraft, setPriceDraft] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyPercentDraft, setLoyaltyPercentDraft] = useState("");
  const [error, setError] = useState("");
  const [discountMode, setDiscountMode] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [discountValue, setDiscountValue] = useState("");

  const priceNumber = Number(priceDraft);
  const loyaltyPercentOfPrice = Number.isFinite(priceNumber)
    ? loyaltyPointsPercentOfPrice(loyaltyPoints, priceNumber)
    : null;

  const syncLoyaltyFromPoints = (points: number, price: number) => {
    setLoyaltyPoints(points);
    const percent = loyaltyPointsPercentOfPrice(points, price);
    setLoyaltyPercentDraft(percent == null ? "" : String(percent));
  };

  const syncLoyaltyFromPercent = (percentRaw: string, price: number) => {
    setLoyaltyPercentDraft(percentRaw);
    const percent = parseFloat(percentRaw);
    if (Number.isNaN(percent) || !Number.isFinite(price) || price < 0) return;
    setLoyaltyPoints(loyaltyPointsFromPercent(percent, price));
  };

  const toggleAnimal = (animal: string) => {
    setSelectedAnimals((current) =>
      current.includes(animal)
        ? current.filter((item) => item !== animal)
        : [...current, animal]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId]
    );
  };

  const slotsLeft = PRODUCT_MEDIA_MAX - mediaUrls.length;

  const addTagsFromDraft = (raw: string) => {
    const parts = raw
      .split(/[,]+/)
      .map((part) => part.trim().toLowerCase().replace(/\s+/g, " "))
      .filter(Boolean);

    if (parts.length === 0) return;

    setTags((current) => {
      const next = [...current];
      for (const part of parts) {
        if (part.length > PRODUCT_TAG_MAX) continue;
        if (next.includes(part)) continue;
        if (next.length >= PRODUCT_TAGS_MAX) break;
        next.push(part);
      }
      return next;
    });
    setTagDraft("");
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    if (files.length > slotsLeft) {
      setError(
        `You can upload up to ${PRODUCT_MEDIA_MAX} photos or videos total.`
      );
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const publicUrl = await uploadFile({ file, purpose: "product" });
        uploadedUrls.push(publicUrl);
      }

      setMediaUrls((prev) => [...prev, ...uploadedUrls].slice(0, PRODUCT_MEDIA_MAX));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const price = Number(formData.get("price") || priceDraft);
    let compareAtPrice: number | null = null;

    if (discountValue.trim()) {
      const dv = parseFloat(discountValue);
      if (!Number.isNaN(dv) && dv > 0) {
        if (discountMode === "percentage" && dv >= 100) {
          setError("Discount percentage must be less than 100%.");
          setIsSubmitting(false);
          return;
        }
        compareAtPrice =
          discountMode === "percentage"
            ? Math.round((price / (1 - dv / 100)) * 100) / 100
            : Math.round((price + dv) * 100) / 100;
      }
    }

    if (selectedAnimals.length === 0) {
      setError("Select at least one animal.");
      setIsSubmitting(false);
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setError("Select at least one category.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      brand: formData.get("brand") as string,
      animals: selectedAnimals,
      tags,
      price,
      compareAtPrice,
      loyaltyPoints,
      stock: Number(formData.get("stock")),
      images: mediaUrls,
      categoryIds: selectedCategoryIds,
      locationName: formData.get("locationName") as string,
      locationAddress: formData.get("locationAddress") as string,
      locationCity: formData.get("locationCity") as string,
      locationCountry: formData.get("locationCountry") as string,
    };

    try {
      const result = await createProduct(payload);
      if (result.success) {
        router.push("/seller?tab=products");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create product. Make sure you are logged in as a SELLER."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Add Product
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Save a listing with up to {PRODUCT_MEDIA_MAX} photos or videos,
          description, brand, animals, categories, and filter tags. Quantity
          stays editable after you list.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 border border-line bg-surface p-6">
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Product Title
            </label>
            <input
              required
              name="title"
              type="text"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Description
            </label>
            <textarea
              required
              name="description"
              rows={4}
              placeholder="What is it, who is it for, and what should shoppers know?"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Brand
            </label>
            <input
              required
              name="brand"
              type="text"
              placeholder="e.g. namma pets Club"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Animals
            </label>
            <p className="mt-1 text-xs text-ink-muted">
              Assign every pet type this product fits. Used by shop-by-pet
              filters.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRODUCT_ANIMALS.map((animal) => {
                const selected = selectedAnimals.includes(animal);
                return (
                  <button
                    key={animal}
                    type="button"
                    onClick={() => toggleAnimal(animal)}
                    className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 transition-colors ${
                      selected
                        ? "bg-ink text-white ring-ink"
                        : "bg-surface-elevated text-ink-muted ring-line hover:text-ink"
                    }`}
                  >
                    {animal}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Tags
            </label>
            <p className="mt-1 text-xs text-ink-muted">
              Keywords shoppers and filters use to find this product. Press
              Enter or comma to add.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 border border-line bg-surface-elevated px-3 py-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-ink px-2 py-1 text-xs text-white"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      setTags((current) => current.filter((t) => t !== tag))
                    }
                    className="text-white/70 transition-colors hover:text-white"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTagsFromDraft(tagDraft);
                  } else if (
                    e.key === "Backspace" &&
                    !tagDraft &&
                    tags.length > 0
                  ) {
                    setTags((current) => current.slice(0, -1));
                  }
                }}
                onBlur={() => {
                  if (tagDraft.trim()) addTagsFromDraft(tagDraft);
                }}
                placeholder={
                  tags.length === 0
                    ? "e.g. leash, outdoor, small-breed"
                    : tags.length >= PRODUCT_TAGS_MAX
                      ? "Tag limit reached"
                      : "Add another tag"
                }
                disabled={tags.length >= PRODUCT_TAGS_MAX}
                className="min-w-[140px] flex-1 bg-transparent py-1 text-sm focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Price (INR)
              </label>
              <input
                required
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={priceDraft}
                onChange={(e) => {
                  const nextPrice = e.target.value;
                  setPriceDraft(nextPrice);
                  const parsed = Number(nextPrice);
                  if (!Number.isFinite(parsed)) return;
                  if (loyaltyPercentDraft.trim()) {
                    syncLoyaltyFromPercent(loyaltyPercentDraft, parsed);
                  } else {
                    syncLoyaltyFromPoints(loyaltyPoints, parsed);
                  }
                }}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Quantity
              </label>
              <input
                required
                name="stock"
                type="number"
                min="0"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
              <p className="mt-2 text-xs text-ink-muted">
                Always editable from Track My Products after you save.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Loyalty Points
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={loyaltyPoints}
                onChange={(e) => {
                  const points = Math.max(
                    0,
                    Math.floor(Number(e.target.value) || 0)
                  );
                  syncLoyaltyFromPoints(
                    points,
                    Number.isFinite(priceNumber) ? priceNumber : 0
                  );
                }}
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm tabular-nums focus:border-ink focus:outline-none"
              />
              <p className="mt-2 text-xs text-ink-muted">
                Editable anytime after you save.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Points vs Price
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={loyaltyPercentDraft}
                  onChange={(e) =>
                    syncLoyaltyFromPercent(
                      e.target.value,
                      Number.isFinite(priceNumber) ? priceNumber : 0
                    )
                  }
                  placeholder="0"
                  className="w-full border border-line bg-surface-elevated px-3 py-2 text-sm tabular-nums focus:border-ink focus:outline-none"
                />
                <span className="shrink-0 text-sm text-ink-muted">%</span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {loyaltyPercentOfPrice == null
                  ? "Enter a price to compare points as a percent."
                  : `${loyaltyPoints} pts = ${loyaltyPercentOfPrice}% of ₹${
                      Number.isFinite(priceNumber)
                        ? priceNumber.toFixed(2)
                        : "0.00"
                    }.`}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Categories
              </label>
              <Link
                href="/seller?tab=categories"
                className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
              >
                Manage yours
              </Link>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              A product can belong to multiple store and shop categories.
            </p>
            {categories.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                No categories available yet. Create one under Manage yours.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {categories.some((category) => category.isOwn) && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                      Your categories
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories
                        .filter((category) => category.isOwn)
                        .map((category) => {
                          const selected = selectedCategoryIds.includes(
                            category.id
                          );
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => toggleCategory(category.id)}
                              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 transition-colors ${
                                selected
                                  ? "bg-ink text-white ring-ink"
                                  : "bg-surface-elevated text-ink-muted ring-line hover:text-ink"
                              }`}
                            >
                              {category.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
                {categories.some((category) => !category.isOwn) && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                      Store categories
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories
                        .filter((category) => !category.isOwn)
                        .map((category) => {
                          const selected = selectedCategoryIds.includes(
                            category.id
                          );
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => toggleCategory(category.id)}
                              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 transition-colors ${
                                selected
                                  ? "bg-ink text-white ring-ink"
                                  : "bg-surface-elevated text-ink-muted ring-line hover:text-ink"
                              }`}
                            >
                              {category.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-line pt-5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Offer Discount
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Editable anytime after you save. Leave blank for no offer.
            </p>

            <div className="mt-4 flex items-end gap-3">
              <div className="flex rounded ring-1 ring-line">
                <button
                  type="button"
                  onClick={() => setDiscountMode("percentage")}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    discountMode === "percentage"
                      ? "bg-ink text-white"
                      : "bg-surface-elevated text-ink-muted hover:text-ink"
                  }`}
                  aria-label="Discount as percent"
                >
                  <Percent className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode("fixed")}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    discountMode === "fixed"
                      ? "bg-ink text-white"
                      : "bg-surface-elevated text-ink-muted hover:text-ink"
                  }`}
                  aria-label="Discount as amount"
                >
                  ₹
                </button>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  {discountMode === "percentage"
                    ? "Discount %"
                    : "Amount off (₹)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountMode === "percentage" ? "99" : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={
                    discountMode === "percentage" ? "e.g. 20" : "e.g. 10.00"
                  }
                  className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm tabular-nums focus:border-ink focus:outline-none"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Products with a discount appear in the Offers section on the
              homepage.
            </p>
          </div>
        </div>

        <div className="border border-line bg-surface p-6">
          <h3 className="font-display text-lg font-medium text-ink">
            Product Location
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Location Name
              </label>
              <input
                name="locationName"
                type="text"
                placeholder="Main Warehouse"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Address
              </label>
              <input
                name="locationAddress"
                type="text"
                placeholder="123 Commerce St"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                City
              </label>
              <input
                name="locationCity"
                type="text"
                placeholder="Portland"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Country
              </label>
              <input
                name="locationCountry"
                type="text"
                placeholder="United States"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="border border-line bg-surface p-6">
          <div className="flex items-baseline justify-between gap-4">
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Photos & Videos
            </label>
            <span className="text-xs tabular-nums text-ink-muted">
              {mediaUrls.length}/{PRODUCT_MEDIA_MAX}
            </span>
          </div>
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
            multiple
            onChange={handleMediaUpload}
            disabled={isUploading || isSubmitting || slotsLeft <= 0}
            className="mt-2 w-full text-sm text-ink-muted file:mr-4 file:border file:border-line file:bg-surface-elevated file:px-4 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wide file:text-ink"
          />
          <p className="mt-2 text-xs text-ink-muted">
            Up to {PRODUCT_MEDIA_MAX} uploads. Photos and videos (MP4, WebM,
            OGG, MOV).
          </p>
          {isUploading && (
            <p className="mt-2 text-sm text-ink-muted">Uploading media…</p>
          )}

          {mediaUrls.length > 0 && (
            <div className="mt-4 flex gap-4 overflow-x-auto py-2">
              {mediaUrls.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-line bg-surface-elevated"
                >
                  {isVideoUrl(url) ? (
                    <video
                      src={url}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-ink/80 text-white transition-colors hover:bg-ink"
                    aria-label="Remove media"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={
            isUploading ||
            isSubmitting ||
            mediaUrls.length === 0 ||
            tags.length === 0 ||
            selectedAnimals.length === 0 ||
            selectedCategoryIds.length === 0
          }
          className="border border-ink bg-ink px-6 py-3 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving Product…" : "Save Product"}
        </button>
      </form>
    </div>
  );
}

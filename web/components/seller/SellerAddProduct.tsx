"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/actions/product";
import { Percent, Tag } from "lucide-react";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export default function SellerAddProduct() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountMode, setDiscountMode] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setError("");

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!res.ok) throw new Error("Failed to get upload URL");
        const { url, publicUrl } = await res.json();

        const uploadRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
        uploadedUrls.push(publicUrl);
      }

      setImageUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const price = Number(formData.get("price"));
    let compareAtPrice: number | null = null;

    if (showDiscount && discountValue.trim()) {
      const dv = parseFloat(discountValue);
      if (!Number.isNaN(dv) && dv > 0) {
        compareAtPrice =
          discountMode === "percentage"
            ? Math.round((price / (1 - dv / 100)) * 100) / 100
            : Math.round((price + dv) * 100) / 100;
      }
    }

    const payload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      price,
      compareAtPrice,
      stock: Number(formData.get("stock")),
      images: imageUrls,
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
          List a new product with pricing, stock, and warehouse location.
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
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Price (USD)
              </label>
              <input
                required
                name="price"
                type="number"
                step="0.01"
                min="0"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                Initial Stock
              </label>
              <input
                required
                name="stock"
                type="number"
                min="0"
                className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2 text-sm focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Offer Discount
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDiscount(!showDiscount);
                  if (!showDiscount) setDiscountValue("");
                }}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide ring-1 transition-colors ${
                  showDiscount
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-surface-elevated text-ink-muted ring-line hover:text-ink"
                }`}
              >
                {showDiscount ? "On" : "Off"}
              </button>
            </div>

            {showDiscount && (
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
                  >
                    $
                  </button>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    {discountMode === "percentage"
                      ? "Discount %"
                      : "Amount off ($)"}
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
            )}
            {showDiscount && (
              <p className="mt-2 text-xs text-ink-muted">
                Products with a discount appear in the Offers section on the
                homepage.
              </p>
            )}
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
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
            Product Media
          </label>
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
            multiple
            onChange={handleImageUpload}
            disabled={isUploading || isSubmitting}
            className="mt-2 w-full text-sm text-ink-muted file:mr-4 file:border file:border-line file:bg-surface-elevated file:px-4 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wide file:text-ink"
          />
          <p className="mt-2 text-xs text-ink-muted">
            Upload product images and videos. Supported videos: MP4, WebM, OGG, MOV.
          </p>
          {isUploading && (
            <p className="mt-2 text-sm text-ink-muted">Uploading media…</p>
          )}

          {imageUrls.length > 0 && (
            <div className="mt-4 flex gap-4 overflow-x-auto py-2">
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-line bg-surface-elevated"
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
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isUploading || isSubmitting || imageUrls.length === 0}
          className="border border-ink bg-ink px-6 py-3 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating Product…" : "List Product"}
        </button>
      </form>
    </div>
  );
}

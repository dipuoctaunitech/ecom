"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/actions/product";
import { uploadFile } from "@/lib/upload-client";
import {
  PRODUCT_ANIMALS,
  PRODUCT_MEDIA_MAX,
  PRODUCT_TAG_MAX,
  PRODUCT_TAGS_MAX,
} from "@/lib/product-meta";
import { X } from "lucide-react";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export default function SellerProductForm() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [error, setError] = useState("");

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

      setMediaUrls((prev) =>
        [...prev, ...uploadedUrls].slice(0, PRODUCT_MEDIA_MAX)
      );
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
    const payload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      brand: formData.get("brand") as string,
      animals: selectedAnimals,
      tags,
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
      images: mediaUrls,
      categoryIds: [],
    };

    try {
      const result = await createProduct(payload);
      if (result.success) {
        router.push("/");
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Create New Product</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Product Title</label>
          <input
            required
            name="title"
            type="text"
            className="w-full rounded-md border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            required
            name="description"
            rows={4}
            className="w-full rounded-md border p-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Brand</label>
            <input
              required
              name="brand"
              type="text"
              className="w-full rounded-md border p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Animals</label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_ANIMALS.map((animal) => {
                const selected = selectedAnimals.includes(animal);
                return (
                  <button
                    key={animal}
                    type="button"
                    onClick={() =>
                      setSelectedAnimals((current) =>
                        selected
                          ? current.filter((item) => item !== animal)
                          : [...current, animal]
                      )
                    }
                    className={`rounded px-2 py-1 text-xs ${
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {animal}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Tags</label>
          <div className="flex flex-wrap gap-2 rounded-md border p-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded bg-gray-900 px-2 py-1 text-xs text-white"
              >
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    setTags((current) => current.filter((t) => t !== tag))
                  }
                >
                  <X className="h-3 w-3" />
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
                }
              }}
              onBlur={() => {
                if (tagDraft.trim()) addTagsFromDraft(tagDraft);
              }}
              placeholder="Add keywords, press Enter"
              className="min-w-[140px] flex-1 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Price (INR)</label>
            <input
              required
              name="price"
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-md border p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Quantity</label>
            <input
              required
              name="stock"
              type="number"
              min="0"
              className="w-full rounded-md border p-2"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="mb-2 block text-sm font-medium">
            Photos & Videos ({mediaUrls.length}/{PRODUCT_MEDIA_MAX})
          </label>
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
            multiple
            onChange={handleMediaUpload}
            disabled={isUploading || isSubmitting || slotsLeft <= 0}
            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-2 text-sm text-gray-500">
            Upload up to {PRODUCT_MEDIA_MAX} images or videos.
          </p>
          {isUploading && (
            <p className="mt-2 text-sm text-blue-600">Uploading…</p>
          )}

          {mediaUrls.length > 0 && (
            <div className="mt-4 flex gap-4 overflow-x-auto py-2">
              {mediaUrls.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border"
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
                    onClick={() =>
                      setMediaUrls((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white"
                  >
                    <X className="h-3 w-3" />
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
            selectedAnimals.length === 0
          }
          className="mt-6 w-full rounded-md bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving Product..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}

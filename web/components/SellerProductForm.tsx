"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/actions/product";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export default function SellerProductForm() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState("");

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
    const payload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
      images: imageUrls,
    };

    try {
      const result = await createProduct(payload);
      if (result.success) {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Failed to create product. Make sure you are logged in as a SELLER.");
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
            <label className="mb-1 block text-sm font-medium">Price (USD)</label>
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
            <label className="mb-1 block text-sm font-medium">Initial Stock</label>
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
          <label className="mb-2 block text-sm font-medium">Product Media</label>
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
            multiple
            onChange={handleImageUpload}
            disabled={isUploading || isSubmitting}
            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-2 text-sm text-gray-500">
            Upload images or videos for this product.
          </p>
          {isUploading && (
            <p className="mt-2 text-sm text-blue-600">Uploading to MinIO...</p>
          )}

          {imageUrls.length > 0 && (
            <div className="mt-4 flex gap-4 overflow-x-auto py-2">
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border"
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
          className="mt-6 w-full rounded-md bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating Product..." : "List Product"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/upload-client";

export default function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const publicUrl = await uploadFile({ file, purpose: "product" });
      setImageUrl(publicUrl);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Product image</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm text-ink-muted file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-800 disabled:opacity-60"
        />
      </label>

      {uploading && (
        <p className="text-sm text-ink-muted">Uploading…</p>
      )}

      {imageUrl && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-green-700">Upload complete!</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Uploaded preview"
            className="h-40 w-40 rounded-md border border-line object-cover"
          />
        </div>
      )}
    </div>
  );
}

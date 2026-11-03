"use client"

import { FormEvent, useState, useTransition } from "react"
import { QrCode, Trash2, Upload } from "lucide-react"
import {
  updateSellerGstNumber,
  updateSellerQrCode,
  type SellerQrSettings,
} from "@/app/actions/seller"
import { EnlargeableImage } from "@/components/EnlargeableImage"
import { uploadFile } from "@/lib/upload-client"

export default function SellerQrPanel({
  initialSettings,
}: {
  initialSettings: SellerQrSettings
}) {
  const [qrCodeUrl, setQrCodeUrl] = useState(initialSettings.qrCodeUrl)
  const [gstNumber, setGstNumber] = useState(initialSettings.gstNumber ?? "")
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  const busy = isUploading || isPending

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError("")
    setSaved("")
    setIsUploading(true)

    try {
      const publicUrl = await uploadFile({ file, purpose: "qr" })
      await updateSellerQrCode(publicUrl)
      setQrCodeUrl(publicUrl)
      setSaved("Payment QR saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  function handleRemove() {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await updateSellerQrCode(null)
        setQrCodeUrl(null)
        setSaved("Payment QR removed.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove payment QR"
        )
      }
    })
  }

  function handleGstSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        const result = await updateSellerGstNumber(gstNumber)
        setGstNumber(result.gstNumber ?? "")
        setSaved("GST number saved.")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save GST number"
        )
      }
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Payment & GST
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Add your GSTIN (required) and payment QR. Both appear on checkout with
          your items.
        </p>
      </div>

      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {saved}
        </p>
      )}

      <section className="mb-6 border border-line bg-surface p-6">
        <h3 className="font-display text-lg font-medium text-ink">
          GST number
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Required 15-character GSTIN shown to buyers at checkout.
        </p>
        <form onSubmit={handleGstSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="sr-only">GST number</span>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              placeholder="29ABCDE1234F1Z5"
              maxLength={15}
              required
              className="h-11 w-full border border-line bg-surface-elevated px-3 font-mono text-sm uppercase tracking-wide text-ink outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted focus:border-ink/40"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center justify-center bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save GST"}
          </button>
        </form>
        {!initialSettings.gstNumber && !gstNumber.trim() ? (
          <p className="mt-3 text-xs text-amber-800">
            Add your GST number before buyers check out with your products.
          </p>
        ) : null}
      </section>

      <section className="border border-line bg-surface p-6">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-ink" strokeWidth={1.75} />
          <h3 className="font-display text-lg font-medium text-ink">
            Seller QR code
          </h3>
        </div>

        {qrCodeUrl ? (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
            <EnlargeableImage
              src={qrCodeUrl}
              alt="Seller payment QR code"
              wrapClassName="h-48 w-48 p-3"
              className="h-full w-full object-contain"
            />
            <div className="flex flex-col gap-3">
              <p className="max-w-sm text-sm text-ink-muted">
                This QR is shown to buyers next to your items at checkout.
              </p>
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 border border-line bg-surface-elevated px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:border-ink/40">
                <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                {busy ? "Uploading…" : "Replace QR"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={busy}
                  onChange={handleUpload}
                />
              </label>
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="inline-flex w-fit items-center gap-2 text-sm text-ink-muted transition-colors hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Remove QR code
              </button>
            </div>
          </div>
        ) : (
          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center border border-dashed border-line bg-surface-elevated px-6 py-12 text-center transition-colors hover:border-ink/40">
            <QrCode className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
            <span className="mt-3 text-sm font-medium text-ink">
              {busy ? "Uploading…" : "Upload payment QR"}
            </span>
            <span className="mt-1 text-xs text-ink-muted">
              JPEG, PNG, WebP, or GIF
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={busy}
              onChange={handleUpload}
            />
          </label>
        )}
      </section>
    </div>
  )
}

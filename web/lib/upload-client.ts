export type UploadPurpose = "product" | "qr" | "receipt" | "category" | "service"
/** Store-wide Shop by Category vs seller-private category covers. */
export type CategoryUploadScope = "store" | "seller"

export async function uploadFile(options: {
  file: File
  purpose: UploadPurpose
  orderId?: string
  sellerId?: string
  /** Required when purpose is category and the uploader is a store manager. */
  categoryScope?: CategoryUploadScope
}): Promise<string> {
  const form = new FormData()
  form.set("file", options.file)
  form.set("purpose", options.purpose)
  if (options.orderId) form.set("orderId", options.orderId)
  if (options.sellerId) form.set("sellerId", options.sellerId)
  if (options.categoryScope) form.set("categoryScope", options.categoryScope)

  const res = await fetch("/api/upload", {
    method: "POST",
    body: form,
  })

  const body = (await res.json().catch(() => null)) as {
    error?: string
    publicUrl?: string
  } | null

  if (!res.ok || !body?.publicUrl) {
    throw new Error(body?.error ?? "Upload failed")
  }

  return body.publicUrl
}

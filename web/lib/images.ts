const BUCKET = process.env.MINIO_BUCKET_NAME ?? "ecommerce-assets"

/** Serve product images through the app so MinIO can stay private. */
export function resolveProductImageUrl(url: string): string {
  if (!url) return ""

  if (url.startsWith("/api/images/")) {
    return url
  }

  const minioPattern = new RegExp(
    `^https?://[^/]+/${BUCKET}/(.+)$`
  )
  const match = url.match(minioPattern)
  if (match) {
    return `/api/images/${match[1]}`
  }

  return url
}

export function productImageApiPath(key: string): string {
  return `/api/images/${key}`
}

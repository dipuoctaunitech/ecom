type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      buckets.delete(key)
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  cleanupExpiredBuckets(now)

  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now }
  }

  bucket.count++
  return { allowed: true, retryAfterMs: 0 }
}

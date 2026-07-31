export function getClientIp(request: Request): string {
  const resolved = resolveClientIp(request)

  return resolved
}

function resolveClientIp(request: Request): string {
  // X-Forwarded-For and X-Real-IP are trivially spoofable by any client, so
  // they are only trusted when a proxy is known to be rewriting them.
  // Otherwise callers get "unknown" and must fall back to a stable identity
  // (such as the user id) for rate limiting.
  if (process.env.TRUST_PROXY_HEADERS !== "true") {
    return "unknown"
  }

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  return "unknown"
}

import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"

/**
 * Call the session endpoint on loopback, never via NEXTAUTH_URL.
 * NEXTAUTH_URL is the public origin; this instance cannot hairpin that
 * Elastic IP, so the fetch timed out and /admin (and /seller) never loaded.
 * Do not use `nextUrl.origin` either: it reflects client-controlled
 * forwarding headers and would leak the session cookie off-host.
 */
function internalOrigin(): string {
  const configured = process.env.NEXTAUTH_INTERNAL_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // Fall through to the process bind address.
    }
  }
  const port = process.env.PORT || "3000"
  return `http://127.0.0.1:${port}`
}

async function resolveRoleFromSession(
  origin: string,
  cookie: string | null
): Promise<{ role: Role | null; resolved: boolean }> {
  if (!cookie) return { role: null, resolved: true }

  try {
    const response = await fetch(`${origin}/api/auth/session`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return { role: null, resolved: false }
    const session = (await response.json()) as {
      user?: { role?: Role }
    }
    if (!session.user) {
      return { role: null, resolved: true }
    }
    return { role: session.user.role ?? null, resolved: true }
  } catch {
    return { role: null, resolved: false }
  }
}

export default withAuth(
  async function middleware(req) {
    const path = req.nextUrl.pathname
    const cookie = req.headers.get("cookie")
    const jwtRole = (req.nextauth.token?.role as Role | undefined) ?? null

    const origin = internalOrigin()
    const { role: liveRole, resolved } = await resolveRoleFromSession(
      origin,
      cookie
    )

    // Prefer the live session (DB-refreshed role). If that lookup fails,
    // fall back to JWT role so a transient session fetch failure does not
    // lock out staff. Demotion is enforced when the session resolves.
    const effectiveRole = resolved ? liveRole : jwtRole

    if (path.startsWith("/admin") && effectiveRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    if (path.startsWith("/seller") && effectiveRole !== "SELLER") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    if (path.startsWith("/delivery") && effectiveRole !== "DELIVERY") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    if (path.startsWith("/manager") && effectiveRole !== "SELLER") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // Store floor board: ADMIN + SELLER only (not buyers or delivery).
    if (
      path.startsWith("/store") &&
      effectiveRole !== "ADMIN" &&
      effectiveRole !== "SELLER"
    ) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // /account, /groomer, /doctor, /manager require signed-in users;
    // page-level guards enforce staff / manager membership.
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        if (
          path.startsWith("/admin") ||
          path.startsWith("/seller") ||
          path.startsWith("/delivery") ||
          path.startsWith("/account") ||
          path.startsWith("/groomer") ||
          path.startsWith("/doctor") ||
          path.startsWith("/manager") ||
          path.startsWith("/store")
        ) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/seller",
    "/seller/:path*",
    "/delivery",
    "/delivery/:path*",
    "/account",
    "/account/:path*",
    "/groomer",
    "/groomer/:path*",
    "/doctor",
    "/doctor/:path*",
    "/manager",
    "/manager/:path*",
    "/store",
    "/store/:path*",
  ],
}

import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { Role } from "@prisma/client"

/**
 * Pinned to configuration rather than the incoming request: `nextUrl.origin`
 * reflects client-controlled forwarding headers, which both redirects this
 * internal call to an unintended origin and leaks the session cookie to it.
 */
function selfOrigin(fallback: string): string {
  const configured = process.env.NEXTAUTH_URL
  if (!configured) return fallback
  try {
    return new URL(configured).origin
  } catch {
    return fallback
  }
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

    const effectiveOrigin = selfOrigin(req.nextUrl.origin)

    const { role: liveRole, resolved } = await resolveRoleFromSession(
      effectiveOrigin,
      cookie
    )
    if (!resolved) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    const effectiveRole = liveRole

    if (path.startsWith("/admin") && effectiveRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    if (path.startsWith("/seller") && effectiveRole !== "SELLER") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        if (path.startsWith("/admin") || path.startsWith("/seller")) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: ["/admin", "/admin/:path*", "/seller", "/seller/:path*"],
}

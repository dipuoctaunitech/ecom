import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getClientIp } from "@/lib/client-ip"
import { rateLimit } from "@/lib/rate-limit"

const LOGIN_RATE_LIMIT = 10
const LOGIN_WINDOW_MS = 60_000
/** Caps credential-stuffing across many accounts from one source. */
const LOGIN_IP_RATE_LIMIT = 30
const PRIVILEGED_ROLES = new Set<Role>(["ADMIN", "SELLER"])

/**
 * Compared against when no user matches, so an unknown email costs the same
 * bcrypt work as a known one and cannot be identified by response time.
 * Cost 12 matches the cost used for real password hashes.
 */
const DUMMY_PASSWORD_HASH =
  "$2b$12$jbUOsWKTmtQZgksRU9qa6ukyk2f2ZV1dJcE2hhvwI16HW6uzd2Kbi"

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET must be set in the environment.")
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email
        const password = credentials?.password

        if (!email || !password) {
          return null
        }

        const loginKey = email.trim().toLowerCase()
        const { allowed } = rateLimit(
          `login:${loginKey}`,
          LOGIN_RATE_LIMIT,
          LOGIN_WINDOW_MS
        )

        if (!allowed) {
          throw new Error("Too many login attempts. Try again later.")
        }

        // Per-email limits alone let an attacker spray one password across many
        // accounts, so also cap attempts per source when the IP is trustworthy.
        const clientIp = getClientIp(
          new Request("http://localhost", {
            headers: new Headers(
              (req?.headers as Record<string, string>) ?? {}
            ),
          })
        )

        if (clientIp !== "unknown") {
          const ipAttempt = rateLimit(
            `login-ip:${clientIp}`,
            LOGIN_IP_RATE_LIMIT,
            LOGIN_WINDOW_MS
          )
          if (!ipAttempt.allowed) {
            throw new Error("Too many login attempts. Try again later.")
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: loginKey },
        })

        // Always run a comparison, even for unknown emails, so the response
        // time does not reveal whether the account exists.
        const isValid = await bcrypt.compare(
          password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH
        )

        if (!user?.passwordHash || !isValid) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        if (!dbUser) {
          token.error = "SessionRevoked"
        } else if (
          dbUser.role !== token.role &&
          PRIVILEGED_ROLES.has(token.role as Role) &&
          !PRIVILEGED_ROLES.has(dbUser.role)
        ) {
          token.error = "SessionRevoked"
        } else {
          token.role = dbUser.role
        }
      }

      return token
    },
    session({ session, token }) {
      if (token.error === "SessionRevoked") {
        return { ...session, user: undefined, expires: new Date(0).toISOString() }
      }
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
}

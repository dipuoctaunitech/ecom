import { config } from "dotenv"
import { resolve } from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

config({ path: resolve(process.cwd(), "../.env"), quiet: true })
config({ path: resolve(process.cwd(), ".env.local"), quiet: true })
config({ path: resolve(process.cwd(), ".env"), quiet: true })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to ecommerce-project/.env and restart the dev server."
    )
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

const REQUIRED_DELEGATES = [
  "product",
  "order",
  "sellerSettings",
  "discountCode",
] as const

function isClientFresh(client: PrismaClient) {
  return REQUIRED_DELEGATES.every((delegate) => delegate in client)
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma

  // Recreate in dev if a stale client was cached before prisma generate.
  if (cached && isClientFresh(cached)) {
    return cached
  }

  const client = createPrismaClient()
  globalForPrisma.prisma = client
  return client
}

export const prisma = getPrismaClient()

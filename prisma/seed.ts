import "dotenv/config"
import { PrismaClient, Role } from "../web/node_modules/.prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ADMIN_EMAIL = "admin@forma.local"

const SEED_PASSWORD = process.env.SEED_PASSWORD
if (!SEED_PASSWORD || SEED_PASSWORD.length < 12) {
  throw new Error(
    "Set SEED_PASSWORD (min 12 characters) in .env before running the seed."
  )
}

function unsplash(id: string, w = 900) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`
}

const CATEGORIES = [
  {
    name: "Lighting",
    slug: "lighting",
    image: unsplash("1513506003901-1e6a229e2d15", 400),
  },
  {
    name: "Kitchenware",
    slug: "kitchenware",
    image: unsplash("1556909114-f6e7ad7d3136", 400),
  },
  {
    name: "Tableware",
    slug: "tableware",
    image: unsplash("1519710164239-da123dc03ef4", 400),
  },
  {
    name: "Textiles & Bedding",
    slug: "textiles",
    image: unsplash("1522771739844-6a9f6d5f14af", 400),
  },
  {
    name: "Bath",
    slug: "bath",
    image: unsplash("1584622650111-993a426fbf0a", 400),
  },
  {
    name: "Storage",
    slug: "storage",
    image: unsplash("1600166898405-da9535204843", 400),
  },
  {
    name: "Furniture",
    slug: "furniture",
    image: unsplash("1567538096630-e0c55bd6374c", 400),
  },
  {
    name: "Outdoor & Garden",
    slug: "outdoor",
    image: unsplash("1526170375885-4d8ecf77b99f", 400),
  },
] as const

interface SeedProduct {
  title: string
  description: string
  price: number
  compareAtPrice?: number
  stock: number
  categorySlug: (typeof CATEGORIES)[number]["slug"]
  image: string
}

const PRODUCTS: SeedProduct[] = [
  // Lighting
  {
    title: "Brass Arc Floor Lamp",
    description:
      "A sweeping brass arc lamp with a hand-blown opal glass shade. Casts a warm, diffused glow across the room.",
    price: 189,
    compareAtPrice: 240,
    stock: 6,
    categorySlug: "lighting",
    image: unsplash("1524758631624-e2822e304c36"),
  },
  {
    title: "Woven Rattan Pendant Light",
    description:
      "Hand-woven rattan pendant that filters light into soft, dappled patterns. Solid brass hardware included.",
    price: 96,
    stock: 10,
    categorySlug: "lighting",
    image: unsplash("1513506003901-1e6a229e2d15"),
  },
  {
    title: "Minimal LED Desk Lamp",
    description:
      "Adjustable LED desk lamp with warm and cool light modes and a weighted matte base.",
    price: 58,
    compareAtPrice: 72,
    stock: 14,
    categorySlug: "lighting",
    image: unsplash("1507473885765-e6ed057f782c"),
  },
  {
    title: "Amber Glass Table Lamp",
    description:
      "Mouth-blown amber glass base paired with a natural linen shade for soft ambient light.",
    price: 74,
    compareAtPrice: 89,
    stock: 9,
    categorySlug: "lighting",
    image: unsplash("1616486029423-aaa4789e8c9a"),
  },

  // Kitchenware
  {
    title: "Ceramic Pour-Over Set",
    description: "Hand-glazed ceramic dripper with matching server.",
    price: 48,
    compareAtPrice: 62,
    stock: 8,
    categorySlug: "kitchenware",
    image: unsplash("1495474472287-4d71bcdd2085"),
  },
  {
    title: "Walnut End-Grain Cutting Board",
    description:
      "Thick end-grain walnut board with a juice groove and integrated handles. Finished with food-safe oil.",
    price: 64,
    compareAtPrice: 80,
    stock: 11,
    categorySlug: "kitchenware",
    image: unsplash("1590794056226-79ef3a8147e1"),
  },
  {
    title: "Copper-Finish Saucepan Set",
    description:
      "Tri-ply stainless saucepans with a brushed copper exterior. Set of three with lids.",
    price: 138,
    stock: 7,
    categorySlug: "kitchenware",
    image: unsplash("1556909114-f6e7ad7d3136"),
  },
  {
    title: "Marble Mortar & Pestle",
    description:
      "Solid Carrara marble mortar and pestle for grinding spices, herbs, and pastes.",
    price: 42,
    compareAtPrice: 52,
    stock: 15,
    categorySlug: "kitchenware",
    image: unsplash("1614963366795-973eb8748ebb"),
  },
  {
    title: "Enamel Dutch Oven",
    description:
      "5-quart cast iron Dutch oven with a chip-resistant enamel finish, oven-safe to 500°F.",
    price: 128,
    compareAtPrice: 160,
    stock: 6,
    categorySlug: "kitchenware",
    image: unsplash("1592078615290-033ee584e267"),
  },

  // Tableware
  {
    title: "Stoneware Dinner Set (4-Piece)",
    description:
      "Reactive-glaze stoneware dinner plates and bowls in a soft, earthy palette. Service for two.",
    price: 96,
    compareAtPrice: 120,
    stock: 8,
    categorySlug: "tableware",
    image: unsplash("1578500494198-246f612d3b3d"),
  },
  {
    title: "Hand-Blown Wine Glasses (Set of 2)",
    description:
      "Delicate hand-blown wine glasses with a subtly organic silhouette.",
    price: 54,
    stock: 12,
    categorySlug: "tableware",
    image: unsplash("1544816155-12df9643f363"),
  },
  {
    title: "Textured Ceramic Bowls (Set of 4)",
    description:
      "Speckled stoneware bowls, stackable and dishwasher safe, in a warm neutral glaze.",
    price: 58,
    compareAtPrice: 72,
    stock: 10,
    categorySlug: "tableware",
    image: unsplash("1519710164239-da123dc03ef4"),
  },
  {
    title: "Linen Table Napkins (Set of 4)",
    description: "Stone-washed European linen napkins with mitred corners.",
    price: 32,
    stock: 18,
    categorySlug: "tableware",
    image: unsplash("1493663284031-b7e3aefcae8e"),
  },

  // Textiles & Bedding
  {
    title: "Stone-Washed Linen Throw",
    description:
      "Lightweight stone-washed linen throw for sofa or bed, softened for a broken-in feel.",
    price: 72,
    stock: 5,
    categorySlug: "textiles",
    image: unsplash("1584100936595-c0654b55a2e2"),
  },
  {
    title: "Belgian Linen Duvet Cover",
    description:
      "Pre-washed Belgian linen duvet cover that gets softer with every wash. Includes matching shams.",
    price: 148,
    compareAtPrice: 185,
    stock: 4,
    categorySlug: "textiles",
    image: unsplash("1522771739844-6a9f6d5f14af"),
  },
  {
    title: "Waffle Cotton Bath Towel Set",
    description:
      "Quick-drying waffle-weave cotton towels, set of two bath towels and two hand towels.",
    price: 46,
    compareAtPrice: 58,
    stock: 13,
    categorySlug: "textiles",
    image: unsplash("1585237017125-24baf8d7406f"),
  },

  // Bath
  {
    title: "Ceramic Soap Dispenser",
    description:
      "Matte ceramic soap dispenser with a stainless steel pump.",
    price: 24,
    compareAtPrice: 30,
    stock: 20,
    categorySlug: "bath",
    image: unsplash("1584622650111-993a426fbf0a"),
  },
  {
    title: "Teak Bath Caddy",
    description:
      "Solid teak bathtub caddy with a book slot and wine glass holder.",
    price: 58,
    stock: 9,
    categorySlug: "bath",
    image: unsplash("1615529162924-f8605388461d"),
  },

  // Storage
  {
    title: "Woven Seagrass Baskets (Set of 3)",
    description:
      "Hand-woven seagrass storage baskets in graduated sizes, perfect for blankets or plants.",
    price: 64,
    compareAtPrice: 80,
    stock: 8,
    categorySlug: "storage",
    image: unsplash("1600166898405-da9535204843"),
  },
  {
    title: "Oak Floating Wall Shelf",
    description:
      "Solid oak floating shelf with hidden brackets for a clean, minimal look.",
    price: 88,
    compareAtPrice: 110,
    stock: 6,
    categorySlug: "storage",
    image: unsplash("1594026112284-02bb6f3352fe"),
  },

  // Furniture
  {
    title: "Bouclé Accent Chair",
    description:
      "Curved accent chair upholstered in ivory bouclé with solid beechwood legs.",
    price: 420,
    compareAtPrice: 520,
    stock: 3,
    categorySlug: "furniture",
    image: unsplash("1567538096630-e0c55bd6374c"),
  },
  {
    title: "Ash Wood Side Table",
    description:
      "Sculptural solid ash side table with a hand-rubbed oil finish.",
    price: 165,
    stock: 5,
    categorySlug: "furniture",
    image: unsplash("1499933374294-4584851497cc"),
  },

  // Outdoor & Garden
  {
    title: "Terracotta Planter Trio",
    description:
      "Set of three unglazed terracotta planters in graduated sizes with drainage holes.",
    price: 54,
    compareAtPrice: 68,
    stock: 16,
    categorySlug: "outdoor",
    image: unsplash("1526170375885-4d8ecf77b99f"),
  },
  {
    title: "Potted Olive Tree",
    description:
      "A mature potted olive tree in a woven fibre planter, thriving indoors or out.",
    price: 128,
    stock: 4,
    categorySlug: "outdoor",
    image: unsplash("1485955900006-10f4d324d411"),
  },
]

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12)

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Admin",
      role: Role.ADMIN,
      passwordHash,
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  })

  const buyer = await prisma.user.upsert({
    where: { email: "buyer@forma.local" },
    update: { name: "Jane Buyer", role: Role.BUYER, passwordHash },
    create: {
      email: "buyer@forma.local",
      name: "Jane Buyer",
      role: Role.BUYER,
      passwordHash,
    },
  })

  const seller = await prisma.user.upsert({
    where: { email: "seller@forma.local" },
    update: { name: "Sam Seller", role: Role.SELLER, passwordHash },
    create: {
      email: "seller@forma.local",
      name: "Sam Seller",
      role: Role.SELLER,
      passwordHash,
    },
  })

  await prisma.sellerSettings.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: { sellerId: seller.id },
  })

  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  })

  const categoryIdBySlug = new Map<string, string>()
  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, image: cat.image },
      create: cat,
    })
    categoryIdBySlug.set(cat.slug, record.id)
  }

  const seedSlugs = CATEGORIES.map((cat) => cat.slug)
  await prisma.category.deleteMany({
    where: {
      slug: { notIn: seedSlugs },
      products: { none: {} },
    },
  })

  let firstSeededProductId: string | null = null

  for (const item of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(item.categorySlug)
    const existing = await prisma.product.findFirst({
      where: { title: item.title, sellerId: seller.id },
      select: { id: true },
    })

    const data = {
      title: item.title,
      description: item.description,
      price: item.price,
      compareAtPrice: item.compareAtPrice ?? null,
      stock: item.stock,
      lowStockThreshold: 5,
      images: [item.image],
      sellerId: seller.id,
      categoryId,
      locationName: "Portland Fulfillment Center",
      locationAddress: "1200 NW Everett St",
      locationCity: "Portland",
      locationCountry: "United States",
    }

    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data })

    if (!firstSeededProductId) {
      firstSeededProductId = product.id
    }
  }

  const existingOrder = await prisma.order.findFirst({
    where: { buyerId: buyer.id },
  })

  if (!existingOrder && firstSeededProductId) {
    const firstProduct = await prisma.product.findUnique({
      where: { id: firstSeededProductId },
    })

    if (firstProduct) {
      await prisma.order.create({
        data: {
          buyerId: buyer.id,
          status: "DELIVERED",
          totalAmount: Number(firstProduct.price),
          items: {
            create: {
              productId: firstProduct.id,
              quantity: 1,
              priceAtPurchase: firstProduct.price,
            },
          },
        },
      })
    }
  }

  await prisma.discountCode.upsert({
    where: { code: "WELCOME10" },
    update: { isActive: true },
    create: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 25,
      maxUses: 100,
      isActive: true,
    },
  })

  const existingTicket = await prisma.supportTicket.findFirst({
    where: { userId: buyer.id },
  })

  if (!existingTicket) {
    await prisma.supportTicket.create({
      data: {
        userId: buyer.id,
        subject: "Shipping delay inquiry",
        message:
          "My order was marked shipped 5 days ago but tracking hasn't updated.",
        status: "OPEN",
        priority: "MEDIUM",
      },
    })
  }

  console.log(`Seeded admin user: ${ADMIN_EMAIL}`)
  console.log(`Seeded demo buyer: buyer@forma.local`)
  console.log(`Seeded demo seller: seller@forma.local`)
  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products`)
  console.log("Use the SEED_PASSWORD value from your .env file to sign in.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

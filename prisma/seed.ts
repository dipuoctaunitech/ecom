import "dotenv/config"
import {
  BookingStatus,
  PrismaClient,
  Role,
  StaffType,
  ServiceVertical,
  StoreMemberRole,
} from "../web/node_modules/.prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SEED_PASSWORD = process.env.SEED_PASSWORD
if (!SEED_PASSWORD || SEED_PASSWORD.length < 12) {
  throw new Error(
    "Set SEED_PASSWORD (min 12 characters) in .env before running the seed."
  )
}

/** One login per platform Role and each StoreMemberRole. */
const SEED_ACCOUNTS = {
  admin: {
    email: "admin@forma.local",
    name: "Admin",
    role: Role.ADMIN,
  },
  buyer: {
    email: "buyer@forma.local",
    name: "Jane Buyer",
    role: Role.BUYER,
  },
  seller: {
    email: "seller@forma.local",
    name: "Sam Seller",
    role: Role.SELLER,
    storeRole: StoreMemberRole.OWNER,
  },
  manager: {
    email: "manager@forma.local",
    name: "Morgan Manager",
    role: Role.SELLER,
    storeRole: StoreMemberRole.MANAGER,
  },
  groomer: {
    email: "groomer@forma.local",
    name: "Mia Chen",
    role: Role.SELLER,
    storeRole: StoreMemberRole.GROOMER,
  },
  doctor: {
    email: "doctor@forma.local",
    name: "Dr. Asha Raman",
    role: Role.SELLER,
    storeRole: StoreMemberRole.DOCTOR,
  },
  delivery: {
    email: "delivery@forma.local",
    name: "Dev Delivery",
    role: Role.DELIVERY,
  },
} as const

function unsplash(id: string, w = 900) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`
}

const CATEGORIES = [
  {
    name: "Dogs",
    slug: "dogs",
    image: unsplash("1552053831-71594a27632d", 400),
  },
  {
    name: "Cats",
    slug: "cats",
    image: unsplash("1514888286974-6c03e2ca1dba", 400),
  },
  {
    name: "Toys & Play",
    slug: "toys",
    image: unsplash("1587300003388-59208cc962cb", 400),
  },
  {
    name: "Food & Treats",
    slug: "food",
    image: unsplash("1568640347023-a616a30bc3bd", 400),
  },
  {
    name: "Beds & Comfort",
    slug: "beds",
    image: unsplash("1548199973-03cce0bbc87b", 400),
  },
  {
    name: "Grooming",
    slug: "grooming",
    image: unsplash("1544568100-847a948585b9", 400),
  },
  {
    name: "Health & Care",
    slug: "health",
    image: unsplash("1583511655857-d19b40a7a54e", 400),
  },
  {
    name: "Small Pets",
    slug: "small-pets",
    image: unsplash("1425082661705-1834bfd09d43", 400),
  },
] as const

interface SeedProduct {
  title: string
  description: string
  brand?: string
  animals?: string[]
  tags?: string[]
  price: number
  compareAtPrice?: number
  stock: number
  categorySlug: (typeof CATEGORIES)[number]["slug"]
  /** Extra category slugs when a product belongs in more than one aisle. */
  extraCategorySlugs?: (typeof CATEGORIES)[number]["slug"][]
  image: string
}

const ANIMAL_BY_CATEGORY: Record<
  (typeof CATEGORIES)[number]["slug"],
  string
> = {
  dogs: "Dogs",
  cats: "Cats",
  toys: "Dogs",
  food: "Dogs",
  beds: "Dogs",
  grooming: "Dogs",
  health: "Dogs",
  "small-pets": "Small Pets",
}

function seedTags(title: string, extra: string[] = []): string[] {
  const fromTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 4)
  return Array.from(new Set([...extra, ...fromTitle]))
}

const PRODUCTS: SeedProduct[] = [
  // Dogs
  {
    title: "Everyday Dual-Clip Dog Leash",
    description:
      "Soft-touch woven leash with dual clips for hands-free walks and quick car buckle-ins. Reflective stitch for dusk strolls.",
    price: 28,
    compareAtPrice: 36,
    stock: 18,
    categorySlug: "dogs",
    image: unsplash("1601758228041-f3b2795255f1"),
  },
  {
    title: "Trail-Ready Harness",
    description:
      "Padded no-pull harness with four adjustment points and a front clip for calmer walks. Sizes XS–XL.",
    price: 42,
    compareAtPrice: 54,
    stock: 14,
    categorySlug: "dogs",
    image: unsplash("1587300003388-59208cc962cb"),
  },
  {
    title: "Raincoat for City Dogs",
    description:
      "Lightweight waterproof shell with reflective piping and a leash portal. Packs into its own pocket.",
    price: 38,
    stock: 11,
    categorySlug: "dogs",
    image: unsplash("1548199973-03cce0bbc87b"),
  },
  {
    title: "Slow-Feed Puzzle Bowl",
    description:
      "Raised maze bowl that slows gulping and keeps mealtime engaging. Dishwasher-safe.",
    price: 22,
    compareAtPrice: 28,
    stock: 20,
    categorySlug: "dogs",
    image: unsplash("1583337130417-3346a1be7dee"),
  },

  // Cats
  {
    title: "Cloud-Soft Cat Tree",
    description:
      "Compact sisal-wrapped cat tree with two perches and a hideaway cave. Fits apartment corners.",
    price: 96,
    compareAtPrice: 120,
    stock: 7,
    categorySlug: "cats",
    image: unsplash("1574158622682-e40e69881006"),
  },
  {
    title: "Covered Litter Suite",
    description:
      "High-sided covered litter box with a charcoal filter and easy-clean tray. Soft-close lid.",
    price: 48,
    stock: 12,
    categorySlug: "cats",
    image: unsplash("1495360010541-f64992d0914b"),
  },
  {
    title: "Window Perch Hammock",
    description:
      "Sturdy suction-cup hammock for sunny window naps. Holds up to 15 kg.",
    price: 34,
    compareAtPrice: 42,
    stock: 15,
    categorySlug: "cats",
    image: unsplash("1514888286974-6c03e2ca1dba"),
  },
  {
    title: "Feather Wand Duo",
    description:
      "Two interchangeable feather wands with a teak handle — built for zoomies and gentle taps.",
    price: 16,
    stock: 24,
    categorySlug: "cats",
    image: unsplash("1573865526739-10659fec78a5"),
  },

  // Toys
  {
    title: "Squeaky Plush Forest Set",
    description:
      "Three soft forest critters with gentle squeakers. Machine-washable outer shells.",
    price: 24,
    compareAtPrice: 30,
    stock: 22,
    categorySlug: "toys",
    image: unsplash("1450778869180-41d0601e046e"),
  },
  {
    title: "Indestructible Fetch Ball",
    description:
      "Solid rubber fetch ball with a bounce that lasts through park sessions and backyard drills.",
    price: 14,
    stock: 30,
    categorySlug: "toys",
    image: unsplash("1530281700549-e82e7bf110d6"),
  },
  {
    title: "Treat-Dispensing Puzzle Cube",
    description:
      "Adjustable-difficulty puzzle that rewards curious noses with kibble or soft treats.",
    price: 26,
    compareAtPrice: 34,
    stock: 16,
    categorySlug: "toys",
    image: unsplash("1583511655857-d19b40a7a54e"),
  },
  {
    title: "Catnip Mouse Trio",
    description:
      "Organic catnip-filled mice with crinkle ears. Sold as a set of three.",
    price: 12,
    stock: 28,
    categorySlug: "toys",
    image: unsplash("1511044568932-338cba0ad803"),
  },

  // Food
  {
    title: "Grain-Free Salmon Kibble (2kg)",
    description:
      "Adult dog kibble with salmon as the first ingredient, sweet potato, and added omega oils.",
    price: 36,
    compareAtPrice: 44,
    stock: 19,
    categorySlug: "food",
    image: unsplash("1568640347023-a616a30bc3bd"),
  },
  {
    title: "Chicken & Pumpkin Wet Food (12-Pack)",
    description:
      "Pâté-style wet meals for cats — chicken, pumpkin, and taurine. Easy-peel trays.",
    price: 32,
    stock: 14,
    categorySlug: "food",
    image: unsplash("1589924690876-974c348f2473"),
  },
  {
    title: "Peanut Butter Training Treats",
    description:
      "Soft, pea-sized training treats with peanut butter and oats. Low-calorie for long sessions.",
    price: 11,
    compareAtPrice: 14,
    stock: 35,
    categorySlug: "food",
    image: unsplash("1623387642249-d8c280e4d5f1"),
  },
  {
    title: "Freeze-Dried Liver Bites",
    description:
      "Single-ingredient freeze-dried liver — high-value rewards without fillers.",
    price: 18,
    stock: 21,
    categorySlug: "food",
    image: unsplash("1601758125946-0ec788b7a8b8"),
  },

  // Beds
  {
    title: "Nest Orthopedic Dog Bed",
    description:
      "Memory-foam bolster bed with a removable, washable cover. Ideal for joint-friendly sleep.",
    price: 78,
    compareAtPrice: 98,
    stock: 9,
    categorySlug: "beds",
    image: unsplash("1544568100-847a948585b9"),
  },
  {
    title: "Donut Calming Cuddler",
    description:
      "Deep-walled donut bed that hugs anxious pets. Faux-fur lining, anti-slip base.",
    price: 54,
    stock: 13,
    categorySlug: "beds",
    image: unsplash("1583337130417-3346a1be7dee"),
  },
  {
    title: "Travel Pet Blanket",
    description:
      "Soft fleece blanket for car seats, crates, and sofa sprawls. Machine wash cold.",
    price: 22,
    compareAtPrice: 28,
    stock: 20,
    categorySlug: "beds",
    image: unsplash("1558788353-f76d92427f16"),
  },

  // Grooming
  {
    title: "Deshedding Brush Kit",
    description:
      "Undercoat rake and slicker brush pair for seasonal shedding without scratching skin.",
    price: 29,
    compareAtPrice: 36,
    stock: 17,
    categorySlug: "grooming",
    image: unsplash("1516734212186-a967f81ad0d7"),
  },
  {
    title: "Oatmeal Calm Shampoo",
    description:
      "Gentle oat-and-aloe shampoo for sensitive skin. Tear-free formula, light meadow scent.",
    price: 16,
    stock: 25,
    categorySlug: "grooming",
    image: unsplash("1583337130417-3346a1be7dee"),
  },
  {
    title: "Nail Clipper & File Set",
    description:
      "Safety-guard clippers with a matching file for tidy trims between salon visits.",
    price: 19,
    compareAtPrice: 24,
    stock: 18,
    categorySlug: "grooming",
    image: unsplash("1450778869180-41d0601e046e"),
  },

  // Health
  {
    title: "Joint Support Soft Chews",
    description:
      "Daily soft chews with glucosamine and MSM for active adult dogs. Chicken flavor.",
    price: 27,
    compareAtPrice: 34,
    stock: 16,
    categorySlug: "health",
    image: unsplash("1601758003122-53c40e686a19"),
  },
  {
    title: "Dental Care Sticks (28-Pack)",
    description:
      "Daily dental sticks that help reduce plaque while satisfying the urge to chew.",
    price: 21,
    stock: 22,
    categorySlug: "health",
    image: unsplash("1552053831-71594a27632d"),
  },

  // Small pets
  {
    title: "Willow Hideaway Hut",
    description:
      "Hand-woven willow hut for rabbits, guinea pigs, and other small explorers.",
    price: 24,
    compareAtPrice: 30,
    stock: 12,
    categorySlug: "small-pets",
    image: unsplash("1425082661705-1834bfd09d43"),
  },
  {
    title: "Tunnel Adventure Pack",
    description:
      "Collapsible fabric tunnels that link into mazes — endless enrichment for small pets.",
    price: 18,
    stock: 15,
    categorySlug: "small-pets",
    image: unsplash("1592194996308-7b43878e84a6"),
  },
]

async function upsertSeedUser(
  account: { email: string; name: string; role: Role },
  passwordHash: string
) {
  return prisma.user.upsert({
    where: { email: account.email },
    update: {
      name: account.name,
      role: account.role,
      passwordHash,
    },
    create: {
      email: account.email,
      name: account.name,
      role: account.role,
      passwordHash,
    },
  })
}

async function upsertStoreMembership(
  storeId: string,
  userId: string,
  role: StoreMemberRole
) {
  return prisma.storeMember.upsert({
    where: {
      storeId_userId: { storeId, userId },
    },
    update: { role },
    create: { storeId, userId, role },
  })
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12)

  const admin = await upsertSeedUser(SEED_ACCOUNTS.admin, passwordHash)
  const buyer = await upsertSeedUser(SEED_ACCOUNTS.buyer, passwordHash)
  const seller = await upsertSeedUser(SEED_ACCOUNTS.seller, passwordHash)
  const manager = await upsertSeedUser(SEED_ACCOUNTS.manager, passwordHash)
  const groomer = await upsertSeedUser(SEED_ACCOUNTS.groomer, passwordHash)
  const doctor = await upsertSeedUser(SEED_ACCOUNTS.doctor, passwordHash)
  const delivery = await upsertSeedUser(SEED_ACCOUNTS.delivery, passwordHash)

  for (const user of [seller, manager, groomer, doctor]) {
    await prisma.sellerSettings.upsert({
      where: { sellerId: user.id },
      update:
        user.id === seller.id
          ? { gstNumber: "29AABCU9603R1ZM" }
          : {},
      create: {
        sellerId: user.id,
        ...(user.id === seller.id ? { gstNumber: "29AABCU9603R1ZM" } : {}),
      },
    })
  }

  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  })

  // Single store today; storeId on booking entities enables multi-tenant later.
  const store = await prisma.store.upsert({
    where: { slug: "forma" },
    update: { name: "namma pets Club", ownerId: seller.id, isActive: true },
    create: {
      slug: "forma",
      name: "namma pets Club",
      ownerId: seller.id,
    },
  })

  await upsertStoreMembership(store.id, seller.id, StoreMemberRole.OWNER)
  await upsertStoreMembership(store.id, manager.id, StoreMemberRole.MANAGER)
  await upsertStoreMembership(store.id, groomer.id, StoreMemberRole.GROOMER)
  await upsertStoreMembership(store.id, doctor.id, StoreMemberRole.DOCTOR)

  await seedRosterAndServices(
    store.id,
    {
      groomerUserId: groomer.id,
      doctorUserId: doctor.id,
    },
    buyer.id
  )

  const categoryIdBySlug = new Map<string, string>()
  for (const [index, cat] of CATEGORIES.entries()) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, image: cat.image, sortOrder: index },
      create: { ...cat, sortOrder: index },
    })
    categoryIdBySlug.set(cat.slug, record.id)
  }

  // Pet Collections row: grouped by pet type, ordered for the shop front.
  const PET_COLLECTIONS = [
    {
      name: "Dogs",
      slug: "dogs",
      tag: "Tail wags",
      image: unsplash("1552053831-71594a27632d", 800),
      categorySlug: "dogs" as const,
    },
    {
      name: "Cats",
      slug: "cats",
      tag: "Purr picks",
      image: unsplash("1514888286974-6c03e2ca1dba", 800),
      categorySlug: "cats" as const,
    },
    {
      name: "Small Pets",
      slug: "small-pets",
      tag: "Tiny pals",
      image: unsplash("1425082661705-1834bfd09d43", 800),
      categorySlug: "small-pets" as const,
    },
  ]

  for (const [index, collection] of PET_COLLECTIONS.entries()) {
    await prisma.petCollection.upsert({
      where: { slug: collection.slug },
      update: {
        name: collection.name,
        tag: collection.tag,
        image: collection.image,
        sortOrder: index,
        categoryId: categoryIdBySlug.get(collection.categorySlug) ?? null,
      },
      create: {
        name: collection.name,
        slug: collection.slug,
        tag: collection.tag,
        image: collection.image,
        sortOrder: index,
        categoryId: categoryIdBySlug.get(collection.categorySlug) ?? null,
      },
    })
  }

  const seedCollectionSlugs = PET_COLLECTIONS.map((c) => c.slug)
  await prisma.petCollection.deleteMany({
    where: { slug: { notIn: seedCollectionSlugs } },
  })

  const OFFER_GROUPS = [
    {
      title: "Gentle savings",
      description: "Everyday essentials marked down just enough to notice.",
      minPercent: 10,
      maxPercent: 20,
    },
    {
      title: "Sweet spot deals",
      description: "Popular picks in the 21–25% off band — easy yeses.",
      minPercent: 21,
      maxPercent: 25,
    },
    {
      title: "Big treat energy",
      description: "Deeper cuts on gear and comfort for a little more wow.",
      minPercent: 26,
      maxPercent: 40,
    },
    {
      title: "Wow-tier markdowns",
      description: "The steepest discounts while stock lasts.",
      minPercent: 41,
      maxPercent: 70,
    },
  ]

  await prisma.offerGroup.deleteMany()
  for (const [index, group] of OFFER_GROUPS.entries()) {
    await prisma.offerGroup.create({
      data: { ...group, sortOrder: index, isActive: true },
    })
  }

  const seedTitles = PRODUCTS.map((item) => item.title)
  await prisma.product.deleteMany({
    where: {
      sellerId: seller.id,
      title: { notIn: seedTitles },
    },
  })

  const seedSlugs = CATEGORIES.map((cat) => cat.slug)
  await prisma.category.deleteMany({
    where: {
      sellerId: null,
      slug: { notIn: seedSlugs },
      products: { none: {} },
    },
  })

  let firstSeededProductId: string | null = null

  for (const item of PRODUCTS) {
    const categorySlugs = Array.from(
      new Set([item.categorySlug, ...(item.extraCategorySlugs ?? [])])
    )
    const categoryIds = categorySlugs
      .map((slug) => categoryIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id))

    const existing = await prisma.product.findFirst({
      where: { title: item.title, sellerId: seller.id },
      select: { id: true },
    })

    const animals =
      item.animals ??
      [ANIMAL_BY_CATEGORY[item.categorySlug] ?? "Dogs"].filter(Boolean)
    const brand = item.brand ?? "namma pets Club"
    const tags =
      item.tags ??
      seedTags(item.title, [
        ...animals.map((animal) => animal.toLowerCase()),
        item.categorySlug.replace(/-/g, " "),
      ])

    const data = {
      title: item.title,
      description: item.description,
      brand,
      animals,
      tags,
      price: item.price,
      compareAtPrice: item.compareAtPrice ?? null,
      // Default ~5% of price as loyalty points (editable per product later).
      loyaltyPoints: Math.max(1, Math.round(item.price * 0.05)),
      stock: item.stock,
      lowStockThreshold: 5,
      images: [item.image],
      sellerId: seller.id,
      locationName: "namma pets Club Hub",
      locationAddress: "88 Companion Lane",
      locationCity: "Portland",
      locationCountry: "United States",
      categories: {
        set: categoryIds.map((id) => ({ id })),
      },
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

  // Buyer shipping profile for the customer dashboard demo.
  await prisma.user.update({
    where: { id: buyer.id },
    data: {
      phone: "+91 98765 43210",
      addressLine1: "42 Indiranagar 12th Main",
      addressLine2: "Near Metro Station",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      country: "India",
    },
  })

  const existingPets = await prisma.customerPet.count({
    where: { ownerId: buyer.id },
  })
  if (existingPets === 0) {
    await prisma.customerPet.createMany({
      data: [
        {
          ownerId: buyer.id,
          name: "Mochi",
          species: "Dog",
          breed: "Shiba Inu",
          sex: "Female",
          dateOfBirth: new Date("2021-04-12"),
          weightKg: 9.5,
          color: "Red sesame",
          microchipId: "985112004567890",
          notes: "Anxious around vacuum cleaners. Prefers chicken treats.",
          imageUrl: unsplash("1587300003388-59208cc962cb", 600),
        },
        {
          ownerId: buyer.id,
          name: "Pepper",
          species: "Cat",
          breed: "Domestic Shorthair",
          sex: "Male",
          dateOfBirth: new Date("2023-09-01"),
          weightKg: 4.2,
          color: "Tabby",
          notes: "Indoor only. Loves laser pointers.",
          imageUrl: unsplash("1514888286974-6c03e2ca1dba", 600),
        },
      ],
    })
  }

  console.log("Seeded accounts (password = SEED_PASSWORD from .env):")
  console.log(`  ADMIN   ${SEED_ACCOUNTS.admin.email}   (${admin.name})`)
  console.log(`  BUYER   ${SEED_ACCOUNTS.buyer.email}   (${buyer.name})`)
  console.log(
    `  SELLER  ${SEED_ACCOUNTS.seller.email}  OWNER   (${seller.name})`
  )
  console.log(
    `  SELLER  ${SEED_ACCOUNTS.manager.email} MANAGER (${manager.name})`
  )
  console.log(
    `  SELLER  ${SEED_ACCOUNTS.groomer.email} GROOMER (${groomer.name})`
  )
  console.log(
    `  SELLER  ${SEED_ACCOUNTS.doctor.email}  DOCTOR  (${doctor.name})`
  )
  console.log(
    `  DELIVERY ${SEED_ACCOUNTS.delivery.email} (${delivery.name})`
  )
  console.log(`Seeded store: forma`)
  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products`)
}

const WEEKDAY_ROSTER = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", slotDurationMins: 30 },
  { dayOfWeek: 6, startTime: "10:00", endTime: "14:00", slotDurationMins: 30 },
] as const

async function upsertStaff(
  storeId: string,
  data: {
    name: string
    type: StaffType
    title: string
    bio: string
    userId?: string
  }
) {
  const existing = await prisma.staffMember.findFirst({
    where: { storeId, name: data.name, type: data.type },
  })

  const staff = existing
    ? await prisma.staffMember.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          bio: data.bio,
          isActive: true,
          ...(data.userId ? { userId: data.userId } : {}),
        },
      })
    : await prisma.staffMember.create({
        data: {
          storeId,
          type: data.type,
          name: data.name,
          title: data.title,
          bio: data.bio,
          userId: data.userId,
        },
      })

  for (const row of WEEKDAY_ROSTER) {
    await prisma.weeklyRoster.upsert({
      where: {
        staffId_dayOfWeek: {
          staffId: staff.id,
          dayOfWeek: row.dayOfWeek,
        },
      },
      update: {
        startTime: row.startTime,
        endTime: row.endTime,
        slotDurationMins: row.slotDurationMins,
      },
      create: {
        staffId: staff.id,
        ...row,
      },
    })
  }

  return staff
}

async function upsertService(
  storeId: string,
  data: {
    vertical: ServiceVertical
    name: string
    description: string
    durationMins: number
    price: number
    sortOrder: number
    compareAtPrice?: number | null
    loyaltyPoints?: number
    imageUrl?: string | null
    isCombo?: boolean
  },
  staffIds: string[],
  includedServiceIds: string[] = []
) {
  const existing = await prisma.bookableService.findFirst({
    where: {
      storeId,
      vertical: data.vertical,
      name: data.name,
    },
  })

  const payload = {
    description: data.description,
    durationMins: data.durationMins,
    price: data.price,
    sortOrder: data.sortOrder,
    compareAtPrice: data.compareAtPrice ?? null,
    // Default ~5% of price as loyalty points (editable in Services panel).
    loyaltyPoints:
      data.loyaltyPoints ?? Math.max(1, Math.round(data.price * 0.05)),
    imageUrl: data.imageUrl ?? null,
    isCombo: Boolean(data.isCombo),
    isActive: true,
  }

  const service = existing
    ? await prisma.bookableService.update({
        where: { id: existing.id },
        data: payload,
      })
    : await prisma.bookableService.create({
        data: {
          storeId,
          vertical: data.vertical,
          name: data.name,
          ...payload,
        },
      })

  await prisma.serviceComboItem.deleteMany({ where: { comboId: service.id } })
  if (payload.isCombo && includedServiceIds.length > 0) {
    await prisma.serviceComboItem.createMany({
      data: includedServiceIds.map((serviceId) => ({
        comboId: service.id,
        serviceId,
      })),
      skipDuplicates: true,
    })
  }

  for (const staffId of staffIds) {
    await prisma.staffService.upsert({
      where: {
        staffId_serviceId: { staffId, serviceId: service.id },
      },
      update: {},
      create: { staffId, serviceId: service.id },
    })
  }

  return service
}

async function seedRosterAndServices(
  storeId: string,
  links: { groomerUserId: string; doctorUserId: string },
  buyerUserId: string
) {
  const mia = await upsertStaff(storeId, {
    name: "Mia Chen",
    type: StaffType.GROOMER,
    title: "Senior Groomer",
    bio: "Gentle baths and breed-specific trims for dogs and cats.",
    userId: links.groomerUserId,
  })
  const leo = await upsertStaff(storeId, {
    name: "Leo Park",
    type: StaffType.GROOMER,
    title: "Groomer",
    bio: "Nail care, deshedding, and calm first-time grooms.",
  })
  const drAsha = await upsertStaff(storeId, {
    name: "Dr. Asha Raman",
    type: StaffType.DOCTOR,
    title: "Veterinarian",
    bio: "Wellness exams, vaccines, and everyday clinic care.",
    userId: links.doctorUserId,
  })
  const drJon = await upsertStaff(storeId, {
    name: "Dr. Jon Ellis",
    type: StaffType.DOCTOR,
    title: "Veterinarian",
    bio: "Skin, ears, and follow-up visits for small companions.",
  })

  const bath = await upsertService(
    storeId,
    {
      vertical: ServiceVertical.GROOMING,
      name: "Bath & Brush",
      description: "Full wash, towel dry, brush-out, and ear wipe.",
      durationMins: 45,
      price: 45,
      compareAtPrice: 55,
      imageUrl: unsplash("1516734212186-a967f81ad0d7", 900),
      sortOrder: 1,
    },
    [mia.id, leo.id]
  )
  await upsertService(
    storeId,
    {
      vertical: ServiceVertical.GROOMING,
      name: "Full Groom",
      description: "Bath, haircut, nail trim, and finish styling.",
      durationMins: 90,
      price: 85,
      imageUrl: unsplash("1583337130417-3346a1be7dee", 900),
      sortOrder: 2,
    },
    [mia.id]
  )
  const nails = await upsertService(
    storeId,
    {
      vertical: ServiceVertical.GROOMING,
      name: "Nail Trim",
      description: "Quick nail clip and file for dogs or cats.",
      durationMins: 20,
      price: 18,
      imageUrl: unsplash("1548199973-03cce0bbc87b", 900),
      sortOrder: 3,
    },
    [mia.id, leo.id]
  )
  await upsertService(
    storeId,
    {
      vertical: ServiceVertical.GROOMING,
      name: "Bath + Nails Combo",
      description: "Wash and brush plus nail trim in one visit — save versus booking apart.",
      durationMins: 60,
      price: 55,
      compareAtPrice: 63,
      imageUrl: unsplash("1601758228041-f3b2795255f1", 900),
      isCombo: true,
      sortOrder: 4,
    },
    [mia.id, leo.id],
    [bath.id, nails.id]
  )

  const wellness = await upsertService(
    storeId,
    {
      vertical: ServiceVertical.CLINIC,
      name: "Wellness Checkup",
      description: "General exam, weight, and care advice.",
      durationMins: 30,
      price: 55,
      compareAtPrice: 65,
      imageUrl: unsplash("1628009368231-7bb7cfcb0def", 900),
      sortOrder: 1,
    },
    [drAsha.id, drJon.id]
  )
  const vaccine = await upsertService(
    storeId,
    {
      vertical: ServiceVertical.CLINIC,
      name: "Vaccination Visit",
      description: "Vaccine administration with brief health review.",
      durationMins: 20,
      price: 40,
      compareAtPrice: 48,
      imageUrl: unsplash("1576201833098-a0c2c8e787d2", 900),
      sortOrder: 2,
    },
    [drAsha.id, drJon.id]
  )
  await upsertService(
    storeId,
    {
      vertical: ServiceVertical.CLINIC,
      name: "Follow-up Consult",
      description: "Review treatment progress and adjust care.",
      durationMins: 25,
      price: 35,
      imageUrl: unsplash("1559190394-df5a28aab0c2", 900),
      sortOrder: 3,
    },
    [drAsha.id, drJon.id]
  )
  await upsertService(
    storeId,
    {
      vertical: ServiceVertical.CLINIC,
      name: "Wellness + Vaccine Combo",
      description:
        "Full wellness exam plus vaccination in one visit — save versus booking apart.",
      durationMins: 45,
      price: 85,
      compareAtPrice: 95,
      imageUrl: unsplash("1450778869180-41d0601e046e", 900),
      isCombo: true,
      sortOrder: 4,
    },
    [drAsha.id, drJon.id],
    [wellness.id, vaccine.id]
  )

  await upsertTimeFrame(
    storeId,
    {
      vertical: ServiceVertical.GROOMING,
      name: "Morning",
      startTime: "09:00",
      endTime: "12:00",
      slotDurationMins: 30,
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      sortOrder: 1,
    },
    [mia.id, leo.id]
  )
  await upsertTimeFrame(
    storeId,
    {
      vertical: ServiceVertical.GROOMING,
      name: "Afternoon",
      startTime: "13:00",
      endTime: "17:00",
      slotDurationMins: 30,
      daysOfWeek: [1, 2, 3, 4, 5],
      sortOrder: 2,
    },
    [mia.id, leo.id]
  )
  // Drop legacy clinic frame labels if present (renamed to match grooming).
  await prisma.serviceTimeFrame.deleteMany({
    where: {
      storeId,
      vertical: ServiceVertical.CLINIC,
      name: { in: ["Clinic morning", "Clinic afternoon"] },
    },
  })

  await upsertTimeFrame(
    storeId,
    {
      vertical: ServiceVertical.CLINIC,
      name: "Morning",
      startTime: "10:00",
      endTime: "13:00",
      slotDurationMins: 20,
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      sortOrder: 1,
    },
    [drAsha.id, drJon.id]
  )
  await upsertTimeFrame(
    storeId,
    {
      vertical: ServiceVertical.CLINIC,
      name: "Afternoon",
      startTime: "14:00",
      endTime: "18:00",
      slotDurationMins: 20,
      daysOfWeek: [1, 2, 3, 4, 5],
      sortOrder: 2,
    },
    [drAsha.id, drJon.id]
  )

  await seedDemoGroomerBookings(storeId, buyerUserId, mia.id, bath.id, nails.id)
  await seedDemoDoctorBookings(
    storeId,
    buyerUserId,
    drAsha.id,
    wellness.id,
    vaccine.id
  )
}

/** Demo appointments so the groomer portal has a populated day board. */
async function seedDemoGroomerBookings(
  storeId: string,
  buyerUserId: string,
  staffId: string,
  bathServiceId: string,
  nailsServiceId: string
) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const todayKey = `${y}-${m}-${d}`
  const dayStart = new Date(`${todayKey}T00:00:00.000Z`)
  const dayEnd = new Date(`${todayKey}T23:59:59.999Z`)

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12)
  const alex = await prisma.user.upsert({
    where: { email: "alex@forma.local" },
    update: { name: "Alex Rivera", role: Role.BUYER },
    create: {
      email: "alex@forma.local",
      name: "Alex Rivera",
      role: Role.BUYER,
      passwordHash,
    },
  })
  const priya = await prisma.user.upsert({
    where: { email: "priya@forma.local" },
    update: { name: "Priya Shah", role: Role.BUYER },
    create: {
      email: "priya@forma.local",
      name: "Priya Shah",
      role: Role.BUYER,
      passwordHash,
    },
  })

  await prisma.booking.deleteMany({
    where: {
      storeId,
      staffId,
      startAt: { gte: dayStart, lt: dayEnd },
      customerId: { in: [buyerUserId, alex.id, priya.id] },
    },
  })

  const demos = [
    {
      customerId: buyerUserId,
      serviceId: bathServiceId,
      startAt: new Date(`${todayKey}T10:00:00.000Z`),
      endAt: new Date(`${todayKey}T10:45:00.000Z`),
      status: BookingStatus.CONFIRMED,
      notes: "First visit — calm intro bath.",
    },
    {
      customerId: alex.id,
      serviceId: nailsServiceId,
      startAt: new Date(`${todayKey}T11:30:00.000Z`),
      endAt: new Date(`${todayKey}T11:50:00.000Z`),
      status: BookingStatus.PENDING,
      notes: null as string | null,
    },
    {
      customerId: priya.id,
      serviceId: bathServiceId,
      startAt: new Date(`${todayKey}T14:00:00.000Z`),
      endAt: new Date(`${todayKey}T14:45:00.000Z`),
      status: BookingStatus.CONFIRMED,
      notes: "Deshedding brush-out requested.",
    },
  ]

  for (const demo of demos) {
    await prisma.booking.create({
      data: {
        storeId,
        customerId: demo.customerId,
        staffId,
        serviceId: demo.serviceId,
        startAt: demo.startAt,
        endAt: demo.endAt,
        status: demo.status,
        notes: demo.notes,
      },
    })
  }
}

/** Demo appointments so the doctor portal has a populated day board. */
async function seedDemoDoctorBookings(
  storeId: string,
  buyerUserId: string,
  staffId: string,
  wellnessServiceId: string,
  vaccineServiceId: string
) {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const todayKey = `${y}-${m}-${d}`
  const dayStart = new Date(`${todayKey}T00:00:00.000Z`)
  const dayEnd = new Date(`${todayKey}T23:59:59.999Z`)

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12)
  const alex = await prisma.user.upsert({
    where: { email: "alex@forma.local" },
    update: { name: "Alex Rivera", role: Role.BUYER },
    create: {
      email: "alex@forma.local",
      name: "Alex Rivera",
      role: Role.BUYER,
      passwordHash,
    },
  })
  const priya = await prisma.user.upsert({
    where: { email: "priya@forma.local" },
    update: { name: "Priya Shah", role: Role.BUYER },
    create: {
      email: "priya@forma.local",
      name: "Priya Shah",
      role: Role.BUYER,
      passwordHash,
    },
  })

  await prisma.booking.deleteMany({
    where: {
      storeId,
      staffId,
      startAt: { gte: dayStart, lt: dayEnd },
      customerId: { in: [buyerUserId, alex.id, priya.id] },
    },
  })

  const demos = [
    {
      customerId: buyerUserId,
      serviceId: wellnessServiceId,
      startAt: new Date(`${todayKey}T10:20:00.000Z`),
      endAt: new Date(`${todayKey}T10:50:00.000Z`),
      status: BookingStatus.CONFIRMED,
      notes: "Annual wellness — bring vaccine card.",
    },
    {
      customerId: alex.id,
      serviceId: vaccineServiceId,
      startAt: new Date(`${todayKey}T11:40:00.000Z`),
      endAt: new Date(`${todayKey}T12:00:00.000Z`),
      status: BookingStatus.PENDING,
      notes: null as string | null,
    },
    {
      customerId: priya.id,
      serviceId: wellnessServiceId,
      startAt: new Date(`${todayKey}T14:20:00.000Z`),
      endAt: new Date(`${todayKey}T14:50:00.000Z`),
      status: BookingStatus.CONFIRMED,
      notes: "Follow-up on ear irritation.",
    },
  ]

  for (const demo of demos) {
    await prisma.booking.create({
      data: {
        storeId,
        customerId: demo.customerId,
        staffId,
        serviceId: demo.serviceId,
        startAt: demo.startAt,
        endAt: demo.endAt,
        status: demo.status,
        notes: demo.notes,
      },
    })
  }
}

async function upsertTimeFrame(
  storeId: string,
  data: {
    vertical: ServiceVertical
    name: string
    startTime: string
    endTime: string
    slotDurationMins: number
    daysOfWeek: number[]
    sortOrder: number
  },
  staffIds: string[]
) {
  const existing = await prisma.serviceTimeFrame.findFirst({
    where: {
      storeId,
      vertical: data.vertical,
      name: data.name,
    },
  })

  const frame = existing
    ? await prisma.serviceTimeFrame.update({
        where: { id: existing.id },
        data: {
          startTime: data.startTime,
          endTime: data.endTime,
          slotDurationMins: data.slotDurationMins,
          daysOfWeek: data.daysOfWeek,
          sortOrder: data.sortOrder,
          isActive: true,
        },
      })
    : await prisma.serviceTimeFrame.create({
        data: {
          storeId,
          ...data,
          isActive: true,
        },
      })

  await prisma.timeFrameStaff.deleteMany({ where: { timeFrameId: frame.id } })
  if (staffIds.length > 0) {
    await prisma.timeFrameStaff.createMany({
      data: staffIds.map((staffId) => ({
        timeFrameId: frame.id,
        staffId,
      })),
      skipDuplicates: true,
    })
  }

  return frame
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

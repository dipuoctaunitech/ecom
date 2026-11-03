"use server"

import { revalidatePath } from "next/cache"
import { requireUserSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import { lineSavings, toAmount } from "@/lib/money"
import { assertValidGstNumber } from "@/lib/validation"
import type { BookingStatus, OrderStatus } from "@prisma/client"

const PROFILE_FIELD_MAX = 120
const PET_NAME_MAX = 80
const PET_SPECIES_MAX = 60
const PET_BREED_MAX = 80
const PET_NOTES_MAX = 1000
const PET_IMAGE_URL_MAX = 500

export type CustomerProfile = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  vetContact: string | null
  gstNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export type CustomerPet = {
  id: string
  name: string
  species: string
  breed: string | null
  sex: string | null
  dateOfBirth: string | null
  weightKg: number | null
  color: string | null
  microchipId: string | null
  vaccinatedAt: string | null
  dewormedAt: string | null
  diagnosis: string | null
  bbmpLicense: string | null
  insurancePolicy: string | null
  notes: string | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerBooking = {
  id: string
  status: BookingStatus
  startAt: string
  endAt: string
  notes: string | null
  serviceName: string
  serviceVertical: string
  servicePrice: number
  serviceLoyaltyPoints: number
  staffName: string
  staffTitle: string | null
  storeName: string
}

export type CustomerOrderSummary = {
  orderCount: number
  totalSpent: number
  lastOrderAt: string | null
  statusCounts: Partial<Record<OrderStatus, number>>
}

/** Points earned from product orders + service bookings (lifetime acquired). */
export type CustomerLoyaltySummary = {
  totalPoints: number
  fromOrders: number
  fromBookings: number
}

/** Lifetime discount savings vs compare-at prices. */
export type CustomerSavingsSummary = {
  totalSaved: number
  fromOrders: number
  fromBookings: number
}

export type CustomerDashboardData = {
  profile: CustomerProfile
  pets: CustomerPet[]
  orderSummary: CustomerOrderSummary
  loyalty: CustomerLoyaltySummary
  savings: CustomerSavingsSummary
  bookings: CustomerBooking[]
  nextBooking: CustomerBooking | null
}

const ORDER_STATUSES_EARNING_POINTS: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
]

const BOOKING_STATUSES_EARNING_POINTS: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
]

function optionalTrim(
  value: string | null | undefined,
  max: number,
  label: string
): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > max) {
    throw new Error(`${label} must be ${max} characters or less.`)
  }
  return trimmed
}

function assertRequired(
  value: string | null | undefined,
  max: number,
  label: string
): string {
  const trimmed = optionalTrim(value, max, label)
  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }
  return trimmed
}

function parseOptionalDate(
  value: string | null | undefined,
  label = "Date",
  { allowFuture = false }: { allowFuture?: boolean } = {}
): Date | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${label} must be YYYY-MM-DD.`)
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label.toLowerCase()}.`)
  }
  if (!allowFuture && date.getTime() > Date.now()) {
    throw new Error(`${label} cannot be in the future.`)
  }
  return date
}

function toDateString(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

function parseOptionalWeight(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error("Weight must be a positive number.")
  }
  if (num > 500) {
    throw new Error("Weight looks too high.")
  }
  return Math.round(num * 100) / 100
}

function mapPet(pet: {
  id: string
  name: string
  species: string
  breed: string | null
  sex: string | null
  dateOfBirth: Date | null
  weightKg: { toString(): string } | null
  color: string | null
  microchipId: string | null
  vaccinatedAt: Date | null
  dewormedAt: Date | null
  diagnosis: string | null
  bbmpLicense: string | null
  insurancePolicy: string | null
  notes: string | null
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}): CustomerPet {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    dateOfBirth: toDateString(pet.dateOfBirth),
    weightKg: pet.weightKg != null ? toAmount(pet.weightKg) : null,
    color: pet.color,
    microchipId: pet.microchipId,
    vaccinatedAt: toDateString(pet.vaccinatedAt),
    dewormedAt: toDateString(pet.dewormedAt),
    diagnosis: pet.diagnosis,
    bbmpLicense: pet.bbmpLicense,
    insurancePolicy: pet.insurancePolicy,
    notes: pet.notes,
    imageUrl: pet.imageUrl,
    createdAt: pet.createdAt.toISOString(),
    updatedAt: pet.updatedAt.toISOString(),
  }
}

function mapBooking(booking: {
  id: string
  status: BookingStatus
  startAt: Date
  endAt: Date
  notes: string | null
  service: {
    name: string
    vertical: string
    price: { toString(): string }
    compareAtPrice: { toString(): string } | null
    loyaltyPoints: number
  }
  staff: { name: string; title: string | null }
  store: { name: string }
}): CustomerBooking {
  return {
    id: booking.id,
    status: booking.status,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    notes: booking.notes,
    serviceName: booking.service.name,
    serviceVertical: booking.service.vertical,
    servicePrice: toAmount(booking.service.price),
    serviceLoyaltyPoints: booking.service.loyaltyPoints ?? 0,
    staffName: booking.staff.name,
    staffTitle: booking.staff.title,
    storeName: booking.store.name,
  }
}

function bookingLineSavings(booking: {
  status: BookingStatus
  service: {
    price: { toString(): string }
    compareAtPrice: { toString(): string } | null
  }
}): number {
  if (!BOOKING_STATUSES_EARNING_POINTS.includes(booking.status)) return 0
  return lineSavings(
    toAmount(booking.service.price),
    booking.service.compareAtPrice == null
      ? null
      : toAmount(booking.service.compareAtPrice),
    1
  )
}

async function requireAccountUser() {
  const session = await requireUserSession()
  if (!session?.user?.id) {
    throw new Error("Sign in to view your account.")
  }
  return session
}

export async function getCustomerDashboard(): Promise<CustomerDashboardData> {
  const session = await requireAccountUser()
  const userId = session.user.id

  const [user, pets, orders, bookings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        vetContact: true,
        gstNumber: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
      },
    }),
    prisma.customerPet.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: { buyerId: userId },
      select: {
        totalAmount: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            priceAtPurchase: true,
            product: {
              select: { loyaltyPoints: true, compareAtPrice: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { customerId: userId },
      orderBy: { startAt: "desc" },
      include: {
        service: {
          select: {
            name: true,
            vertical: true,
            price: true,
            compareAtPrice: true,
            loyaltyPoints: true,
          },
        },
        staff: { select: { name: true, title: true } },
        store: { select: { name: true } },
      },
    }),
  ])

  const statusCounts: Partial<Record<OrderStatus, number>> = {}
  let totalSpent = 0
  let loyaltyFromOrders = 0
  let savingsFromOrders = 0
  for (const order of orders) {
    totalSpent += toAmount(order.totalAmount)
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1
    if (ORDER_STATUSES_EARNING_POINTS.includes(order.status)) {
      for (const item of order.items) {
        loyaltyFromOrders += (item.product.loyaltyPoints ?? 0) * item.quantity
        const paid = toAmount(item.priceAtPurchase)
        const compareAt =
          item.product.compareAtPrice == null
            ? null
            : toAmount(item.product.compareAtPrice)
        // Prefer list price vs what they paid; fall back to current compare-at.
        savingsFromOrders += lineSavings(paid, compareAt, item.quantity)
      }
    }
  }

  const mappedBookings = bookings.map(mapBooking)
  let loyaltyFromBookings = 0
  let savingsFromBookings = 0
  for (const booking of bookings) {
    if (BOOKING_STATUSES_EARNING_POINTS.includes(booking.status)) {
      loyaltyFromBookings += booking.service.loyaltyPoints ?? 0
    }
    savingsFromBookings += bookingLineSavings(booking)
  }

  const now = Date.now()
  const nextBooking =
    mappedBookings
      .filter(
        (b) =>
          new Date(b.startAt).getTime() >= now &&
          (b.status === "PENDING" || b.status === "CONFIRMED")
      )
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      )[0] ?? null

  return {
    profile: user,
    pets: pets.map(mapPet),
    orderSummary: {
      orderCount: orders.length,
      totalSpent,
      lastOrderAt: orders[0]?.createdAt.toISOString() ?? null,
      statusCounts,
    },
    loyalty: {
      totalPoints: loyaltyFromOrders + loyaltyFromBookings,
      fromOrders: loyaltyFromOrders,
      fromBookings: loyaltyFromBookings,
    },
    savings: {
      totalSaved: Math.round((savingsFromOrders + savingsFromBookings) * 100) / 100,
      fromOrders: Math.round(savingsFromOrders * 100) / 100,
      fromBookings: Math.round(savingsFromBookings * 100) / 100,
    },
    bookings: mappedBookings,
    nextBooking,
  }
}

export async function updateCustomerProfile(input: {
  name: string
  phone?: string | null
  vetContact?: string | null
  gstNumber?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}): Promise<CustomerProfile> {
  const session = await requireAccountUser()

  const name = assertRequired(input.name, PROFILE_FIELD_MAX, "Name")
  const phone = optionalTrim(input.phone, 40, "Phone")
  const vetContact = optionalTrim(input.vetContact, 120, "Vet contact")
  const gstNumber = assertValidGstNumber(input.gstNumber, {
    required: false,
    label: "GST number",
  })
  const addressLine1 = optionalTrim(input.addressLine1, PROFILE_FIELD_MAX, "Address")
  const addressLine2 = optionalTrim(
    input.addressLine2,
    PROFILE_FIELD_MAX,
    "Address line 2"
  )
  const city = optionalTrim(input.city, PROFILE_FIELD_MAX, "City")
  const state = optionalTrim(input.state, PROFILE_FIELD_MAX, "State")
  const postalCode = optionalTrim(input.postalCode, 20, "Postal code")
  const country = optionalTrim(input.country, PROFILE_FIELD_MAX, "Country")

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone,
      vetContact,
      gstNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      vetContact: true,
      gstNumber: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
    },
  })

  revalidatePath("/account")
  return updated
}

/** Update only the optional buyer GSTIN (used from checkout). */
export async function updateCustomerGstNumber(
  gstNumber: string | null | undefined
): Promise<{ gstNumber: string | null }> {
  const session = await requireAccountUser()
  const normalized = assertValidGstNumber(gstNumber, {
    required: false,
    label: "GST number",
  })

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { gstNumber: normalized },
    select: { gstNumber: true },
  })

  revalidatePath("/account")
  revalidatePath("/checkout")
  return updated
}

export type CustomerPetInput = {
  name: string
  species: string
  breed?: string | null
  sex?: string | null
  dateOfBirth?: string | null
  weightKg?: number | string | null
  color?: string | null
  microchipId?: string | null
  vaccinatedAt?: string | null
  dewormedAt?: string | null
  diagnosis?: string | null
  bbmpLicense?: string | null
  insurancePolicy?: string | null
  notes?: string | null
  imageUrl?: string | null
}

function normalizePetInput(input: CustomerPetInput) {
  return {
    name: assertRequired(input.name, PET_NAME_MAX, "Pet name"),
    species: assertRequired(input.species, PET_SPECIES_MAX, "Species"),
    breed: optionalTrim(input.breed, PET_BREED_MAX, "Breed"),
    sex: optionalTrim(input.sex, 20, "Sex"),
    dateOfBirth: parseOptionalDate(input.dateOfBirth, "Date of birth"),
    weightKg: parseOptionalWeight(input.weightKg),
    color: optionalTrim(input.color, 60, "Color"),
    microchipId: optionalTrim(input.microchipId, 64, "Microchip ID"),
    vaccinatedAt: parseOptionalDate(input.vaccinatedAt, "Vaccination date", {
      allowFuture: true,
    }),
    dewormedAt: parseOptionalDate(input.dewormedAt, "Deworm date", {
      allowFuture: true,
    }),
    diagnosis: optionalTrim(input.diagnosis, PET_NOTES_MAX, "Diagnosis"),
    bbmpLicense: optionalTrim(input.bbmpLicense, 80, "BBMP license"),
    insurancePolicy: optionalTrim(
      input.insurancePolicy,
      80,
      "Insurance policy"
    ),
    notes: optionalTrim(input.notes, PET_NOTES_MAX, "Notes"),
    imageUrl: optionalTrim(input.imageUrl, PET_IMAGE_URL_MAX, "Image URL"),
  }
}

export async function createCustomerPet(
  input: CustomerPetInput
): Promise<CustomerPet> {
  const session = await requireAccountUser()
  const data = normalizePetInput(input)

  const pet = await prisma.customerPet.create({
    data: {
      ownerId: session.user.id,
      ...data,
    },
  })

  revalidatePath("/account")
  return mapPet(pet)
}

export async function updateCustomerPet(
  petId: string,
  input: CustomerPetInput
): Promise<CustomerPet> {
  const session = await requireAccountUser()
  if (!petId?.trim()) {
    throw new Error("Pet not found.")
  }

  const existing = await prisma.customerPet.findFirst({
    where: { id: petId, ownerId: session.user.id },
    select: { id: true },
  })
  if (!existing) {
    throw new Error("Pet not found.")
  }

  const data = normalizePetInput(input)
  const pet = await prisma.customerPet.update({
    where: { id: petId },
    data,
  })

  revalidatePath("/account")
  return mapPet(pet)
}

export async function deleteCustomerPet(petId: string): Promise<{ success: true }> {
  const session = await requireAccountUser()
  if (!petId?.trim()) {
    throw new Error("Pet not found.")
  }

  const existing = await prisma.customerPet.findFirst({
    where: { id: petId, ownerId: session.user.id },
    select: { id: true },
  })
  if (!existing) {
    throw new Error("Pet not found.")
  }

  await prisma.customerPet.delete({ where: { id: petId } })
  revalidatePath("/account")
  return { success: true }
}

export async function getCustomerBookings(): Promise<CustomerBooking[]> {
  const session = await requireAccountUser()

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    orderBy: { startAt: "desc" },
    include: {
      service: {
        select: {
          name: true,
          vertical: true,
          price: true,
          compareAtPrice: true,
          loyaltyPoints: true,
        },
      },
      staff: { select: { name: true, title: true } },
      store: { select: { name: true } },
    },
  })

  return bookings.map(mapBooking)
}

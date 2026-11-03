"use server"

import bcrypt from "bcryptjs"
import { headers } from "next/headers"
import { productImageApiPath } from "@/lib/images"
import {
  isAllowedQrContentType,
  MAX_UPLOAD_BYTES,
  sanitizeUploadFilename,
} from "@/lib/auth-guards"
import { getClientIp } from "@/lib/client-ip"
import { putStoredObject } from "@/lib/object-store"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { assertValidGstNumber, assertValidPassword } from "@/lib/validation"

const PROFILE_FIELD_MAX = 120
const PET_NAME_MAX = 80
const PET_BREED_MAX = 80
const PET_NOTES_MAX = 1000
const REGISTER_RATE_LIMIT = 8
const REGISTER_WINDOW_MS = 60_000

export type RegisterCustomerResult =
  | { success: true; email: string }
  | { success: false; error: string }

function optionalTrim(
  value: FormDataEntryValue | null | undefined,
  max: number,
  label: string
): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (trimmed.length > max) {
    throw new Error(`${label} must be ${max} characters or less.`)
  }
  return trimmed
}

function assertRequired(
  value: FormDataEntryValue | null | undefined,
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
  value: FormDataEntryValue | null | undefined,
  label: string,
  { allowFuture = false }: { allowFuture?: boolean } = {}
): Date | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${label} must be a valid date.`)
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

function normalizeSpecies(value: FormDataEntryValue | null | undefined): string {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
  if (raw === "dog") return "Dog"
  if (raw === "cat") return "Cat"
  throw new Error("Pet type must be Dog or Cat.")
}

function normalizeSex(value: FormDataEntryValue | null | undefined): string | null {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
  if (!raw) return null
  if (raw === "male") return "Male"
  if (raw === "female") return "Female"
  throw new Error("Gender must be Male or Female.")
}

async function storePetImage(
  file: File,
  ownerId: string
): Promise<string | null> {
  if (!(file instanceof File) || file.size <= 0) return null

  const contentType = (file.type || "").split(";")[0]?.trim().toLowerCase() ?? ""
  if (!isAllowedQrContentType(contentType)) {
    throw new Error("Pet image must be a JPEG, PNG, WebP, or GIF.")
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Pet image must be ${MAX_UPLOAD_BYTES} bytes or less.`)
  }

  const safeFilename = sanitizeUploadFilename(file.name || "pet.jpg")
  const key = `pets/${ownerId}/${Date.now()}-${safeFilename}`
  const body = Buffer.from(await file.arrayBuffer())
  await putStoredObject(key, body, contentType)
  return productImageApiPath(key)
}

export async function registerCustomer(
  formData: FormData
): Promise<RegisterCustomerResult> {
  try {
    const headerStore = await headers()
    const clientIp = getClientIp(
      new Request("http://localhost", { headers: headerStore })
    )
    const { allowed } = rateLimit(
      `register:${clientIp === "unknown" ? "global" : clientIp}`,
      REGISTER_RATE_LIMIT,
      REGISTER_WINDOW_MS
    )
    if (!allowed) {
      return {
        success: false,
        error: "Too many signup attempts. Try again in a minute.",
      }
    }

    const parentName = assertRequired(formData.get("parentName"), PROFILE_FIELD_MAX, "Name")
    const emailRaw = assertRequired(formData.get("email"), 254, "Email").toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      throw new Error("Enter a valid email address.")
    }
    const mobile = assertRequired(formData.get("mobile"), 40, "Mobile number")
    const vetContact = optionalTrim(formData.get("vetContact"), 120, "Vet contact")
    const gstNumber = assertValidGstNumber(formData.get("gstNumber")?.toString(), {
      required: false,
      label: "GST number",
    })
    const address = assertRequired(formData.get("address"), 500, "Address")
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")
    assertValidPassword(password)
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.")
    }

    const petName = assertRequired(formData.get("petName"), PET_NAME_MAX, "Pet name")
    const species = normalizeSpecies(formData.get("petType"))
    const sex = normalizeSex(formData.get("gender"))
    const breed = optionalTrim(formData.get("breed"), PET_BREED_MAX, "Breed")
    const color = optionalTrim(formData.get("colour"), 60, "Colour")
    const dateOfBirth = parseOptionalDate(formData.get("birthDate"), "Birth date")
    const vaccinatedAt = parseOptionalDate(
      formData.get("vaccinationDate"),
      "Vaccination date",
      { allowFuture: true }
    )
    const dewormedAt = parseOptionalDate(
      formData.get("dewormDate"),
      "Deworm date",
      { allowFuture: true }
    )
    const diagnosis = optionalTrim(formData.get("diagnosis"), PET_NOTES_MAX, "Diagnosis")
    const bbmpLicense = optionalTrim(
      formData.get("bbmpLicense"),
      80,
      "BBMP license number"
    )
    const insurancePolicy = optionalTrim(
      formData.get("insurancePolicy"),
      80,
      "Insurance policy number"
    )

    const existing = await prisma.user.findUnique({
      where: { email: emailRaw },
      select: { id: true },
    })
    if (existing) {
      return {
        success: false,
        error: "An account with this email already exists. Sign in instead.",
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const imageFile = formData.get("petImage")

    const user = await prisma.user.create({
      data: {
        name: parentName,
        email: emailRaw,
        passwordHash,
        role: "BUYER",
        phone: mobile,
        vetContact,
        gstNumber,
        addressLine1: address,
        country: "India",
      },
      select: { id: true, email: true },
    })

    let imageUrl: string | null = null
    try {
      if (imageFile instanceof File && imageFile.size > 0) {
        imageUrl = await storePetImage(imageFile, user.id)
      }
    } catch (uploadError) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
      throw uploadError
    }

    await prisma.customerPet.create({
      data: {
        ownerId: user.id,
        name: petName,
        species,
        breed,
        sex,
        dateOfBirth,
        color,
        vaccinatedAt,
        dewormedAt,
        diagnosis,
        bbmpLicense,
        insurancePolicy,
        imageUrl,
      },
    })

    return { success: true, email: user.email ?? emailRaw }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create your account. Please try again.",
    }
  }
}

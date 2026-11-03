"use client"

import { FormEvent, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Cat, Dog, ImageIcon } from "lucide-react"
import { registerCustomer } from "@/app/actions/register"
import { BrandLogo } from "@/components/BrandLogo"
import { breedsForSpecies } from "@/lib/pet-breeds"
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand"

type PetType = "Dog" | "Cat"
type Gender = "Male" | "Female" | ""

type FormState = {
  petName: string
  birthDate: string
  petType: PetType
  gender: Gender
  breed: string
  colour: string
  vaccinationDate: string
  dewormDate: string
  diagnosis: string
  bbmpLicense: string
  insurancePolicy: string
  parentName: string
  mobile: string
  email: string
  vetContact: string
  gstNumber: string
  address: string
  password: string
  confirmPassword: string
}

const emptyForm: FormState = {
  petName: "",
  birthDate: "",
  petType: "Dog",
  gender: "",
  breed: "",
  colour: "",
  vaccinationDate: "",
  dewormDate: "",
  diagnosis: "",
  bbmpLicense: "",
  insurancePolicy: "",
  parentName: "",
  mobile: "",
  email: "",
  vetContact: "",
  gstNumber: "",
  address: "",
  password: "",
  confirmPassword: "",
}

const fieldClass =
  "w-full rounded-lg border border-[#c5d0e0] bg-white px-3 py-2.5 text-sm text-[#1e2a44] outline-none placeholder:text-[#9aa6bc] focus:border-[#3d4f7a] focus:ring-1 focus:ring-[#3d4f7a]/30"

const labelClass = "mb-1.5 block text-sm font-medium text-[#2c3a5a]"

function formatPreviewDate(value: string) {
  if (!value) return "—"
  const [y, m, d] = value.split("-")
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-[#e8edf5] py-2.5 last:border-0">
      <dt className="w-36 shrink-0 text-sm font-medium text-[#3d4f7a]">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm text-[#1e2a44]">
        {value.trim() ? value : "—"}
      </dd>
    </div>
  )
}

export default function CustomerSignupForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const breeds = useMemo(
    () => breedsForSpecies(form.petType),
    [form.petType]
  )

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === "petType") {
        const nextBreeds = breedsForSpecies(value as PetType)
        if (!nextBreeds.includes(next.breed as (typeof nextBreeds)[number])) {
          next.breed = ""
        }
      }
      return next
    })
  }

  function handleImageChange(file: File | null) {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    startTransition(async () => {
      const data = new FormData()
      data.set("petName", form.petName)
      data.set("birthDate", form.birthDate)
      data.set("petType", form.petType)
      data.set("gender", form.gender)
      data.set("breed", form.breed)
      data.set("colour", form.colour)
      data.set("vaccinationDate", form.vaccinationDate)
      data.set("dewormDate", form.dewormDate)
      data.set("diagnosis", form.diagnosis)
      data.set("bbmpLicense", form.bbmpLicense)
      data.set("insurancePolicy", form.insurancePolicy)
      data.set("parentName", form.parentName)
      data.set("mobile", form.mobile)
      data.set("email", form.email)
      data.set("vetContact", form.vetContact)
      data.set("gstNumber", form.gstNumber)
      data.set("address", form.address)
      data.set("password", form.password)
      data.set("confirmPassword", form.confirmPassword)
      if (imageFile) {
        data.set("petImage", imageFile)
      }

      const result = await registerCustomer(data)
      if (!result.success) {
        setError(result.error)
        return
      }

      const signInResult = await signIn("credentials", {
        email: result.email,
        password: form.password,
        redirect: false,
      })

      if (signInResult?.error || !signInResult?.ok) {
        setError(
          "Account created, but sign-in failed. Please sign in with your new email."
        )
        router.push("/")
        return
      }

      router.push("/account?tab=pets")
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BrandLogo size="md" />
          <p className="mt-2 text-sm font-medium text-[#5a6b8a]">
            {BRAND_TAGLINE} — create your pet parent account
          </p>
        </div>
        <p className="text-sm text-[#5a6b8a]">
          Already registered?{" "}
          <Link href="/" className="font-semibold text-[#3d4f7a] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#d7e0ef] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 font-display text-xl font-bold text-[#243356]">
              Pet Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="petName">
                  Pet name
                </label>
                <input
                  id="petName"
                  className={fieldClass}
                  value={form.petName}
                  onChange={(e) => setField("petName", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="birthDate">
                  Birth date
                </label>
                <input
                  id="birthDate"
                  type="date"
                  className={fieldClass}
                  value={form.birthDate}
                  onChange={(e) => setField("birthDate", e.target.value)}
                />
              </div>

              <fieldset>
                <legend className={labelClass}>Pet Type</legend>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      { value: "Dog" as const, Icon: Dog },
                      { value: "Cat" as const, Icon: Cat },
                    ] as const
                  ).map(({ value, Icon }) => {
                    const selected = form.petType === value
                    return (
                      <label
                        key={value}
                        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border px-5 py-3 transition-colors ${
                          selected
                            ? "border-[#3d4f7a] bg-[#eef2fb]"
                            : "border-[#d7e0ef] bg-white hover:border-[#aebad0]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="petType"
                          value={value}
                          checked={selected}
                          onChange={() => setField("petType", value)}
                          className="sr-only"
                        />
                        <Icon
                          className={`h-10 w-10 ${
                            selected ? "text-[#3d4f7a]" : "text-[#8a97b0]"
                          }`}
                          strokeWidth={1.5}
                        />
                        <span className="text-xs font-semibold text-[#3d4f7a]">
                          {value}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className={labelClass}>Gender</legend>
                <div className="flex flex-wrap gap-5">
                  {(["Male", "Female"] as const).map((value) => (
                    <label
                      key={value}
                      className="inline-flex items-center gap-2 text-sm text-[#2c3a5a]"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={value}
                        checked={form.gender === value}
                        onChange={() => setField("gender", value)}
                        className="h-4 w-4 accent-[#3d4f7a]"
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label className={labelClass} htmlFor="breed">
                  Select Breed
                </label>
                <select
                  id="breed"
                  className={fieldClass}
                  value={form.breed}
                  onChange={(e) => setField("breed", e.target.value)}
                >
                  <option value="">Select breed</option>
                  {breeds.map((breed) => (
                    <option key={breed} value={breed}>
                      {breed}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="colour">
                  Colour
                </label>
                <input
                  id="colour"
                  className={fieldClass}
                  value={form.colour}
                  onChange={(e) => setField("colour", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="vaccinationDate">
                    Date of Vaccination
                  </label>
                  <input
                    id="vaccinationDate"
                    type="date"
                    className={fieldClass}
                    value={form.vaccinationDate}
                    onChange={(e) => setField("vaccinationDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="dewormDate">
                    Date of Deworm
                  </label>
                  <input
                    id="dewormDate"
                    type="date"
                    className={fieldClass}
                    value={form.dewormDate}
                    onChange={(e) => setField("dewormDate", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="diagnosis">
                  Diagnosis
                </label>
                <textarea
                  id="diagnosis"
                  rows={3}
                  className={fieldClass}
                  value={form.diagnosis}
                  onChange={(e) => setField("diagnosis", e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="petImage">
                  Image
                </label>
                <input
                  id="petImage"
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-[#5a6b8a] file:mr-3 file:rounded-lg file:border-0 file:bg-[#3d4f7a] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#2c3a5a]"
                  onChange={(e) =>
                    handleImageChange(e.target.files?.[0] ?? null)
                  }
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="bbmpLicense">
                  BBMP License Number
                </label>
                <input
                  id="bbmpLicense"
                  className={fieldClass}
                  value={form.bbmpLicense}
                  onChange={(e) => setField("bbmpLicense", e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="insurancePolicy">
                  Insurance Policy Number
                </label>
                <input
                  id="insurancePolicy"
                  className={fieldClass}
                  value={form.insurancePolicy}
                  onChange={(e) => setField("insurancePolicy", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7e0ef] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-5 font-display text-xl font-bold text-[#243356]">
              Parent&apos;s Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="parentName">
                  Name
                </label>
                <input
                  id="parentName"
                  className={fieldClass}
                  value={form.parentName}
                  onChange={(e) => setField("parentName", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="mobile">
                  Mobile number
                </label>
                <input
                  id="mobile"
                  type="tel"
                  className={fieldClass}
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={fieldClass}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="vetContact">
                  Vet Contact
                </label>
                <input
                  id="vetContact"
                  className={fieldClass}
                  value={form.vetContact}
                  onChange={(e) => setField("vetContact", e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="gstNumber">
                  GST number (optional)
                </label>
                <input
                  id="gstNumber"
                  className={`${fieldClass} font-mono uppercase tracking-wide`}
                  value={form.gstNumber}
                  onChange={(e) =>
                    setField("gstNumber", e.target.value.toUpperCase())
                  }
                  maxLength={15}
                  placeholder="29ABCDE1234F1Z5"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="address">
                  Address
                </label>
                <textarea
                  id="address"
                  rows={3}
                  className={fieldClass}
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className={fieldClass}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="confirmPassword">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className={fieldClass}
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <p className="text-xs text-[#5a6b8a]">
                Password needs at least 8 characters with uppercase, lowercase,
                and a number.
              </p>
            </div>
          </section>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#3d4f7a] text-sm font-bold text-white transition-colors hover:bg-[#2c3a5a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
          >
            {isPending ? "Creating account…" : `Join ${BRAND_NAME}`}
          </button>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-[#d7e0ef] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 font-display text-xl font-bold text-[#243356]">
              PET Preview
            </h2>
            <dl>
              <PreviewRow label="Name" value={form.petName} />
              <PreviewRow
                label="Date Of Birth"
                value={formatPreviewDate(form.birthDate)}
              />
              <PreviewRow label="Pet Type" value={form.petType} />
              <PreviewRow label="Pet Gender" value={form.gender} />
              <PreviewRow label="Pet Breed" value={form.breed} />
              <PreviewRow label="Pet Colour" value={form.colour} />
              <PreviewRow
                label="Vaccination Date"
                value={formatPreviewDate(form.vaccinationDate)}
              />
              <PreviewRow
                label="Deworm Date"
                value={formatPreviewDate(form.dewormDate)}
              />
              <PreviewRow label="Pet Diagnosis" value={form.diagnosis} />
              <div className="flex gap-3 border-b border-[#e8edf5] py-2.5 last:border-0">
                <dt className="w-36 shrink-0 text-sm font-medium text-[#3d4f7a]">
                  Pet Image
                </dt>
                <dd className="min-w-0 flex-1">
                  {imagePreview ? (
                    <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-[#d7e0ef]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Pet preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c5d0e0] bg-[#f5f7fb] text-[#9aa6bc]">
                      <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                      <span className="text-[10px] font-medium">your image</span>
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-[#d7e0ef] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 font-display text-xl font-bold text-[#243356]">
              Parent Preview
            </h2>
            <dl>
              <PreviewRow label="Name" value={form.parentName} />
              <PreviewRow label="Mobile" value={form.mobile} />
              <PreviewRow label="Email" value={form.email} />
              <PreviewRow label="Vet Contact" value={form.vetContact} />
              <PreviewRow label="GST" value={form.gstNumber} />
              <PreviewRow label="Address" value={form.address} />
            </dl>
          </section>
        </aside>
      </form>
    </div>
  )
}

"use client"

import { FormEvent, useState, useTransition } from "react"
import { BadgeIndianRupee, Sparkles } from "lucide-react"
import {
  updateCustomerProfile,
  type CustomerLoyaltySummary,
  type CustomerProfile,
  type CustomerSavingsSummary,
} from "@/app/actions/account"
import { formatINR } from "@/lib/money"

const fieldClass =
  "w-full border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink/40"

export default function BuyerProfile({
  initialProfile,
  loyalty,
  savings,
  onSaved,
}: {
  initialProfile: CustomerProfile
  loyalty: CustomerLoyaltySummary
  savings: CustomerSavingsSummary
  onSaved?: (profile: CustomerProfile) => void
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [name, setName] = useState(initialProfile.name ?? "")
  const [phone, setPhone] = useState(initialProfile.phone ?? "")
  const [vetContact, setVetContact] = useState(
    initialProfile.vetContact ?? ""
  )
  const [gstNumber, setGstNumber] = useState(initialProfile.gstNumber ?? "")
  const [addressLine1, setAddressLine1] = useState(
    initialProfile.addressLine1 ?? ""
  )
  const [addressLine2, setAddressLine2] = useState(
    initialProfile.addressLine2 ?? ""
  )
  const [city, setCity] = useState(initialProfile.city ?? "")
  const [state, setState] = useState(initialProfile.state ?? "")
  const [postalCode, setPostalCode] = useState(initialProfile.postalCode ?? "")
  const [country, setCountry] = useState(initialProfile.country ?? "")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    setError("")

    startTransition(async () => {
      try {
        const updated = await updateCustomerProfile({
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
        })
        setProfile(updated)
        onSaved?.(updated)
        setMessage("Profile saved.")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save profile.")
      }
    })
  }

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h2 className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          Profile
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted sm:mt-2">
          Contact details and shipping address used for orders and bookings.
        </p>
      </div>

      {message && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 sm:px-4">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4">
          {error}
        </p>
      )}

      <div className="mb-6 grid max-w-xl gap-3 sm:mb-8 sm:gap-4 sm:grid-cols-2">
        <div className="border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-emerald-200 bg-white">
              <BadgeIndianRupee
                className="h-4 w-4 text-emerald-700"
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-800/80 sm:text-xs">
                Total saved
              </p>
              <p className="mt-1 font-display text-xl font-medium tabular-nums text-emerald-900 sm:text-2xl">
                {formatINR(savings.totalSaved)}
              </p>
              <p className="mt-2 text-xs text-emerald-800/80">
                {formatINR(savings.fromOrders)} orders ·{" "}
                {formatINR(savings.fromBookings)} bookings
              </p>
            </div>
          </div>
        </div>

        <div className="border border-line bg-surface-elevated p-4 sm:bg-surface sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface sm:bg-surface-elevated">
              <Sparkles className="h-4 w-4 text-highlight" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Loyalty points
              </p>
              <p className="mt-1 font-display text-xl font-medium tabular-nums text-ink sm:text-2xl">
                {loyalty.totalPoints.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                {loyalty.fromOrders.toLocaleString("en-IN")} orders ·{" "}
                {loyalty.fromBookings.toLocaleString("en-IN")} bookings
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 sm:space-y-5">
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
            Email
          </span>
          <input
            type="email"
            value={profile.email ?? ""}
            disabled
            className={`${fieldClass} mt-1.5 min-h-11 opacity-70`}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            Email is tied to your sign-in and cannot be changed here.
          </span>
        </label>

        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
            Full name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            autoComplete="name"
            className={`${fieldClass} mt-1.5 min-h-11`}
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
            Phone
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            placeholder="+91 …"
            autoComplete="tel"
            className={`${fieldClass} mt-1.5 min-h-11`}
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
            Vet contact
          </span>
          <input
            type="text"
            value={vetContact}
            onChange={(e) => setVetContact(e.target.value)}
            maxLength={120}
            placeholder="Clinic or vet phone"
            className={`${fieldClass} mt-1.5 min-h-11`}
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
            GST number (optional)
          </span>
          <input
            type="text"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            maxLength={15}
            placeholder="29ABCDE1234F1Z5"
            className={`${fieldClass} mt-1.5 min-h-11 font-mono uppercase tracking-wide`}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            Shown on checkout if you need a GST invoice.
          </span>
        </label>

        <div className="space-y-3 border border-line bg-surface-elevated p-3 sm:space-y-4 sm:bg-surface sm:p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
            Shipping address
          </p>
          <label className="block">
            <span className="sr-only">Address line 1</span>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              maxLength={120}
              placeholder="Street address"
              autoComplete="address-line1"
              className={`${fieldClass} min-h-11`}
            />
          </label>
          <label className="block">
            <span className="sr-only">Address line 2</span>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              maxLength={120}
              placeholder="Apartment, suite, landmark"
              autoComplete="address-line2"
              className={`${fieldClass} min-h-11`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="sr-only">City</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={120}
                placeholder="City"
                autoComplete="address-level2"
                className={`${fieldClass} min-h-11`}
              />
            </label>
            <label className="block">
              <span className="sr-only">State</span>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                maxLength={120}
                placeholder="State"
                autoComplete="address-level1"
                className={`${fieldClass} min-h-11`}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="sr-only">Postal code</span>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                maxLength={20}
                placeholder="Postal code"
                autoComplete="postal-code"
                className={`${fieldClass} min-h-11`}
              />
            </label>
            <label className="block">
              <span className="sr-only">Country</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={120}
                placeholder="Country"
                autoComplete="country-name"
                className={`${fieldClass} min-h-11`}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 w-full items-center justify-center bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 sm:h-11 sm:w-auto"
        >
          {isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  )
}

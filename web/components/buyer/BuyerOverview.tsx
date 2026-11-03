"use client"

import Link from "next/link"
import {
  CalendarDays,
  Package,
  PawPrint,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react"
import type {
  CustomerBooking,
  CustomerLoyaltySummary,
  CustomerOrderSummary,
  CustomerPet,
  CustomerProfile,
  CustomerSavingsSummary,
} from "@/app/actions/account"
import { formatINR } from "@/lib/money"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export default function BuyerOverview({
  profile,
  pets,
  orderSummary,
  loyalty,
  savings,
  nextBooking,
  onNavigate,
}: {
  profile: CustomerProfile
  pets: CustomerPet[]
  orderSummary: CustomerOrderSummary
  loyalty: CustomerLoyaltySummary
  savings: CustomerSavingsSummary
  nextBooking: CustomerBooking | null
  onNavigate: (tab: "profile" | "pets" | "orders" | "bookings") => void
}) {
  const displayName = profile.name?.trim() || "there"
  const location = [profile.city, profile.state].filter(Boolean).join(", ")

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h2 className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          Welcome back, {displayName}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted sm:mt-2">
          Your pets, orders, and bookings in one place.
          {location ? ` · ${location}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => onNavigate("profile")}
          className="col-span-2 border border-emerald-200 bg-emerald-50 p-4 text-left transition-colors active:border-emerald-400 sm:p-5 xl:col-span-1"
        >
          <div className="flex items-center gap-2 text-emerald-800/80">
            <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] sm:text-xs">
              Total saved
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-medium tabular-nums text-emerald-900 sm:mt-3 sm:text-2xl">
            {formatINR(savings.totalSaved)}
          </p>
          <p className="mt-1 text-xs text-emerald-800/80 sm:text-sm">
            {loyalty.totalPoints.toLocaleString("en-IN")} loyalty pts earned
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("orders")}
          className="border border-line bg-surface-elevated p-4 text-left transition-colors active:border-ink/30 sm:bg-surface sm:p-5"
        >
          <div className="flex items-center gap-2 text-ink-muted">
            <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] sm:text-xs">
              Orders
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-medium tabular-nums text-ink sm:mt-3 sm:text-2xl">
            {orderSummary.orderCount}
          </p>
          <p className="mt-1 truncate text-xs text-ink-muted sm:text-sm">
            {formatINR(orderSummary.totalSpent)} spent
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("pets")}
          className="border border-line bg-surface-elevated p-4 text-left transition-colors active:border-ink/30 sm:bg-surface sm:p-5"
        >
          <div className="flex items-center gap-2 text-ink-muted">
            <PawPrint className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] sm:text-xs">
              Pets
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-medium tabular-nums text-ink sm:mt-3 sm:text-2xl">
            {pets.length}
          </p>
          <p className="mt-1 truncate text-xs text-ink-muted sm:text-sm">
            {pets.length === 0
              ? "Add your first pet"
              : pets.map((p) => p.name).join(", ")}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("bookings")}
          className="border border-line bg-surface-elevated p-4 text-left transition-colors active:border-ink/30 sm:bg-surface sm:p-5"
        >
          <div className="flex items-center gap-2 text-ink-muted">
            <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] sm:text-xs">
              Next visit
            </span>
          </div>
          {nextBooking ? (
            <>
              <p className="mt-2 line-clamp-2 font-display text-base font-medium text-ink sm:mt-3 sm:text-lg">
                {nextBooking.serviceName}
              </p>
              <p className="mt-1 text-xs text-ink-muted sm:text-sm">
                {formatDate(nextBooking.startAt)}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-base font-medium text-ink sm:mt-3 sm:text-lg">
                None scheduled
              </p>
              <p className="mt-1 text-xs text-ink-muted sm:text-sm">
                Book grooming or clinic care
              </p>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate("profile")}
          className="border border-line bg-surface-elevated p-4 text-left transition-colors active:border-ink/30 sm:bg-surface sm:p-5"
        >
          <div className="flex items-center gap-2 text-ink-muted">
            <UserRound className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] sm:text-xs">
              Profile
            </span>
          </div>
          <p className="mt-2 truncate font-display text-base font-medium text-ink sm:mt-3 sm:text-lg">
            {profile.phone || "Add phone"}
          </p>
          <p className="mt-1 truncate text-xs text-ink-muted sm:text-sm">
            {profile.addressLine1 || "Add shipping address"}
          </p>
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:mt-10 sm:gap-6 lg:grid-cols-2">
        <section className="border border-line bg-surface-elevated p-4 sm:bg-surface sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-medium text-ink sm:text-lg">
              Your pets
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("pets")}
              className="min-h-9 text-xs font-medium uppercase tracking-wide text-ink-muted hover:text-ink"
            >
              Manage
            </button>
          </div>
          {pets.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              No pets yet. Add profiles so groomers and vets know who&apos;s
              visiting.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line sm:mt-4">
              {pets.slice(0, 3).map((pet) => (
                <li key={pet.id} className="flex items-center gap-3 py-3">
                  {pet.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pet.imageUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 object-cover sm:h-12 sm:w-12"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line bg-surface sm:h-12 sm:w-12 sm:bg-surface-elevated">
                      <PawPrint
                        className="h-4 w-4 text-ink-muted"
                        strokeWidth={1.75}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {pet.name}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {[pet.species, pet.breed].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-line bg-surface-elevated p-4 sm:bg-surface sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-medium text-ink sm:text-lg">
              Shopping
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="min-h-9 text-xs font-medium uppercase tracking-wide text-ink-muted hover:text-ink"
            >
              View orders
            </button>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface sm:bg-surface-elevated">
              <Package className="h-4 w-4 text-ink" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-ink">
                {orderSummary.orderCount === 0
                  ? "You haven’t placed an order yet."
                  : `${orderSummary.orderCount} order${
                      orderSummary.orderCount === 1 ? "" : "s"
                    } · ${formatINR(orderSummary.totalSpent)} lifetime`}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <Link
                  href="/items"
                  className="inline-flex h-11 w-full items-center justify-center bg-ink px-4 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 sm:h-10 sm:w-auto"
                >
                  Shop pet items
                </Link>
                <Link
                  href="/grooming"
                  className="inline-flex h-11 w-full items-center justify-center border border-line bg-surface px-4 text-xs font-medium uppercase tracking-wide text-ink transition-colors hover:border-ink/30 sm:h-10 sm:w-auto sm:bg-surface-elevated"
                >
                  Book grooming
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

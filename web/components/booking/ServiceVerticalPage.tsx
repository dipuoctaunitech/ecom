"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import Link from "next/link"
import { BrandLogo } from "@/components/BrandLogo"
import { SiteHeader } from "@/components/SiteHeader"
import { CartSidebar } from "@/components/CartSidebar"
import { BookingFlow } from "@/components/booking/BookingFlow"
import { VideoWallpaper } from "@/components/VideoWallpaper"
import { BRAND_NAME } from "@/lib/brand"
import { formatMoney } from "@/lib/money"

export interface VerticalService {
  id: string
  name: string
  description: string
  durationMins: number
  price: number
  compareAtPrice: number | null
  loyaltyPoints: number
  imageUrl: string | null
  isCombo: boolean
  includedServiceNames: string[]
  staff: { id: string; name: string; title: string | null }[]
}

export interface VerticalStaff {
  id: string
  name: string
  title: string | null
  bio: string | null
  rosterDays: number[]
}

export interface VerticalTimeFrame {
  id: string
  name: string
  startTime: string
  endTime: string
  staffNames: string[]
  previewSlots: string[]
}

interface ServiceVerticalPageProps {
  title: string
  subtitle: string
  emptyHint: string
  services: VerticalService[]
  staff: VerticalStaff[]
  timeFrames?: VerticalTimeFrame[]
  /** Full-bleed hero photograph (fallback when heroVideo is unset). */
  heroImage?: string
  /** Full-bleed looping hero video (preferred over heroImage). */
  heroVideo?: string
  /** Optional page-wide atmospheric background (replaces flat white). */
  pageBackgroundImage?: string
  /** Optional page-wide looping video wallpaper. */
  pageBackgroundVideo?: string
  /** Opacity for page background media (0–1). Default 0.35. */
  pageBackgroundOpacity?: number
  /** Short line under the brand in the hero */
  heroSupport: string
  /** CTA label in the hero */
  ctaLabel?: string
  staffHeading: string
  staffSubtitle: string
  personLabel?: string
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function friendlyDays(days: number[]): string {
  if (days.length === 0) return "Ask us about availability"
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length >= 5) {
    const first = DAY_LABELS[sorted[0]]
    const last = DAY_LABELS[sorted[sorted.length - 1]]
    return `Usually ${first}–${last}`
  }
  return `Usually ${sorted.map((d) => DAY_LABELS[d]).join(", ")}`
}

export function ServiceVerticalPage({
  title,
  subtitle,
  emptyHint,
  services,
  staff,
  timeFrames = [],
  heroImage,
  heroVideo,
  pageBackgroundImage,
  pageBackgroundVideo,
  pageBackgroundOpacity = 0.35,
  heroSupport,
  ctaLabel = "See services",
  staffHeading,
  staffSubtitle,
  personLabel = "groomer",
}: ServiceVerticalPageProps) {
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null)
  const bookingRef = useRef<HTMLDivElement>(null)
  const bookingService =
    services.find((service) => service.id === bookingServiceId) ?? null
  const hasPageBg = Boolean(pageBackgroundVideo || pageBackgroundImage)
  // One looping clip as live wallpaper — don't stack a second decode in the hero.
  const heroUsesPageVideo =
    Boolean(pageBackgroundVideo) &&
    (!heroVideo || heroVideo === pageBackgroundVideo)

  useEffect(() => {
    if (!bookingServiceId || !bookingRef.current) return
    bookingRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [bookingServiceId])

  function startBooking(serviceId: string) {
    setBookingServiceId(serviceId)
  }

  return (
    <main
      className={`relative min-h-screen ${
        hasPageBg ? "bg-transparent" : "bg-surface"
      }`}
    >
      {pageBackgroundVideo ? (
        <VideoWallpaper
          src={pageBackgroundVideo}
          fixed
          className="z-0"
          opacity={heroUsesPageVideo ? 1 : pageBackgroundOpacity}
          poster={pageBackgroundImage}
        />
      ) : pageBackgroundImage ? (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${pageBackgroundImage}')`,
            opacity: pageBackgroundOpacity,
          }}
          aria-hidden
        />
      ) : null}

      <div className="relative z-10">
        <CartSidebar />
        <Suspense fallback={<div className="h-[168px]" />}>
          <SiteHeader />
        </Suspense>

        {/* Hero — one composition, brand-led */}
        <section
          aria-label={title}
          className="relative flex min-h-[min(70svh,640px)] items-end overflow-hidden"
        >
          {heroUsesPageVideo ? null : heroVideo ? (
            <VideoWallpaper
              src={heroVideo}
              className="scale-105 animate-fade-in"
              poster={heroImage}
            />
          ) : heroImage ? (
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center animate-fade-in"
              style={{ backgroundImage: `url('${heroImage}')` }}
              aria-hidden
            />
          ) : null}
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#14241c]/45 via-[#14241c]/20 to-[#14241c]/95"
            aria-hidden
          />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 pt-12 md:px-8 md:pb-16 md:pt-16">
            <div className="animate-fade-up">
              <BrandLogo size="lg" href={null} priority className="drop-shadow-lg" />
            </div>
            <h1 className="animate-fade-up delay-100 mt-3 font-display text-3xl font-bold tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="animate-fade-up delay-200 mt-4 max-w-md text-base font-medium leading-relaxed text-white/95 [text-shadow:0_2px_12px_rgba(0,0,0,0.4)] sm:text-lg">
              {heroSupport}
            </p>
            <div className="animate-fade-up delay-300 mt-8">
              <a
                href="#services"
                className="inline-block bg-highlight px-6 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-highlight-dark"
              >
                {ctaLabel}
              </a>
            </div>
          </div>
        </section>

        {/* Dark deck — 30% transparent so wallpaper shows through */}
        <div className="bg-noir/70 backdrop-blur-sm">
          {/* Services */}
          <section
            id="services"
            className="scroll-mt-20 px-6 py-16 md:px-8 md:py-20"
          >
            <div className="mx-auto max-w-7xl">
              <h2 className="animate-fade-up font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
                Services
              </h2>
              <p className="animate-fade-up delay-100 mt-3 max-w-xl text-base leading-relaxed text-white/80">
                {subtitle}
              </p>

              {services.length === 0 ? (
                <p className="mt-10 text-sm text-noir-muted">{emptyHint}</p>
              ) : (
                <ul className="mt-10 space-y-4">
                  {services.map((service, index) => {
                    const isActive = bookingServiceId === service.id
                    return (
                      <li
                        key={service.id}
                        className="animate-fade-up border border-noir-line bg-noir-elevated/70 backdrop-blur-sm"
                        style={{ animationDelay: `${120 + index * 60}ms` }}
                      >
                        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 max-w-3xl flex-1 gap-5">
                            {service.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={service.imageUrl}
                                alt=""
                                className="hidden h-28 w-36 shrink-0 object-cover sm:block"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">
                                  {service.name}
                                </h3>
                                {service.isCombo ? (
                                  <span className="bg-highlight/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-highlight">
                                    Package
                                  </span>
                                ) : null}
                                {service.compareAtPrice != null &&
                                service.compareAtPrice > service.price ? (
                                  <span className="bg-meadow/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-meadow">
                                    Offer
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm leading-relaxed text-white/80 md:text-base">
                                {service.description}
                              </p>
                              {service.isCombo &&
                              service.includedServiceNames.length > 0 ? (
                                <p className="mt-2 text-sm text-white/70">
                                  Includes{" "}
                                  <span className="font-semibold text-white">
                                    {service.includedServiceNames.join(", ")}
                                  </span>
                                </p>
                              ) : null}
                              {service.staff.length > 0 ? (
                                <p className="mt-3 text-sm text-white/70">
                                  With{" "}
                                  <span className="font-semibold text-white">
                                    {service.staff
                                      .map((member) => member.name)
                                      .join(", ")}
                                  </span>
                                </p>
                              ) : (
                                <p className="mt-3 text-sm text-white/70">
                                  Assigning a {personLabel} soon — check back
                                  shortly.
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-row items-end justify-between gap-6 lg:flex-col lg:items-end lg:justify-start">
                            <div className="text-left lg:text-right">
                              <p className="font-display text-2xl font-bold tabular-nums text-white">
                                {formatMoney(service.price)}
                              </p>
                              {service.compareAtPrice != null &&
                              service.compareAtPrice > service.price ? (
                                <p className="mt-0.5 text-sm text-white/55 line-through tabular-nums">
                                  {formatMoney(service.compareAtPrice)}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/65">
                                {service.durationMins} minutes
                                {service.loyaltyPoints > 0
                                  ? ` · ${service.loyaltyPoints} pts`
                                  : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={service.staff.length === 0}
                              onClick={() =>
                                isActive
                                  ? setBookingServiceId(null)
                                  : startBooking(service.id)
                              }
                              className={`px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                isActive
                                  ? "border border-white/30 bg-transparent text-white/80 hover:border-white/50 hover:text-white"
                                  : "bg-highlight text-white hover:bg-highlight-dark"
                              }`}
                            >
                              {isActive ? "Close" : "Book"}
                            </button>
                          </div>
                        </div>

                        {isActive && bookingService ? (
                          <div
                            ref={bookingRef}
                            className="border-t border-noir-line bg-[#101a15]/70 px-5 py-6 sm:px-6 backdrop-blur-sm"
                          >
                            <BookingFlow
                              key={bookingService.id}
                              service={bookingService}
                              personLabel={personLabel}
                              onClose={() => setBookingServiceId(null)}
                              tone="dark"
                            />
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Open windows today */}
          {timeFrames.length > 0 ? (
            <section className="border-t border-noir-line px-6 py-16 md:px-8 md:py-20">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Today’s windows
                </h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">
                  Open blocks on the day — pick a service above to book a time
                  inside one of these.
                </p>
                <ul className="mt-10 grid gap-4 lg:grid-cols-2">
                  {timeFrames.map((frame) => (
                    <li
                      key={frame.id}
                      className="border border-noir-line bg-noir-elevated/70 p-5 sm:p-6 backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <h3 className="font-display text-xl font-bold text-white">
                          {frame.name}
                        </h3>
                        <p className="text-sm font-semibold tabular-nums text-white/85">
                          {frame.startTime}–{frame.endTime}
                        </p>
                      </div>
                      {frame.staffNames.length > 0 ? (
                        <p className="mt-2 text-sm text-white/70">
                          With {frame.staffNames.join(", ")}
                        </p>
                      ) : null}
                      {frame.previewSlots.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {frame.previewSlots.slice(0, 12).map((slot) => (
                            <span
                              key={slot}
                              className="border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium tabular-nums text-white"
                            >
                              {slot}
                            </span>
                          ))}
                          {frame.previewSlots.length > 12 ? (
                            <span className="px-2 py-1.5 text-xs font-medium text-white/65">
                              +{frame.previewSlots.length - 12} more
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {/* Team */}
          <section className="border-t border-noir-line px-6 py-16 md:px-8 md:py-20">
            <div className="mx-auto max-w-7xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
                {staffHeading}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">
                {staffSubtitle}
              </p>

              {staff.length === 0 ? (
                <p className="mt-10 text-sm text-noir-muted">
                  Our team will appear here once they’re on the schedule.
                </p>
              ) : (
                <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {staff.map((member, index) => (
                    <li
                      key={member.id}
                      className="animate-fade-up border border-noir-line bg-noir-elevated/70 p-5 sm:p-6 backdrop-blur-sm"
                      style={{ animationDelay: `${100 + index * 80}ms` }}
                    >
                      <h3 className="font-display text-xl font-bold text-white">
                        {member.name}
                      </h3>
                      {member.title ? (
                        <p className="mt-1 text-sm font-semibold text-highlight">
                          {member.title}
                        </p>
                      ) : null}
                      {member.bio ? (
                        <p className="mt-3 text-sm leading-relaxed text-white/75">
                          {member.bio}
                        </p>
                      ) : null}
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/60">
                        {friendlyDays(member.rosterDays)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <footer className="border-t border-noir-line px-6 py-10 md:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/"
                className="text-sm font-semibold text-highlight transition-colors hover:text-white"
              >
                ← Back to home
              </Link>
              <p className="text-sm text-white/65">{BRAND_NAME} · Pet care</p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}

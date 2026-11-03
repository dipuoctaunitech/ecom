"use client";

import Link from "next/link";
import { Bone, Scissors, Stethoscope } from "lucide-react";
import { VideoWallpaper } from "@/components/VideoWallpaper";
const PET_SHOP_VIDEO = "/videos/pet-shop.mp4";

const DOORS = [
  {
    href: "/items",
    label: "Pet Items",
    blurb: "Food, toys, and everyday gear",
    icon: Bone,
  },
  {
    href: "/grooming",
    label: "Grooming",
    blurb: "Book a slot with a groomer",
    icon: Scissors,
  },
  {
    href: "/clinic",
    label: "Clinic",
    blurb: "Book a slot with a doctor",
    icon: Stethoscope,
  },
] as const;

export function LandingHero() {
  return (
    <section
      aria-label="Welcome"
      className="relative flex min-h-[min(70svh,640px)] items-end overflow-hidden md:items-center"
    >
      <VideoWallpaper
        src={PET_SHOP_VIDEO}
        poster="https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1920&q=80"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#14241c]/50 via-[#14241c]/25 to-[#14241c]/75"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-10 pt-12 md:px-8 md:pb-14 md:pt-16">
        <p className="animate-fade-up max-w-lg text-base font-semibold leading-relaxed text-white/95 [text-shadow:0_2px_14px_rgba(0,0,0,0.5)] sm:text-lg">
          Shop, groom, or see the clinic — all in one place.
        </p>

        <nav
          aria-label="Main services"
          className="animate-fade-up delay-100 mt-10 grid gap-3 sm:grid-cols-3"
        >
          {DOORS.map(({ href, label, blurb, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-3 border border-white/20 bg-black/50 px-5 py-6 text-left text-white shadow-lg backdrop-blur-md transition-colors hover:border-white/40 hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Icon
                className="h-6 w-6 text-highlight transition-transform duration-300 group-hover:scale-110"
                strokeWidth={2}
              />
              <span className="font-display text-xl font-bold tracking-tight">
                {label}
              </span>
              <span className="text-sm font-medium text-white/85">{blurb}</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

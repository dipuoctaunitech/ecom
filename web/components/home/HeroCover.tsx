"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, PawPrint, ShoppingBag } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";
import { useCartStore } from "@/store/useCartStore";

/** Put both files in web/public/videos/ */
const HERO_VIDEOS = [
  "/videos/Vibrant_D_animation_of_a_frie.mp4",
  "/videos/Vibrant_D_animation_of_a_lush.mp4",
  "/videos/Vibrant_D_animation_of_a_happ.mp4",
  "/videos/WhatsApp Video 2026-07-30 at 11.17.11.mp4",
] as const;

const HERO_OPTIONS = [
  { label: "Shop pets", href: "#new" },
  { label: "View offers", href: "#offers" },
];

export function HeroCover() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  const nextPlayable = useCallback(
    (from: number) => {
      for (let step = 1; step <= HERO_VIDEOS.length; step += 1) {
        const index = (from + step) % HERO_VIDEOS.length;
        if (!failed[index]) return index;
      }
      return from;
    },
    [failed]
  );

  const playIndex = useCallback((index: number) => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === index) {
        video.currentTime = 0;
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, []);

  useEffect(() => {
    playIndex(activeIndex);
  }, [activeIndex, playIndex]);

  function handleEnded() {
    setActiveIndex((current) => {
      const next = nextPlayable(current);
      if (next === current) {
        const video = videoRefs.current[current];
        if (video) {
          video.currentTime = 0;
          void video.play().catch(() => {});
        }
      }
      return next;
    });
  }

  function handleError(index: number) {
    setFailed((prev) => ({ ...prev, [index]: true }));
    setActiveIndex((current) =>
      current === index ? nextPlayable(index) : current
    );
  }

  return (
    <section
      aria-label="Welcome"
      className="relative flex min-h-[min(100svh,920px)] items-center justify-center overflow-hidden"
    >
      {HERO_VIDEOS.map((src, index) => (
        <video
          key={src}
          ref={(el) => {
            videoRefs.current[index] = el;
          }}
          muted
          playsInline
          preload={index === 0 ? "auto" : "metadata"}
          onEnded={index === activeIndex ? handleEnded : undefined}
          onError={() => handleError(index)}
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
          poster="https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1920&q=80"
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}

      <div
        className="absolute inset-0 bg-gradient-to-b from-[#14241c]/45 via-[#14241c]/15 to-[#14241c]/55"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-[#14241c]/70 via-[#14241c]/25 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center md:px-8">
        <h1 className="animate-fade-up flex justify-center">
          <BrandLogo
            size="lg"
            href={null}
            priority
            align="center"
            className="drop-shadow-lg"
          />
          <span className="sr-only">{BRAND_NAME}</span>
        </h1>

        <p className="animate-fade-up delay-100 mx-auto mt-5 max-w-md text-base font-semibold leading-relaxed text-white/95 [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] sm:text-lg">
          Shop, groom, or see the clinic — all in one place.
        </p>

        <nav
          aria-label="Quick shop"
          className="animate-fade-up delay-200 mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {HERO_OPTIONS.map((option, i) => (
            <Link
              key={option.label}
              href={option.href}
              className={
                i === 0
                  ? "inline-flex items-center gap-2 rounded-full bg-highlight px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-highlight-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  : "inline-flex items-center rounded-full border-2 border-white/80 bg-white/15 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              }
            >
              {i === 0 && (
                <PawPrint className="h-4 w-4 animate-wag" strokeWidth={2.25} />
              )}
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      <a
        href="#collections"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/90 transition-colors hover:text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]"
        aria-label="Scroll to collections"
      >
        <span>Explore</span>
        <ArrowDown className="h-5 w-5 animate-bounce" strokeWidth={2.5} />
      </a>

      <button
        type="button"
        onClick={toggleCart}
        className="absolute bottom-8 right-6 z-20 flex h-14 items-center gap-2.5 rounded-full bg-white/95 px-6 text-base font-bold text-ink shadow-lg backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:right-8"
        aria-label={`Open cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
      >
        <ShoppingBag className="h-5 w-5" strokeWidth={2.25} />
        <span className="tabular-nums">Cart</span>
        {itemCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-highlight px-1.5 text-sm font-bold text-white">
            {itemCount}
          </span>
        )}
      </button>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

/** Put both files in web/public/videos/ */
const HERO_VIDEOS = [
  "/videos/Vibrant_D_animation_of_a_frie.mp4",
  
  "/videos/Vibrant_D_animation_of_a_lush.mp4","/videos/Vibrant_D_animation_of_a_happ.mp4","/videos/WhatsApp Video 2026-07-30 at 11.17.11.mp4"
] as const;

const HERO_OPTIONS = [
  { label: "Shop New Arrivals", href: "#new", primary: true },
  { label: "View Offers", href: "#offers" },
  { label: "Lighting", href: "/?category=lighting#new" },
  { label: "Kitchenware", href: "/?category=kitchenware#new" },
  { label: "Furniture", href: "/?category=furniture#new" },
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
          poster="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80"
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-black/50 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center md:px-8">
        <p className="animate-fade-up text-sm font-bold uppercase tracking-[0.18em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.85)]">
          Curated Home Essentials
        </p>

        <h1 className="animate-fade-up delay-100 mt-4 font-display text-5xl font-semibold tracking-wide text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.9)] sm:text-6xl md:text-7xl">
          FORMA
        </h1>

        <p className="animate-fade-up delay-200 mx-auto mt-4 max-w-lg text-base font-semibold leading-relaxed text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.85)] sm:text-lg">
          Shop lighting, kitchenware, and furniture for everyday living.
        </p>

        <nav
          aria-label="Quick shop"
          className="animate-fade-up delay-300 mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {HERO_OPTIONS.map((option) =>
            option.primary ? (
              <Link
                key={option.label}
                href={option.href}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-6 py-3 text-sm font-semibold text-black shadow-lg backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {option.label}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            ) : (
              <Link
                key={option.label}
                href={option.href}
                className="inline-flex items-center rounded-full border-2 border-white/90 bg-white/20 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
              >
                {option.label}
              </Link>
            )
          )}
        </nav>
      </div>

      <a
        href="#collections"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/25 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
        aria-label="Scroll to collections"
      >
        <span>Explore</span>
        <ArrowDown className="h-5 w-5 animate-bounce" strokeWidth={2.5} />
      </a>

      <button
        type="button"
        onClick={toggleCart}
        className="absolute bottom-17 right-31 z-20 flex h-16 items-center gap-2.5 rounded-full bg-white/95 px-7 text-base font-semibold text-black shadow-lg backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label={`Open cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
      >
        <ShoppingBag className="h-5 w-5" strokeWidth={2.25} />
        <span className="tabular-nums">Cart</span>
        {itemCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5 text-sm font-bold text-white">
            {itemCount}
          </span>
        )}
      </button>
    </section>
  );
}

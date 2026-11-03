"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { BrandLogo } from "@/components/BrandLogo";
import UserNav from "@/components/UserNav";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { label: "Pet Items", href: "/items" },
  { label: "Grooming", href: "/grooming" },
  { label: "Clinic", href: "/clinic" },
];

interface SiteHeaderProps {
  overlay?: boolean;
}

export function SiteHeader({ overlay = false }: SiteHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toggleCart = useCartStore((state) => state.toggleCart);
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    const queryString = params.toString();
    router.push(queryString ? `/items?${queryString}#new` : "/items");
  }

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-40 border-b border-white/15 bg-gradient-to-b from-[#14241c]/50 to-transparent backdrop-blur-[2px]"
          : "sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
      }
    >
      <div className="mx-auto flex w-full flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5 md:px-10 md:py-6">
        <BrandLogo
          size="header"
          className={
            overlay
              ? "[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.85))_drop-shadow(0_0_1px_rgba(255,255,255,0.35))]"
              : ""
          }
        />

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-sm font-semibold transition-colors ${
                overlay
                  ? "text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] hover:text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <form
          onSubmit={handleSearch}
          role="search"
          method="get"
          action="/items"
          className={`order-last flex h-11 w-full min-w-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors sm:order-none sm:w-auto sm:flex-1 sm:max-w-2xl ${
            overlay
              ? "border-white/45 bg-white/15 text-white shadow-md backdrop-blur-md focus-within:border-white/70 focus-within:bg-white/25"
              : "border-line bg-surface-elevated text-ink focus-within:border-highlight/60"
          }`}
        >
          <button
            type="submit"
            aria-label="Submit search"
            className={`shrink-0 transition-colors ${
              overlay
                ? "text-white hover:text-white"
                : "text-ink-muted hover:text-highlight"
            }`}
          >
            <Search className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search treats, toys, beds..."
            aria-label="Search products"
            className={`w-full min-w-0 bg-transparent text-sm focus:outline-none ${
              overlay
                ? "text-white placeholder:text-white/75"
                : "text-ink placeholder:text-ink-muted"
            }`}
          />
        </form>

        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle overlay={overlay} />
          <UserNav overlay={overlay} />

          {!overlay && (
            <button
              type="button"
              onClick={toggleCart}
              className="relative flex h-11 items-center gap-2 rounded-full bg-highlight px-4 text-sm font-bold text-white shadow-md transition-colors hover:bg-highlight-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
              aria-label={`Open cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={2} />
              <span className="tabular-nums">Cart</span>
              {itemCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-xs font-bold text-surface">
                  {itemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

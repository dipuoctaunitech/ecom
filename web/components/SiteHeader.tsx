"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import UserNav from "@/components/UserNav";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { label: "New", href: "#new" },
  { label: "Lighting", href: "/?category=lighting#new" },
  { label: "Kitchenware", href: "/?category=kitchenware#new" },
  { label: "Furniture", href: "/?category=furniture#new" },
  { label: "Offers", href: "#offers" },
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
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    params.delete("category");
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}#new` : "/");
  }

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-40 border-b border-white/20 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-[2px]"
          : "sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
      }
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3.5 md:px-8">
        <Link
          href="/"
          className={`font-display text-xl font-bold tracking-[0.1em] ${
            overlay ? "text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]" : "text-ink"
          }`}
        >
          FORMA
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-sm font-semibold transition-colors ${
                overlay
                  ? "text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.75)] hover:text-white/90"
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
          action="/"
          className={`order-last flex h-11 w-full min-w-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors sm:order-none sm:w-auto sm:flex-1 sm:max-w-md ${
            overlay
              ? "border-white/50 bg-white/15 text-white shadow-md backdrop-blur-md focus-within:border-white/70 focus-within:bg-white/25"
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
            placeholder="Search for lighting, kitchenware, home..."
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
              className="relative flex h-11 items-center gap-2 rounded-full bg-highlight px-4 text-sm font-semibold text-surface shadow-md transition-colors hover:bg-highlight-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
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

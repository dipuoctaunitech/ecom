import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { CartSidebar } from "@/components/CartSidebar";
import { HeroCover } from "@/components/home/HeroCover";
import { CollectionsRow } from "@/components/home/CollectionsRow";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRow } from "@/components/home/ProductRow";
import { prisma } from "@/lib/prisma";
import { toProduct } from "@/lib/products";
import { isProductOnOffer } from "@shared/types";

export const dynamic = "force-dynamic";

const COLLECTION_TAGS: Record<string, string> = {
  lighting: "New season",
  kitchenware: "Chef's picks",
  tableware: "Set the table",
  textiles: "Cosy edit",
  bath: "Daily rituals",
  storage: "Stay organised",
  furniture: "Statement pieces",
  outdoor: "Bring the outdoors in",
};

interface HomePageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, category } = await searchParams;

  const [dbProducts, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        seller: { select: { name: true, email: true } },
        category: { select: { name: true, slug: true } },
        reviews: { select: { rating: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const allProducts = dbProducts.map(toProduct);

  const query = q?.trim().toLowerCase();
  const activeCategory = category?.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    const matchesCategory =
      !activeCategory || product.categorySlug === activeCategory;
    return matchesQuery && matchesCategory;
  });

  const offerProducts = filteredProducts.filter(isProductOnOffer);
  const isFiltering = Boolean(query || activeCategory);
  const activeCategoryName = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name
    : undefined;

  const collections = categories.slice(0, 6).map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    tag: COLLECTION_TAGS[cat.slug] ?? "Shop the edit",
    image: cat.image ?? "",
  }));

  return (
    <main className="min-h-screen bg-surface">
      <CartSidebar />

      {isFiltering ? (
        <Suspense fallback={<div className="h-[68px] bg-surface" />}>
          <SiteHeader />
        </Suspense>
      ) : (
        <div className="relative">
          <Suspense fallback={<div className="h-[68px]" />}>
            <SiteHeader overlay />
          </Suspense>
          <HeroCover />
        </div>
      )}

      {!isFiltering && (
        <div className="border-b border-line bg-surface-elevated px-6 py-2.5 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p className="text-xs text-ink-muted">
              Free shipping on orders over $75 · Curated with care
            </p>
            <p className="text-xs text-ink-muted">
              Everyday objects inspired by nature.
            </p>
          </div>
        </div>
      )}

      <CollectionsRow collections={collections} />

      <div className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[url('/images/farm-bg.png')] bg-cover bg-center bg-no-repeat opacity-25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-surface/25"
          aria-hidden
        />

        <div className="relative z-10">
          <CategoryGrid categories={categories} />

          {isFiltering ? (
            <ProductRow
              id="new"
              eyebrow="Results"
              title={
                activeCategoryName
                  ? activeCategoryName
                  : query
                    ? `Search: “${q}”`
                    : "All Products"
              }
              subtitle={`${filteredProducts.length} piece${
                filteredProducts.length === 1 ? "" : "s"
              } found. `}
              products={filteredProducts}
              emptyMessage="No products match your search. Try a different keyword or category."
            />
          ) : (
            <>
              <ProductRow
                id="new"
                eyebrow="Just In"
                title="New Arrivals"
                subtitle="Freshly added lighting, kitchenware, and home essentials."
                products={filteredProducts.slice(0, 12)}
              />

              <ProductRow
                id="offers"
                eyebrow="Limited Time"
                title="Offers"
                subtitle="Marked-down pieces while stock lasts."
                products={offerProducts}
                emptyMessage="No active offers right now. Check back soon."
              />
            </>
          )}

          {isFiltering && (
            <div className="px-6 pb-10 md:px-8">
              <div className="mx-auto max-w-7xl">
                <Link
                  href="/"
                  className="text-sm font-medium text-highlight hover:text-ink"
                >
                  ← Clear filters and view everything
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-line bg-surface px-6 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-sm font-semibold tracking-[0.12em] text-ink">
            FORMA
          </p>
          <p className="text-sm text-ink-muted">
            Curated everyday objects · Demo storefront
          </p>
        </div>
      </footer>
    </main>
  );
}

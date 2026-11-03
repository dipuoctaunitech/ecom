import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteHeader } from "@/components/SiteHeader";
import { CartSidebar } from "@/components/CartSidebar";
import { VideoWallpaper } from "@/components/VideoWallpaper";
import { CollectionsRow } from "@/components/home/CollectionsRow";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { OfferGroupsSection } from "@/components/home/OfferGroupsSection";
import { ProductRow } from "@/components/home/ProductRow";
import { prisma } from "@/lib/prisma";
import { productMatchesShopFilter, toProduct } from "@/lib/products";
import { getNewArrivalProducts } from "@/lib/new-arrivals";
import {
  getActiveOfferGroups,
  groupProductsByOfferBands,
} from "@/lib/offers";

const PET_SHOP_VIDEO = "/videos/pet-shop.mp4";
const PET_SHOP_POSTER = "/images/items-bg.png";

export const dynamic = "force-dynamic";

interface ItemsPageProps {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const { q, category, tag } = await searchParams;

  const [dbProducts, categories, petCollections, newArrivals, offerGroups] =
    await Promise.all([
      prisma.product.findMany({
        include: {
          seller: { select: { id: true, name: true, email: true } },
          categories: { select: { name: true, slug: true } },
          reviews: { select: { rating: true } },
          _count: { select: { reviews: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({
        where: { sellerId: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.petCollection.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { category: { select: { slug: true } } },
      }),
      getNewArrivalProducts(),
      getActiveOfferGroups(),
    ]);

  const allProducts = dbProducts.map(toProduct);
  const query = q?.trim().toLowerCase();
  const activeCategory = category?.trim().toLowerCase();
  const activeTag = tag?.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) =>
    productMatchesShopFilter(product, {
      query,
      category: activeCategory,
      tag: activeTag,
    })
  );

  const offerBands = groupProductsByOfferBands(allProducts, offerGroups);
  const isFiltering = Boolean(query || activeCategory || activeTag);
  const activeCategoryName = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name ??
      petCollections.find((c) => c.slug === activeCategory)?.name
    : undefined;

  const collections = petCollections.map((collection) => ({
    slug: collection.category?.slug ?? collection.slug,
    name: collection.name,
    tag: collection.tag,
    image: collection.image,
  }));

  const newArrivalProducts = newArrivals.products;

  return (
    <main className="relative min-h-screen bg-transparent">
      <VideoWallpaper
        src={PET_SHOP_VIDEO}
        fixed
        className="z-0"
        opacity={0.3}
        poster={PET_SHOP_POSTER}
      />

      <div className="relative z-10">
        <CartSidebar />

        <Suspense fallback={<div className="h-[168px] bg-transparent" />}>
          <SiteHeader />
        </Suspense>

        <div className="bg-noir">
          <div className="border-b border-noir-line px-6 py-10 md:px-8 md:py-12">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-highlight">
                Shop
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
                Pet Items
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">
                Food, toys, beds, and everyday gear for every companion.
              </p>
            </div>
          </div>

          <div className="relative isolate overflow-hidden bg-surface">
            <CollectionsRow collections={collections} basePath="/items" />
            <CategoryGrid categories={categories} basePath="/items" />

            {isFiltering ? (
              <ProductRow
                id="new"
                eyebrow="Results"
                title={
                  activeCategoryName
                    ? activeCategoryName
                    : activeTag
                      ? `Tag: “${tag}”`
                      : query
                        ? `Search: “${q}”`
                        : "All Products"
                }
                subtitle={`${filteredProducts.length} item${
                  filteredProducts.length === 1 ? "" : "s"
                } found.`}
                products={filteredProducts}
                emptyMessage="No products match your filters. Try a different keyword, tag, or category."
              />
            ) : (
              <>
                <ProductRow
                  id="new"
                  eyebrow="Just In"
                  title="New Arrivals"
                  subtitle="Fresh finds for walks, naps, and playtime."
                  products={newArrivalProducts}
                />

                <OfferGroupsSection groups={offerBands} />
              </>
            )}

            {isFiltering && (
              <div className="px-6 pb-10 md:px-8">
                <div className="mx-auto max-w-7xl">
                  <Link
                    href="/items"
                    className="text-sm font-semibold text-highlight hover:text-ink"
                  >
                    ← Clear filters and view everything
                  </Link>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-noir-line px-6 py-10 md:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <BrandLogo size="sm" href={null} />
              <Link
                href="/"
                className="text-sm font-semibold text-highlight hover:text-white"
              >
                ← Back to home
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

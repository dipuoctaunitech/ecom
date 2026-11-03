import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { CartSidebar } from "@/components/CartSidebar";
import { LandingHero } from "@/components/home/LandingHero";
import { OfferGroupsSection } from "@/components/home/OfferGroupsSection";
import { prisma } from "@/lib/prisma";
import { toProduct } from "@/lib/products";
import {
  getActiveOfferGroups,
  groupProductsByOfferBands,
} from "@/lib/offers";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [dbProducts, offerGroups] = await Promise.all([
    prisma.product.findMany({
      include: {
        seller: { select: { id: true, name: true, email: true } },
        categories: { select: { name: true, slug: true } },
        reviews: { select: { rating: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getActiveOfferGroups(),
  ]);

  const offerBands = groupProductsByOfferBands(
    dbProducts.map(toProduct),
    offerGroups
  );

  return (
    <main className="min-h-screen bg-surface">
      <CartSidebar />
      <Suspense fallback={<div className="h-[168px]" />}>
        <SiteHeader />
      </Suspense>
      <LandingHero />
      <OfferGroupsSection groups={offerBands} />
    </main>
  );
}

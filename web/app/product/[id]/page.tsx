import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toProduct } from "@/lib/products";
import { getProductReviews } from "@/app/actions/review";
import { ProductDetailView } from "@/components/ProductDetailView";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;

  const dbProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: {
        select: { name: true },
      },
      category: {
        select: { name: true, slug: true },
      },
    },
  });

  if (!dbProduct) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start px-6 py-12 md:px-8 md:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to Store
          </Link>
          <h1 className="mt-16 font-display text-3xl font-medium tracking-tight text-ink">
            Product not found
          </h1>
          <p className="mt-3 max-w-md text-base text-ink-muted">
            This item is no longer in the collection, or the link may be
            incorrect.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center bg-ink px-7 text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Return to Store
          </Link>
        </div>
      </main>
    );
  }

  const { reviews, summary } = await getProductReviews(id);

  return (
    <ProductDetailView
      product={toProduct(dbProduct)}
      reviews={reviews}
      reviewSummary={summary}
    />
  );
}

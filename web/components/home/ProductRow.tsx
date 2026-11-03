import type { Product } from "@shared/types";
import { ProductCard } from "@/components/ProductCard";

interface ProductRowProps {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  emptyMessage?: string;
}

export function ProductRow({
  id,
  eyebrow,
  title,
  subtitle,
  products,
  emptyMessage = "Nothing here yet. Check back soon.",
}: ProductRowProps) {
  return (
    <section id={id} className="px-6 py-10 md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 md:mb-6">
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-highlight">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 max-w-lg text-sm text-ink-muted">{subtitle}</p>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface-elevated/80 p-10 text-center">
            <p className="text-sm text-ink-muted">{emptyMessage}</p>
          </div>
        ) : (
          <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:-mx-8 md:px-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-[46vw] snap-start sm:w-[220px] md:w-[230px]"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

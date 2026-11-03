import Image from "next/image";
import Link from "next/link";

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

interface CategoryGridProps {
  categories: HomeCategory[];
  /** Catalog base path (single-store shop). */
  basePath?: string;
}

export function CategoryGrid({
  categories,
  basePath = "/items",
}: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <section
      id="categories"
      className="border-t border-line/70 px-6 py-14 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between md:mb-10">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Shop by Category
          </h2>
          <a
            href="#new"
            className="text-sm font-semibold text-highlight transition-colors hover:text-ink"
          >
            See All
          </a>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-8">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`${basePath}?category=${category.slug}#new`}
              className="group flex flex-col items-center gap-3 text-center"
            >
              <span className="relative block h-20 w-20 overflow-hidden rounded-full bg-surface-elevated shadow-[0_0_0_3px_color-mix(in_oklab,var(--meadow)_18%,transparent)] transition-all group-hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--highlight)_35%,transparent)] md:h-24 md:w-24">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                ) : null}
              </span>
              <span className="text-xs font-semibold leading-tight text-ink-muted transition-colors group-hover:text-ink md:text-sm">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

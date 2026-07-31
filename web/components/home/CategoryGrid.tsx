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
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <section
      id="categories"
      className="border-t border-line bg-surface px-6 py-14 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between md:mb-10">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink md:text-3xl">
            Shop by Category
          </h2>
          <a
            href="#new"
            className="text-sm font-medium text-highlight transition-colors hover:text-ink"
          >
            See All
          </a>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-8">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/?category=${category.slug}#new`}
              className="group flex flex-col items-center gap-3 text-center"
            >
              <span className="relative block h-20 w-20 overflow-hidden rounded-full bg-surface-elevated ring-1 ring-line transition-all group-hover:ring-highlight/60 md:h-24 md:w-24">
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
              <span className="text-xs font-medium leading-tight text-ink-muted transition-colors group-hover:text-ink md:text-sm">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

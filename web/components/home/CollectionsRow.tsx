import Image from "next/image";
import Link from "next/link";

export interface Collection {
  slug: string;
  name: string;
  tag: string;
  image: string;
}

interface CollectionsRowProps {
  collections: Collection[];
}

export function CollectionsRow({ collections }: CollectionsRowProps) {
  const items = collections.filter((item) => item.image);
  if (items.length === 0) return null;

  return (
    <section id="collections" className="bg-surface px-6 pt-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-end justify-between md:mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-highlight">
              Special Offer
            </p>
            <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink md:text-3xl">
              Curated Collections
            </h2>
          </div>
        </div>

        <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-5 md:-mx-8 md:px-8">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/?category=${item.slug}#new`}
              className="group relative h-40 w-60 shrink-0 snap-start overflow-hidden rounded-2xl md:h-48 md:w-80"
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 240px, 320px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-highlight">
                  {item.tag}
                </p>
                <p className="font-display text-lg font-medium text-white">
                  {item.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

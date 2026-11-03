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
  basePath?: string;
}

export function CollectionsRow({
  collections,
  basePath = "/items",
}: CollectionsRowProps) {
  const items = collections.filter((item) => item.image);
  if (items.length === 0) return null;

  return (
    <section id="collections" className="px-6 pt-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-end justify-between md:mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-highlight">
              Shop by pet
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Pet Collections
            </h2>
          </div>
        </div>

        <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-5 md:-mx-8 md:px-8">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`${basePath}?category=${item.slug}#new`}
              className="group relative h-40 w-60 shrink-0 snap-start overflow-hidden rounded-3xl md:h-48 md:w-80"
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 240px, 320px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#14241c]/90 via-[#14241c]/25 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-highlight">
                  {item.tag}
                </p>
                <p className="font-display text-lg font-bold text-white">
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

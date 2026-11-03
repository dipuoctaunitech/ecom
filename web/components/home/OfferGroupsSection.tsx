import type { OfferGroupBand } from "@/lib/offers"
import { ProductCard } from "@/components/ProductCard"

interface OfferGroupsSectionProps {
  groups: OfferGroupBand[]
}

function rangeLabel(minPercent: number, maxPercent: number): string {
  if (minPercent === maxPercent) return `${minPercent}%`
  return `${minPercent}–${maxPercent}%`
}

export function OfferGroupsSection({ groups }: OfferGroupsSectionProps) {
  if (groups.length === 0) {
    return (
      <section id="offers" className="px-6 py-10 md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-highlight">
            Limited Time
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Offers
          </h2>
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface-elevated/80 p-10 text-center">
            <p className="text-sm text-ink-muted">
              No active offers right now. Check back soon.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="offers" className="px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 md:mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-highlight">
            Limited Time
          </p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Offers
          </h2>
          <p className="mt-2 max-w-xl font-body text-base text-ink-muted">
            Savings sorted by how much you save — pick a band and shop.
          </p>
        </div>

        <div className="space-y-10 md:space-y-14">
          {groups.map((group, index) => (
            <article
              key={group.id}
              className="offer-group-shell overflow-hidden rounded-[1.75rem]"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="offer-group-banner relative px-6 py-7 md:px-10 md:py-9">
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[color-mix(in_oklab,var(--highlight)_22%,transparent)] blur-2xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-[color-mix(in_oklab,var(--meadow)_18%,transparent)] blur-2xl"
                  aria-hidden
                />

                <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-highlight">
                      Save {rangeLabel(group.minPercent, group.maxPercent)}
                    </p>
                    <h3 className="mt-2 font-display text-3xl font-bold leading-[1.05] tracking-tight text-ink md:text-4xl lg:text-[2.75rem]">
                      {group.title}
                    </h3>
                    <p className="mt-3 max-w-2xl font-body text-base leading-relaxed text-ink-muted md:text-lg">
                      {group.description}
                    </p>
                  </div>

                  <div className="shrink-0 self-start md:self-end">
                    <div className="flex items-end gap-1 border border-[color-mix(in_oklab,var(--highlight)_35%,var(--line))] bg-[color-mix(in_oklab,var(--highlight)_10%,var(--surface-elevated))] px-4 py-3 md:px-5 md:py-4">
                      <span className="font-display text-4xl font-bold leading-none tracking-tight text-highlight md:text-5xl">
                        {group.minPercent === group.maxPercent
                          ? group.minPercent
                          : group.maxPercent}
                      </span>
                      <span className="mb-1 font-display text-lg font-bold text-highlight md:text-xl">
                        %
                      </span>
                      <span className="mb-1.5 ml-1 font-body text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        off
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-line/70 bg-surface-elevated/70 px-2 py-5 md:px-4 md:py-6">
                <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                  {group.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      className="w-[46vw] snap-start sm:w-[220px] md:w-[230px]"
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

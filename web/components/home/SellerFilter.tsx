"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Store } from "lucide-react";

export type ShopSellerOption = {
  id: string;
  name: string;
};

export function SellerFilter({ sellers }: { sellers: ShopSellerOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSeller = searchParams.get("seller") ?? "";

  if (sellers.length === 0) return null;

  function handleChange(sellerId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sellerId) {
      params.set("seller", sellerId);
    } else {
      params.delete("seller");
    }
    const query = params.toString();
    router.push(query ? `/?${query}#new` : "/#new");
  }

  return (
    <section className="border-t border-line/70 px-6 py-4 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
          <Store className="h-4 w-4 text-meadow" strokeWidth={1.75} />
          Shop by seller
        </p>
        <label className="relative inline-flex min-w-[220px] items-center">
          <span className="sr-only">Seller</span>
          <select
            value={activeSeller}
            onChange={(event) => handleChange(event.target.value)}
            className="h-11 w-full appearance-none rounded-full border border-line bg-surface-elevated px-4 pr-10 text-sm text-ink transition-colors focus:border-highlight focus:outline-none"
          >
            <option value="">All sellers</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 h-4 w-4 text-ink-muted"
            strokeWidth={1.75}
          />
        </label>
      </div>
    </section>
  );
}

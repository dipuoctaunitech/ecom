import type { Product } from "./types";

function withImages(
  product: Omit<Product, "images"> & { images?: string[] }
): Product {
  const images = product.images ?? (product.imageUrl ? [product.imageUrl] : []);
  return { ...product, images, imageUrl: images[0] ?? product.imageUrl };
}

export const MOCK_PRODUCTS: Product[] = [
  withImages({
    id: "1",
    name: "Trail-Ready Harness",
    description: "Padded no-pull harness with four adjustment points.",
    brand: "namma pets Club",
    animals: ["Dogs"],
    tags: ["harness", "walk", "dogs", "outdoor"],
    price: 42,
    compareAtPrice: 54,
    imageUrl:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
    category: "Dogs",
    categorySlug: "dogs",
    categories: [
      { name: "Dogs", slug: "dogs" },
      { name: "Toys & Play", slug: "toys" },
    ],
    stock: 14,
  }),
  withImages({
    id: "2",
    name: "Cloud-Soft Cat Tree",
    description: "Compact sisal-wrapped cat tree with two perches.",
    brand: "namma pets Club",
    animals: ["Cats"],
    tags: ["cat tree", "climbing", "cats", "furniture"],
    price: 96,
    compareAtPrice: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80",
    category: "Cats",
    categorySlug: "cats",
    categories: [{ name: "Cats", slug: "cats" }],
    stock: 7,
  }),
  withImages({
    id: "3",
    name: "Squeaky Plush Forest Set",
    description: "Three soft forest critters with gentle squeakers.",
    brand: "namma pets Club",
    animals: ["Dogs", "Cats"],
    tags: ["toys", "plush", "squeaky", "play"],
    price: 24,
    imageUrl:
      "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80",
    category: "Toys & Play",
    categorySlug: "toys",
    categories: [{ name: "Toys & Play", slug: "toys" }],
    stock: 22,
  }),
  withImages({
    id: "4",
    name: "Grain-Free Salmon Kibble",
    description: "Adult dog kibble with salmon as the first ingredient.",
    brand: "namma pets Club",
    animals: ["Dogs"],
    tags: ["food", "kibble", "salmon", "grain-free"],
    price: 36,
    compareAtPrice: 44,
    imageUrl:
      "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=800&q=80",
    category: "Food & Treats",
    categorySlug: "food",
    categories: [{ name: "Food & Treats", slug: "food" }],
    stock: 19,
  }),
  withImages({
    id: "5",
    name: "Nest Orthopedic Dog Bed",
    description: "Memory-foam bolster bed with a washable cover.",
    brand: "namma pets Club",
    animals: ["Dogs"],
    tags: ["bed", "orthopedic", "comfort", "dogs"],
    price: 78,
    imageUrl:
      "https://images.unsplash.com/photo-1544568100-847a948585b9?w=800&q=80",
    category: "Beds & Comfort",
    categorySlug: "beds",
    categories: [{ name: "Beds & Comfort", slug: "beds" }],
    stock: 9,
  }),
  withImages({
    id: "6",
    name: "Feather Wand Duo",
    description: "Two interchangeable feather wands with a teak handle.",
    brand: "namma pets Club",
    animals: ["Cats"],
    tags: ["toys", "wand", "cats", "play"],
    price: 16,
    imageUrl:
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80",
    category: "Toys & Play",
    categorySlug: "toys",
    categories: [
      { name: "Toys & Play", slug: "toys" },
      { name: "Cats", slug: "cats" },
    ],
    stock: 24,
  }),
];

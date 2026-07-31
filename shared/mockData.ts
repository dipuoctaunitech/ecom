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
    name: "Minimal Desk Lamp",
    description: "Adjustable LED desk lamp with warm and cool light modes.",
    price: 48,
    compareAtPrice: 64,
    imageUrl:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
    category: "Lighting",
    stock: 12,
  }),
  withImages({
    id: "2",
    name: "Ceramic Pour-Over Set",
    description: "Matte ceramic dripper and mug for slow morning coffee.",
    price: 36,
    compareAtPrice: 48,
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    category: "Kitchen",
    stock: 8,
  }),
  withImages({
    id: "3",
    name: "Linen Throw Blanket",
    description: "Lightweight stone-washed linen throw for sofa or bed.",
    price: 72,
    imageUrl:
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80",
    category: "Home",
    stock: 5,
  }),
  withImages({
    id: "4",
    name: "Walnut Cutting Board",
    description: "Thick end-grain walnut board with juice groove.",
    price: 64,
    compareAtPrice: 80,
    imageUrl:
      "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&q=80",
    category: "Kitchen",
    stock: 3,
  }),
  withImages({
    id: "5",
    name: "Wireless Earbuds",
    description: "Compact earbuds with clear mids and a charging case.",
    price: 89,
    imageUrl:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
    category: "Electronics",
    stock: 15,
  }),
  withImages({
    id: "6",
    name: "Canvas Tote Bag",
    description: "Heavyweight canvas tote with reinforced handles.",
    price: 28,
    imageUrl:
      "https://images.unsplash.com/photo-1780480999314-b82a1f2f9de6?w=800&q=80",
    category: "Accessories",
    stock: 20,
  }),
];

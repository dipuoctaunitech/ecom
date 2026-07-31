export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Original price before discount; when greater than `price`, product is on offer. */
  compareAtPrice?: number | null;
  /** Primary image (first in `images`) for cards, cart, etc. */
  imageUrl: string;
  /** All product media URLs (images and videos). */
  images: string[];
  category: string;
  categorySlug?: string | null;
  /** Units available to add to cart. */
  stock: number;
  /** Average star rating when reviews exist. */
  averageRating?: number;
  /** Total number of reviews. */
  reviewCount?: number;
}

/** True when the product has a higher compare-at price than its selling price. */
export function isProductOnOffer(product: Product): boolean {
  return (
    product.compareAtPrice != null && product.compareAtPrice > product.price
  );
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string | null;
  comment: string;
  createdAt: string;
  isOwn?: boolean;
}

export interface ProductReviewSummary {
  averageRating: number;
  reviewCount: number;
}

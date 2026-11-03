export interface Product {
  id: string;
  name: string;
  description: string;
  /** Brand / manufacturer. */
  brand?: string;
  /** Pet types (e.g. Dogs, Cats) used by shop-by-pet filters. */
  animals?: string[];
  /** Keywords that power shop search and tag filters. */
  tags?: string[];
  price: number;
  /** Original price before discount; when greater than `price`, product is on offer. */
  compareAtPrice?: number | null;
  /** Loyalty points awarded with this purchase. */
  loyaltyPoints?: number;
  /** Primary image (first in `images`) for cards, cart, etc. */
  imageUrl: string;
  /** All product media URLs (images and videos). */
  images: string[];
  /** Primary category label for cards (first assigned category). */
  category: string;
  /** Primary category slug for cards (first assigned category). */
  categorySlug?: string | null;
  /** All assigned categories. */
  categories?: { name: string; slug: string }[];
  /** Selling merchant for marketplace grouping (checkout, cart). */
  sellerId?: string;
  sellerName?: string;
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

/** Rounded percent off from compare-at → selling price, or null if not on offer. */
export function getDiscountPercent(product: Product): number | null {
  if (!isProductOnOffer(product) || product.compareAtPrice == null) {
    return null;
  }
  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
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

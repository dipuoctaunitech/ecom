# Scope — Commerce Domain

**Covers:** Catalog, merchandising, cart, checkout, orders, payments, discounts, reviews  
**Key code:** `prisma/schema.prisma` (Product/Order*), `web/app/actions/{product,order,seller,admin,review,store-*}.ts`, `web/store/useCartStore.ts`

---

## 1. Catalog model

### Product fields (in scope)

- Identity: title/name, description, seller ownership
- Merchandising: brand, animals[], tags[], categories (M2M), images[] (photos/videos, capped in upload UX)
- Pricing: `price`, optional `compareAtPrice` (drives “on offer”), `loyaltyPoints`
- Inventory: `stock`, `lowStockThreshold`
- Optional location fields on product
- Reviews aggregate (average + count) derived from `ProductReview`

### Related entities

| Entity | Purpose |
| --- | --- |
| `Category` | Store-wide or seller-private categories; sortOrder + image |
| `PetCollection` | Curated “shop by pet” marketing row |
| `OfferGroup` | Discount % bands for landing shelves |
| `NewArrivalEntry` | Manual new-arrivals curation |
| `ProductVariant` | Size/SKU/price/stock variants (data model present) |
| `ProductReview` | One review per user per product |

---

## 2. Merchandising operations

Managed primarily from `/store` (and some admin/seller tools):

| Capability | Action modules |
| --- | --- |
| Store categories CRUD + reorder | `store-categories.ts` |
| Collections CRUD + reorder | `store-collections.ts` |
| Offer groups CRUD + reorder | `store-offer-groups.ts` |
| New arrivals add/remove/reorder/sync/clear | `store-new-arrivals.ts` |
| Seller private categories | `seller.ts` |
| Admin product/category edits | `admin.ts` |

**Acceptance**

- Reorder APIs persist sort order used by public shop sections.
- Deleting a category that is referenced by collections should not orphan UI (SetNull / guarded delete).

---

## 3. Cart & pricing rules

| Rule | Detail |
| --- | --- |
| Cart storage | Browser memory (Zustand); not durable across devices |
| Display price | Selling `price`; show % off when `compareAtPrice > price` |
| Line total | `quantity × price` at add time; checkout should re-read DB prices where implemented |
| Multi-seller | Cart may contain items from multiple sellers; checkout loads seller GST/QR per seller |

---

## 4. Orders lifecycle

### Status enum

`PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED` (also `RETURNED`, `REFUNDED`)

### Creation (`placeOrder`)

1. Authenticated buyer.
2. Validate cart products/stock.
3. Create `Order` with `totalAmount`.
4. Create `OrderItem` rows with `priceAtPurchase`.
5. Create `OrderPayment` per seller (receipt optional, `paymentReceived` default false).

### Mutations in scope

| Actor | Capabilities |
| --- | --- |
| Buyer | View orders; confirm received; attach/remove receipts |
| Seller | View seller orders; update status; mark payment received |
| Admin | View/filter orders; update status; assign `deliveryBoyId`; mark payment |
| Delivery | View assigned orders; update run status; mark COD payment |

---

## 5. Payments (demo-oriented)

**In scope**

- Seller QR code URL for customer UPI/scan payment.
- Seller + buyer GST numbers for invoice-style checkout display.
- Manual “payment received” flags with `PaymentMarkedByRole` (`SELLER` | `DELIVERY` | `ADMIN`).
- Optional receipt image URL on `OrderPayment`.
- Store settings placeholders: payment gateway name, enabled flag, tax rate, shipping defaults, loyalty toggle.

**Out of scope**

- Charging cards via Stripe/Razorpay APIs.
- Automated settlement / payouts to sellers.
- Partial payments / multi-tender.

---

## 6. Discounts

| Type | Scope |
| --- | --- |
| Product compare-at | Always-on merchandising discount |
| Offer groups | Band shelves by discount % |
| `DiscountCode` | Admin or seller codes: `%` or fixed, min order, max uses, schedule, active flag |

Checkout must validate codes server-side when applied (admin/seller create + toggle are in scope; wire-up completeness should match current checkout UI).

---

## 7. Reviews

- Authenticated create with rating + comment (+ optional title).
- Unique constraint: one review per `(productId, userId)`.
- Author can delete own review.
- Product cards/detail show average + count.

---

## 8. Support tickets (admin ops)

- `SupportTicket` with status/priority.
- Admin list + status updates.
- Customer create UI may be minimal/demo; schema and admin handling are in scope.

---

## 9. Commerce acceptance checklist

- [ ] Seeded products appear on `/` offer bands and `/items`.
- [ ] Add to cart → checkout creates DB order with items + seller payment rows.
- [ ] Seller marks payment; admin/delivery can also mark when permitted.
- [ ] Admin assigns delivery boy; delivery portal lists the assignment.
- [ ] Discount codes can be created and toggled from admin/seller.
- [ ] Review create updates visible average on product after refresh.

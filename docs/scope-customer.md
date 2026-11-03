# Scope — Customer (Buyer) Experience

**Audience:** Guests and authenticated `BUYER` users  
**Surfaces:** `/`, `/items`, `/product/[id]`, `/grooming`, `/clinic`, `/checkout`, `/account`, `/signup`, cart sidebar

---

## 1. Goals

- Make the brand the hero of the first viewport.
- Let customers discover products via offers, categories, collections, and new arrivals.
- Support end-to-end purchase and care booking without staff assistance.
- Keep account management focused: profile, pets, orders, bookings.

---

## 2. Landing (`/`)

**In scope**

- Full-bleed brand landing hero (`LandingHero`) with Namma pets Club identity.
- Offer-group shelves driven by DB `OfferGroup` bands and product `compareAtPrice` discounts.
- Global site header (nav, auth, theme) and cart sidebar.

**Out of scope**

- Personalized recommendations engine.
- A/B testing or CMS-driven hero variants.

---

## 3. Pet Items shop (`/items`)

**In scope**

- Browse products persisted in PostgreSQL (mapped to shared `Product` shape via `toProduct`).
- Shop-by-category grid (store-wide categories with images + sort order).
- Pet collections row (curated `PetCollection` entries).
- New arrivals shelf (curated `NewArrivalEntry`, with fallback to latest products when empty).
- Filters / seller grouping as implemented in home components (`SellerFilter`, product rows).
- Product cards with price, compare-at discount %, loyalty points when set, ratings summary.

**Acceptance**

- Empty states remain usable if curation tables are cleared.
- Images resolve via absolute URLs or `/api/images/...` proxy for stored assets.

---

## 4. Product detail (`/product/[id]`)

**In scope**

- Title, description, brand, animals, tags, categories, stock, media gallery/zoom.
- Add to cart (Zustand) respecting stock.
- Product reviews: list, average, create/delete own review (authenticated).

**Out of scope**

- Variant picker UI fully wired to checkout line items (schema has `ProductVariant`; buyer flow uses base product stock/price).
- Q&A, wishlists, share sheets.

---

## 5. Cart

**In scope**

- Client-side cart via Zustand (`web/store/useCartStore.ts`).
- Sidebar UX: quantity adjust, remove, proceed to checkout.
- Multi-seller line awareness for checkout seller info / GST display.

**Out of scope**

- Server-persisted carts across devices.
- Saved-for-later lists.

---

## 6. Checkout (`/checkout`)

**In scope**

- Require signed-in buyer (or prompt to sign in / register).
- Load buyer shipping/contact profile (`getCheckoutBuyerInfo`).
- Load per-seller checkout info including GST and payment QR (`getCheckoutSellerInfo`).
- Place order (`placeOrder`) creating `Order`, `OrderItem`, and `OrderPayment` rows.
- Optional buyer GSTIN for B2B-style invoices.
- Attach/remove payment receipts against seller payment rows.

**Acceptance**

- Order total reflects cart quantities × price at purchase.
- Stock constraints respected at place-order time (server validation).

**Out of scope**

- Live card capture / 3DS.
- Split shipments UX beyond seller-scoped payment rows.

---

## 7. Account dashboard (`/account`)

**In scope** (component tabs under buyer dashboard)

| Tab / area | Capabilities |
| --- | --- |
| Overview | Summary of recent activity |
| Profile | Name, phone, vet contact, address fields |
| GST | Update buyer GST number |
| Pets | CRUD `CustomerPet` profiles (species, breed, medical notes, images, etc.) |
| Orders | List buyer orders; confirm received where allowed |
| Bookings | List/cancel eligible grooming & clinic bookings |

**Auth**

- Signed-in users only; page-level guard.
- Registration via `/signup` → `registerCustomer` (buyer role).

---

## 8. Grooming & clinic (customer side)

See [scope-services.md](./scope-services.md) for booking rules. Customer entry points:

- `/grooming` — grooming vertical page + booking flow
- `/clinic` — clinic vertical page + booking flow

Customers pick service → staff → available slot → notes → create booking.

---

## 9. Non-functional (customer UX)

- Responsive layout; minimal chrome; one primary action per view.
- Theme toggle (light/dark) via theme provider.
- Lucide icons only on web interactive UI.
- Prefer clear empty/error states over silent failures.

---

## 10. Explicit exclusions

- Guest checkout without account.
- Social login (Google/Apple).
- Push notifications for order/booking status.
- Loyalty redemption at checkout (points field exists on products/services; redemption UX not required).

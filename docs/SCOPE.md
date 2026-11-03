# Master Product Scope — Namma pets Club

**Status:** Shipped demo / high-fidelity store platform  
**Primary surface:** Web (`/web`)  
**Mobile:** Scaffold only (see [scope-mobile.md](./scope-mobile.md))  
**Brand:** Namma pets Club — Pets · Care · Community

---

## 1. Product vision

Namma pets Club is a single-store (multi-tenant-ready) pet retail and care platform that combines:

1. **Pet commerce** — browse, filter, cart, checkout, and order tracking for pet products.
2. **Bookable care** — grooming and clinic appointments with staff rostering and day boards.
3. **Role-based operations** — admin, seller/owner, manager, groomer, doctor, and delivery portals.
4. **Floor operations** — a live `/store` board for staff to manage categories, offers, roster, services, and order status.

The demo targets a polished, production-feel experience with real PostgreSQL persistence, NextAuth credentials login, and object storage for uploads — not a mock-only UI shell.

---

## 2. In scope (current release)

### 2.1 Customer-facing

| Area | In scope |
| --- | --- |
| Landing | Brand hero, offer-band product shelves |
| Pet Items shop | Categories, collections, new arrivals, search/filters, product detail, reviews |
| Grooming vertical | Public service listing + booking flow |
| Clinic vertical | Public service listing + booking flow |
| Cart | Client-side Zustand cart, sidebar UX |
| Checkout | Buyer profile, seller GST/QR, place order |
| Account | Profile, GST, pet profiles, orders, bookings |
| Auth | Email/password signup (buyers) and sign-in; role-gated routes |

### 2.2 Staff & operations

| Role / surface | In scope |
| --- | --- |
| `ADMIN` `/admin` | Users/roles, sellers, delivery boys, store staff, products, categories, orders, discounts, support tickets, store settings, KPIs |
| `SELLER` `/seller` | Products, categories, discounts, delivery settings, GST/QR, order/payment marking |
| `SELLER` + store `MANAGER` `/manager` | Manager overview of store ops |
| Store member `GROOMER` `/groomer` | Day board, booking status updates |
| Store member `DOCTOR` `/doctor` | Day board, booking status updates |
| `DELIVERY` `/delivery` | Assigned runs, COD payment mark, run status |
| `/store` (ADMIN + SELLER) | Live board, categories, collections, new arrivals, offer groups, roster, services, time frames |

### 2.3 Platform foundations

- PostgreSQL via Prisma (migrations + seed)
- NextAuth JWT sessions with live role refresh / demotion handling
- MinIO/S3-compatible asset upload and image proxy
- Middleware route guards by platform `Role` and page-level store-membership checks
- Rate-limited credential login; timing-safe password compare
- Theme toggle + responsive Tailwind UI (Lucide icons)

---

## 3. Out of scope (current release)

Explicitly **not** required for this demo unless later scheduled:

- Real payment gateway capture (Stripe/Razorpay charge flow) — settings exist; checkout is demo/COD-oriented
- Multi-store tenant switcher UI (schema supports `Store`; v1 runs one default store)
- Native mobile feature parity (Expo folders are placeholders)
- Email/SMS notifications, OTP, password reset flows
- Inventory sync with external ERPs / marketplaces
- Live chat / real-time websockets (boards poll/refresh via server actions + navigation)
- Advanced analytics BI, refunds automation, returns logistics
- Public API for third-party integrations
- i18n / multi-currency

---

## 4. Actors & access matrix

### 4.1 Platform roles (`User.role`)

| Role | Typical access |
| --- | --- |
| `BUYER` | Shop, book, account, own orders/bookings |
| `SELLER` | Seller dashboard; may also be store OWNER/MANAGER/GROOMER/DOCTOR via membership |
| `ADMIN` | Full admin console + `/store` |
| `DELIVERY` | Delivery assignments only |

### 4.2 Store membership roles (`StoreMember.role`)

| Store role | Access |
| --- | --- |
| `OWNER` | Seller ownership of the default store |
| `MANAGER` | `/manager` overview; store ops as permitted by guards |
| `GROOMER` | `/groomer` portal |
| `DOCTOR` | `/doctor` portal |

Staff profiles (`StaffMember`) optionally link to a login user for portal day boards.

---

## 5. Primary routes

| Path | Audience |
| --- | --- |
| `/` | Public landing |
| `/items` | Pet Items catalog |
| `/product/[id]` | Product detail |
| `/grooming`, `/clinic` | Service verticals |
| `/checkout` | Checkout |
| `/orders` | Buyer orders (legacy/simple) |
| `/account` | Buyer dashboard |
| `/signup` | Customer registration |
| `/seller`, `/seller/new` | Seller ops / add product |
| `/admin` | Admin console |
| `/manager` | Store manager |
| `/groomer`, `/doctor` | Staff day boards |
| `/delivery` | Delivery runs |
| `/store` | Floor operations |

API routes of note: `/api/auth/[...nextauth]`, `/api/upload`, `/api/images/[...path]`.

---

## 6. Success criteria for the demo

1. A buyer can browse offers → add to cart → checkout → see the order in account.
2. A buyer can book a grooming or clinic slot for an available staff member.
3. Admin can create sellers, delivery boys, and store staff and assign order delivery.
4. Seller can manage catalog, mark payment received, and manage GST/QR.
5. Groomer/doctor see today’s board and can update booking status.
6. Delivery can see assigned orders and mark COD collected.
7. `/store` managers/admins can curate shop merchandising and service roster without code changes.
8. Demoting a privileged user invalidates elevated route access on next request (middleware + JWT refresh).

---

## 7. Document map

- Customer journeys → [scope-customer.md](./scope-customer.md)
- Commerce domain → [scope-commerce.md](./scope-commerce.md)
- Services & booking → [scope-services.md](./scope-services.md)
- Staff portals → [scope-staff-portals.md](./scope-staff-portals.md)
- Admin & store floor → [scope-admin-store.md](./scope-admin-store.md)
- Engineering → [scope-technical.md](./scope-technical.md)
- Mobile → [scope-mobile.md](./scope-mobile.md)
- Demo script → [DEMO.md](./DEMO.md)

---

## 8. Non-goals vs earlier “mock demo” rules

Repository `.cursorrules` historically constrained the project to mock data only. **The shipped codebase supersedes that constraint:** Prisma/PostgreSQL, NextAuth, MinIO, and server actions are intentional and in scope for this release. Shared `shared/mockData.ts` remains as a fallback/reference catalog shape, but the live web app reads products and bookings from the database.

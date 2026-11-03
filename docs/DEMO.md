# Demo Guide — Namma pets Club

Use this checklist for a live walkthrough. Seed password comes from `SEED_PASSWORD` in `.env` (never commit the real value).

---

## 1. Seed accounts

| Persona | Email | Platform role | Store role | Start here |
| --- | --- | --- | --- | --- |
| Admin | `admin@forma.local` | `ADMIN` | — | `/admin` |
| Buyer | `buyer@forma.local` | `BUYER` | — | `/`, `/account` |
| Seller / owner | `seller@forma.local` | `SELLER` | `OWNER` | `/seller`, `/store` |
| Manager | `manager@forma.local` | `SELLER` | `MANAGER` | `/manager`, `/store` |
| Groomer | `groomer@forma.local` | `SELLER` | `GROOMER` | `/groomer` |
| Doctor | `doctor@forma.local` | `SELLER` | `DOCTOR` | `/doctor` |
| Delivery | `delivery@forma.local` | `DELIVERY` | — | `/delivery` |

Additional seeded buyers may include `alex@forma.local` and `priya@forma.local` (same `SEED_PASSWORD`).

---

## 2. Suggested 10-minute script

### A. Customer commerce (3 min)

1. Open `/` as guest — confirm brand hero + offer shelves.  
2. Sign in as buyer → `/items` → open a product → add to cart.  
3. Checkout → place order → confirm it appears under `/account` orders.

### B. Care booking (2 min)

1. Still as buyer → `/grooming` → pick service → staff → slot → book.  
2. Optionally book `/clinic`.  
3. Confirm booking listed in account.

### C. Staff fulfillment (3 min)

1. Sign in as groomer → `/groomer` → update booking status.  
2. Sign in as doctor → `/doctor` → same for clinic.  
3. Sign in as seller → `/seller` → find order → mark payment / advance status.  
4. Sign in as admin → assign delivery boy on the order.  
5. Sign in as delivery → `/delivery` → mark COD received.

### D. Store merchandising (2 min)

1. Sign in as seller or admin → `/store`.  
2. Reorder a category or pin a new arrival.  
3. Refresh `/items` / `/` to show the change.

---

## 3. Negative tests (quick)

- Buyer cannot open `/admin`, `/seller`, `/store`, `/delivery`.  
- Groomer/doctor cannot use `/store` floor tools (redirect home).  
- Delivery cannot see unassigned orders.  
- Wrong password triggers generic failure; rapid retries hit rate limit.

---

## 4. Infra smoke check

- [ ] `docker compose ps` — postgres + minio healthy  
- [ ] `web` `npm run dev` serves `/`  
- [ ] Upload of a product/category image succeeds for permitted roles  
- [ ] Prisma client matches latest migrations

---

## 5. Known demo boundaries

- Payments are manual/COD + QR, not live card capture.  
- Single default store (no tenant switcher).  
- Mobile app not part of the live demo.  
- Some settings (gateway name, loyalty toggle) are configuration stubs.

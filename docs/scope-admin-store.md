# Scope — Admin Console & Store Floor Board

**Routes:** `/admin`, `/store`  
**Actions:** `admin.ts`, `store-dashboard.ts`, `store-categories.ts`, `store-collections.ts`, `store-offer-groups.ts`, `store-new-arrivals.ts`, `store-roster.ts`, `store-services.ts`, `store-timeframes.ts`

---

## 1. Admin console (`/admin`)

**Gate:** platform role `ADMIN` (middleware).  
**UI:** `AdminDashboard` with modular panels.

### Modules in scope

| Module | Capabilities |
| --- | --- |
| Overview / KPIs | Revenue-ish aggregates, order counts, stock alerts (`getAdminKPIs`, `getAdminAnalytics`) |
| Customers | List buyers/customers; drill into customer orders |
| Sellers | Create seller accounts; list sellers |
| Staff | Create store staff (groomer/doctor/manager-style accounts); activate/deactivate |
| Delivery | Create delivery boys; list; assign to orders |
| Products | Cross-seller product table; admin edits |
| Categories | Create store-wide categories |
| Orders | Filterable order table; status updates; payment mark; delivery assignment; invoice modal |
| Marketing / discounts | Create/toggle global discount codes |
| Support | Ticket list + status updates |
| Settings | `StoreSettings` (gateway flags, shipping, tax, low-stock threshold, loyalty toggle) |
| Roles | `updateUserRole` for platform roles |

### Admin acceptance

- [ ] Admin can provision seller, delivery, and store staff logins.
- [ ] Admin can move an order through statuses and assign a delivery boy.
- [ ] Store settings persist and surface in commerce calculations where wired.
- [ ] Non-admins hitting `/admin` redirect home.

### Admin out of scope

- Impersonation “login as user”.
- Full audit log UI (rely on DB + app logs for demo).
- Fine-grained RBAC beyond the enums above.

---

## 2. Store floor board (`/store`)

**Gate:** `ADMIN` or `SELLER` only (middleware). Floor staff (groomer/doctor) must use their portals — category upload / store tools remain locked to elevated roles as per shipped fixes.

**UI panels**

| Panel | Purpose |
| --- | --- |
| `StoreLiveDashboard` | Live orders/bookings board; update order status from floor |
| `StoreCategoriesPanel` | Merchandising categories + images + reorder |
| `StoreCollectionsPanel` | Pet collections curation |
| `StoreNewArrivalsPanel` | Pin/reorder new arrivals; sync from latest; clear curation |
| `StoreOfferGroupsPanel` | Configure discount band shelves |
| `StoreServicesPanel` | Grooming/clinic catalog + combos + staff links |
| `StoreRosterPanel` | Weekly roster, exceptions, booking reassignment/status |
| `StoreTimeFramesPanel` | Vertical time windows + staff mapping |

### Live board (`store-dashboard.ts`)

- Resolve store staff profile for the signed-in user when applicable.
- Aggregate today’s operational snapshot (`getStoreLiveBoard`).
- Allow permitted order status updates from the floor (`updateStoreBoardOrderStatus`).

### Merchandising acceptance

- [ ] Reordering categories/collections/offers/new arrivals changes public `/` and `/items` presentation after refresh.
- [ ] Clearing new-arrivals curation falls back to latest products.
- [ ] Only ADMIN/SELLER can open `/store`; groomer/doctor are redirected away.

---

## 3. Provisioning flows (admin → ops)

```
ADMIN creates SELLER ──► seller manages catalog + payments
ADMIN creates DELIVERY ──► admin assigns orders ──► delivery portal
ADMIN creates store staff ──► StoreMember + optional StaffMember link
                          ├── MANAGER → /manager + /store (if SELLER)
                          ├── GROOMER → /groomer
                          └── DOCTOR  → /doctor
```

Seed already materializes one of each for demos (see [DEMO.md](./DEMO.md)).

---

## 4. Security expectations

- All admin/store mutations verify session role server-side.
- Uploads (`/api/upload`) respect auth and role constraints (including floor-staff lockout for privileged category media where enforced).
- Middleware uses loopback `NEXTAUTH_INTERNAL_URL` / `127.0.0.1` for session refresh to avoid public-EIP hairpin timeouts on `/admin` and `/seller`.

---

## 5. Out of scope

- Multi-store picker (schema ready; UI assumes default store).
- Drag-and-drop page builder / CMS.
- Bulk CSV import/export.
- Realtime websocket push for the live board.

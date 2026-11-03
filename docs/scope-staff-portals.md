# Scope — Staff & Partner Portals

**Surfaces:** `/seller`, `/manager`, `/groomer`, `/doctor`, `/delivery`  
**Auth:** NextAuth session + middleware role gates + page-level membership checks

---

## 1. Access overview

| Portal | Platform role gate | Additional gate |
| --- | --- | --- |
| `/seller` | `SELLER` | — |
| `/manager` | `SELLER` (middleware) | Store membership `MANAGER` (page) |
| `/groomer` | signed-in | Store membership / staff type GROOMER |
| `/doctor` | signed-in | Store membership / staff type DOCTOR |
| `/delivery` | `DELIVERY` | — |

Notes:

- Seeded manager/groomer/doctor users use platform role `SELLER` plus a `StoreMemberRole`.
- Groomer/doctor must **not** be sent to `/store` as a substitute for their day board (redirect/guard behavior is part of shipped bug fixes).
- Middleware prefers live session role over stale JWT when resolving demotions.

---

## 2. Seller portal (`/seller`)

**Components:** `SellerDashboard` and panels (products, categories, discounts, delivery, QR, shipping/orders).

### In scope

| Module | Capabilities |
| --- | --- |
| Products | List own products; update fields/stock/images; add via `/seller/new` + `createProduct` |
| Categories | Seller-private categories CRUD |
| Discounts | Create/toggle seller `DiscountCode`s |
| Delivery settings | Standard/express/pickup toggles, days, fees |
| GST | Required seller GSTIN for checkout display |
| QR | Upload/set payment QR image URL |
| Orders | Seller order table; status updates; mark payment received; invoice modal |

### Out of scope

- Multi-warehouse inventory.
- Automated shipping label purchase.
- Marketplace advertising bids.

---

## 3. Manager portal (`/manager`)

**Actions:** `manager.ts`

### In scope

- Authenticated manager profile for the default store.
- Overview metrics / summary suitable for floor leadership (bookings/orders high-level).
- Navigation affordances toward `/store` for detailed merchandising & roster work.

### Out of scope

- Full HR / payroll.
- Replacing `/store` panels (manager overview complements, does not duplicate every panel).

---

## 4. Groomer portal (`/groomer`)

**Actions:** `groomer.ts` · **UI:** `GroomerDashboard`

### In scope

- Resolve linked `StaffMember` of type `GROOMER`.
- Day board for selected date (default today).
- Booking rows: customer, service, time, status, notes.
- Status transitions implemented by `updateGroomerBookingStatus`.

### Guardrails

- Users without groomer portal membership are redirected/blocked.
- Cannot see other staff vertical’s clinic board here.

---

## 5. Doctor portal (`/doctor`)

**Actions:** `doctor.ts` · **UI:** `DoctorDashboard`

### In scope

- Parallel to groomer for `StaffType.DOCTOR` / clinic bookings.
- Day board + status updates via `updateDoctorBookingStatus`.

### Out of scope

- Full medical charting beyond booking notes and customer pet records.

---

## 6. Delivery portal (`/delivery`)

**Actions:** `delivery.ts` · **UI:** `DeliveryDashboard`

### In scope

| Capability | Detail |
| --- | --- |
| Profile | Delivery user identity |
| Assignments | Orders where `deliveryBoyId` = current user |
| Run status | Update fulfillment-related order status as allowed |
| COD confirm | `markDeliveryPaymentReceived` with role stamp `DELIVERY` |

### Assignment source

- Admin assigns delivery boys to orders (`assignOrderDeliveryBoy`).

### Out of scope

- Live GPS tracking map.
- Route optimization.
- Driver chat.

---

## 7. Shared UX requirements

- Clean, single-purpose dashboards (avoid dense card grids).
- Clear empty states when no assignments/bookings.
- Optimistic-enough feedback after server actions (revalidate/refresh).
- No privilege escalation via client-only checks — all mutations re-check session role/membership.

---

## 8. Acceptance checklist

- [ ] `seller@…` reaches `/seller` and can edit own catalog.
- [ ] `manager@…` reaches `/manager`; non-managers are redirected.
- [ ] `groomer@…` sees grooming day board only.
- [ ] `doctor@…` sees clinic day board only.
- [ ] `delivery@…` sees only assigned orders; can mark COD.
- [ ] Demoting a seller/admin removes portal access on subsequent navigation.

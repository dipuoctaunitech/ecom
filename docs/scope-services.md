# Scope — Grooming & Clinic Services

**Verticals:** `ServiceVertical.GROOMING`, `ServiceVertical.CLINIC`  
**Public routes:** `/grooming`, `/clinic`  
**Staff routes:** `/groomer`, `/doctor`, `/store` (roster / services / time frames)  
**Key actions:** `booking.ts`, `store-services.ts`, `store-roster.ts`, `store-timeframes.ts`, `groomer.ts`, `doctor.ts`

---

## 1. Goals

- Let customers book time with a groomer or doctor against real availability.
- Let store ops define services, combos, staff assignments, weekly rosters, exceptions, and time frames.
- Give groomers/doctors a focused day board to complete or cancel appointments.

---

## 2. Domain model (in scope)

| Entity | Responsibility |
| --- | --- |
| `Store` | Tenant root (single default store in v1) |
| `StaffMember` | Groomer/doctor profile; optional linked `userId` for portal login |
| `BookableService` | Named service with duration, price, compare-at, loyalty, image, active/sort |
| `ServiceComboItem` | Package service composed of base services (`isCombo`) |
| `StaffService` | Which staff can perform which services |
| `WeeklyRoster` | Per weekday open window + slot duration |
| `RosterException` | Day OFF or CUSTOM_HOURS override |
| `ServiceTimeFrame` | Vertical open windows mapped to staff |
| `TimeFrameStaff` | Staff assigned to a time frame |
| `Booking` | Customer appointment with status lifecycle |

### Booking status

`PENDING` → `CONFIRMED` → `COMPLETED`  
Also: `CANCELLED`, `NO_SHOW`

---

## 3. Public booking flow

**Components:** `ServiceVerticalPage`, `BookingFlow`

### Steps (in scope)

1. Browse active services for the vertical (including combo packages).
2. Select service → eligible staff (intersection of staff↔service and active staff).
3. Request available slots (`getAvailableSlots`) for a date:
   - Respect weekly roster / exceptions.
   - Respect time frames when configured.
   - Exclude overlapping bookings.
   - Honor slot duration (service duration and frame/roster step).
4. Submit booking (`createBooking`) with optional notes.
5. Customer can list and cancel eligible bookings from account (`cancelCustomerBooking`).

### Rules

- Customer must be authenticated.
- Cannot book inactive services or inactive staff.
- Slot generation is store-local clock strings `"HH:mm"` (no multi-timezone UI in v1).
- Overbooking the same staff interval is rejected server-side.

---

## 4. Store operations for services

Managed on `/store` panels:

### Services (`StoreServicesPanel`)

- CRUD bookable services per vertical.
- Set duration, prices, loyalty, image, active, sort.
- Mark combo + attach included services.
- Assign which staff members offer each service.

### Time frames (`StoreTimeFramesPanel`)

- Create named windows (start/end, slot step, daysOfWeek, vertical).
- Activate/deactivate; assign staff links.
- Drive or constrain public availability alongside roster.

### Roster (`StoreRosterPanel`)

- Weekly hours per staff member.
- Day assignments / exceptions (OFF, custom hours).
- Reassign bookings between staff.
- Update booking status from the ops board.
- Live visibility of upcoming bookings for the store.

---

## 5. Staff portals

### Groomer (`/groomer`)

- Access only if user has groomer store membership / linked staff profile.
- Day board of assigned grooming bookings.
- Update booking status (confirm/complete/cancel/no-show as implemented).

### Doctor (`/doctor`)

- Parallel clinic day board and status updates.

**Out of scope for staff portals**

- Editing services or global roster (that stays on `/store` / manager tools).
- Clinical EMR beyond booking notes / customer pet profiles.

---

## 6. Customer pets linkage

- Pet profiles live on the buyer account (`CustomerPet`).
- Booking notes may reference pets; deep pet↔booking foreign key is optional/not required for v1 unless already wired.
- Pet fields in scope for account UX: species, breed, sex, DOB, weight, color, microchip, vaccine/deworm dates, diagnosis, licenses, insurance, notes, image.

---

## 7. Acceptance checklist

- [ ] Seed creates groomers, doctors, services, roster, and sample bookings.
- [ ] `/grooming` and `/clinic` list active services with offer pricing when set.
- [ ] Slot picker only shows free intervals for the selected staff/date.
- [ ] Created booking appears on groomer/doctor day board and customer account.
- [ ] Status updates from staff portal reflect on subsequent loads.
- [ ] Combo services book as a single appointment against the combo `BookableService`.

---

## 8. Out of scope

- Recurring appointments / membership care plans.
- Multi-room resource booking (only staff time is the scarce resource).
- Customer-facing waitlist.
- Telemedicine video sessions.
- Insurance claim filing.

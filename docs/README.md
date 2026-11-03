# Namma pets Club — Documentation Index

Product and engineering scope for the **Namma pets Club** ecommerce + pet-care platform (`ecom`).

## Documents

| Document | Purpose |
| --- | --- |
| [SCOPE.md](./SCOPE.md) | Master product scope, goals, surfaces, roles, and boundaries |
| [scope-customer.md](./scope-customer.md) | Customer (buyer) journeys: shop, account, pets, bookings |
| [scope-commerce.md](./scope-commerce.md) | Catalog, cart, checkout, orders, payments, discounts |
| [scope-services.md](./scope-services.md) | Grooming & clinic booking, roster, time frames, combos |
| [scope-staff-portals.md](./scope-staff-portals.md) | Seller, manager, groomer, doctor, delivery dashboards |
| [scope-admin-store.md](./scope-admin-store.md) | Admin console and floor `/store` operations board |
| [scope-technical.md](./scope-technical.md) | Architecture, auth, data model, infra, security |
| [scope-mobile.md](./scope-mobile.md) | Mobile app status and planned parity |
| [DEMO.md](./DEMO.md) | Demo accounts, routes, and walkthrough checklist |

## Brand

- **Name:** Namma pets Club  
- **Tagline:** Pets · Care · Community  
- **Primary web app:** `/web` (Next.js App Router)

## Quick mental model

```
Customer storefront ──► Pet Items / Grooming / Clinic
        │
        ├── Account (profile, pets, orders, bookings)
        └── Checkout + COD / receipt flow
                 │
Staff & ops ◄────┘
  ADMIN · SELLER · MANAGER · GROOMER · DOCTOR · DELIVERY
  + /store live floor board
```

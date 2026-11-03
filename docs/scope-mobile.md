# Scope — Mobile App

**Path:** `/mobile`  
**Stack (intended):** Expo + Expo Router + React Native  
**Current status:** Scaffold only (empty `app/` and `components/` placeholders)

---

## 1. Current state

| Item | Status |
| --- | --- |
| `mobile/package.json` | Present (Expo baseline) |
| `mobile/tsconfig.json` | Present |
| Screens / navigation | Not implemented (`.gitkeep` only) |
| Shared types consumption | Not wired |
| Auth against NextAuth | Not implemented |

The **web app is the demo-critical surface**. Mobile is reserved for a follow-on parity track.

---

## 2. Target scope (future)

When mobile work starts, aim for feature parity on the customer path first:

1. Brand landing + Pet Items browse  
2. Product detail + cart  
3. Auth (credentials) + account/pets  
4. Checkout / order list  
5. Grooming & clinic booking  

Staff portals (admin/seller/groomer/doctor/delivery) are **secondary** on mobile unless a handheld floor-ops need is prioritized.

---

## 3. Mobile coding constraints (when building)

- React Native primitives only (`View`, `Text`, `TouchableOpacity`, etc.) — never web HTML tags.
- Expo Router file-based navigation.
- State: `useState` / Context (Zustand optional later).
- Styling: NativeWind or StyleSheet; match web brand tokens where practical.
- Reuse `shared/types.ts` DTOs; call the same backend (Postgres via a future BFF or existing server actions/API) — do **not** invent a second source of truth.

---

## 4. Out of scope for current release

- Publishing to App Store / Play Store.
- Push notifications.
- Offline-first sync.
- Camera-based pet document scanning.

---

## 5. Acceptance (future milestone)

- [ ] Customer can browse seeded products on iOS/Android simulators.
- [ ] Customer can sign in with seed buyer and place an order.
- [ ] Customer can book a grooming slot visible on web groomer board.

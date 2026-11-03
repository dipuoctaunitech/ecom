# Scope — Technical Architecture

**Apps:** `web/` (Next.js 15), `mobile/` (Expo scaffold), `shared/` (types + mock catalog)  
**Data:** PostgreSQL 15 + Prisma 7  
**Auth:** NextAuth v4 (Credentials + JWT)  
**Assets:** MinIO (S3-compatible) via AWS SDK

---

## 1. Repository layout

```
ecom/
├── docs/                 # Scope & demo docs (this folder)
├── prisma/               # schema.prisma, migrations/, seed.ts
├── shared/               # types.ts, mockData.ts (shared shapes)
├── web/                  # Next.js App Router storefront + portals
│   ├── app/              # pages, server actions, API routes
│   ├── components/       # UI by domain
│   ├── lib/              # auth, prisma, payments, roster helpers…
│   ├── store/            # Zustand cart
│   └── middleware.ts     # Role-aware route protection
├── mobile/               # Expo placeholders (not feature-complete)
├── docker-compose.yml    # postgres + minio
└── .env.example          # required secrets template
```

---

## 2. Runtime stack (web)

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 App Router, React 19 |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react |
| Client state | Zustand (cart) |
| Server I/O | Server Actions under `web/app/actions/*` |
| ORM | Prisma Client (generated into `web/node_modules/.prisma/client`) |
| DB driver | `pg` + `@prisma/adapter-pg` |
| Auth | next-auth Credentials provider, JWT sessions (8h) |
| Objects | `@aws-sdk/client-s3` against MinIO |

---

## 3. Environment

Required (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (compose maps `5433→5432`) |
| `NEXTAUTH_URL` | Public origin |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_INTERNAL_URL` | Optional loopback origin for middleware session fetch |
| `MINIO_*` / bucket | Upload endpoint + credentials |
| `SEED_PASSWORD` | Seed script password (≥12 chars) |
| `POSTGRES_PASSWORD`, `MINIO_ROOT_*` | Compose bootstrap |

**Do not commit** real `.env` secrets.

---

## 4. Auth & security scope

### In scope

- Email/password login with bcrypt (cost 12).
- Dummy hash compare for unknown emails (timing safety).
- Per-email and per-IP login rate limits.
- JWT carries `id` + `role`; callbacks re-check DB role and revoke/demote privileged sessions.
- Middleware:
  - Protects `/admin`, `/seller`, `/delivery`, `/manager`, `/store`, and signed-in areas.
  - Resolves **live** role via internal `/api/auth/session` when possible; falls back to JWT if fetch fails.
- Server actions re-validate session before mutations (`auth-guards.ts` helpers).
- Upload route enforces authentication and role constraints.

### Out of scope

- OAuth social providers.
- WebAuthn / passkeys.
- Full WAF / bot management.
- Formal threat model documentation beyond these controls.

---

## 5. Data & migrations

- All durable domain state lives in Postgres.
- Schema evolution via `prisma/migrations/*` (commerce, roster/booking, delivery role, GST, offers, etc.).
- `prisma/seed.ts` upserts demo users, store, catalog, services, roster, and sample bookings/orders.
- Shared TypeScript `Product` type is the UI DTO; DB rows map through `web/lib/products.ts` (`toProduct`).

### Multi-tenancy stance

- `Store` is the tenant root; booking/roster entities are `storeId`-scoped from day one.
- v1 operates a **single default store**; multi-store admin UX is deferred.

---

## 6. Media pipeline

1. Client uploads via `/api/upload` (authenticated).
2. Object stored in MinIO bucket.
3. Public/product UI may use Unsplash URLs (seed) or proxied `/api/images/[...path]`.

---

## 7. Local development (expected)

```bash
# from repo root
cp .env.example .env   # fill secrets
docker compose up -d
# run prisma migrate + seed (project’s usual tsx/prisma scripts)
cd web && npm run dev
```

Exact seed/migrate npm scripts may live at repo root or be invoked via `npx prisma` / `tsx prisma/seed.ts` depending on operator preference — document operational runbooks separately if needed.

---

## 8. Quality bar

- TypeScript throughout web.
- Client components marked `'use client'`.
- Prefer server components for data fetching pages.
- Production-feel UI: restrained layouts, brand-forward landing, purposeful motion where already present.
- Lint with `npm run lint` inside `web/`.

---

## 9. Explicit non-goals (engineering)

- Replacing Postgres with mock-only Zustand catalogs for the web demo.
- Adding a separate Nest/Express API layer.
- GraphQL.
- Kubernetes manifests (compose is enough for demo infra).

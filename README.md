# EZOKO Purchase Order App (Shopify Embedded)

Production-ready Shopify embedded app for Purchase Order CRUD, built with Next.js App Router + TypeScript + Postgres + Prisma, designed for Railway deployment.

## Stack
- Next.js (App Router)
- TypeScript
- ESLint
- Postgres + Prisma ORM + SQL migrations
- Shopify Admin GraphQL API
- OAuth 2.0 token exchange
- Polaris Web Components + App Bridge Web Components

## Features
- Embedded app shell for Shopify Admin
- Homepage (`/`) with centered EZOKO logo only
- Purchase Order creation (`/purchase-orders/new`)
- Purchase Order list + filtering/sorting + check-in (`/purchase-orders`)
- Purchase Order modification (`/purchase-orders/[poNumber]/edit`)
- Shopify vendor/product/variant integrations
- SKU validation against Shopify variants
- Vendor cache for performance
- User default filter/sort preferences persisted in DB
- Authenticated API routes with CSRF protection
- Access-token encryption at rest
- Admin GraphQL retry/backoff for throttling/rate limits

## File Tree
```text
.
├── app
│   ├── api
│   │   ├── auth
│   │   │   ├── csrf/route.ts
│   │   │   └── token-exchange/route.ts
│   │   ├── purchase-orders
│   │   │   ├── [poNumber]
│   │   │   │   ├── check-in/route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── shopify
│   │   │   ├── products
│   │   │   │   ├── [productId]/variants/route.ts
│   │   │   │   └── search/route.ts
│   │   │   ├── variants/validate-sku/route.ts
│   │   │   └── vendors/route.ts
│   │   └── user-prefs/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── purchase-orders
│       ├── [poNumber]/edit/page.tsx
│       ├── new/page.tsx
│       └── page.tsx
├── components
│   ├── app-nav.tsx
│   ├── purchase-order-create-page.tsx
│   ├── purchase-order-edit-page.tsx
│   ├── purchase-order-form.tsx
│   └── purchase-order-list-page.tsx
├── lib
│   ├── auth
│   │   ├── csrf.ts
│   │   ├── require-auth.ts
│   │   └── session-token.ts
│   ├── client
│   │   ├── api.ts
│   │   └── hooks.ts
│   ├── constants.ts
│   ├── crypto/token-encryption.ts
│   ├── env.ts
│   ├── http.ts
│   ├── po/service.ts
│   ├── prisma.ts
│   ├── shopify
│   │   ├── catalog.ts
│   │   ├── graphql.ts
│   │   └── token-exchange.ts
│   └── validation
│       ├── po.ts
│       ├── prefs.ts
│       └── utils.ts
├── prisma
│   ├── migrations
│   │   ├── 20260213190000_init/migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── tests/validation.test.ts
├── .env.example
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Required Environment Variables
Copy `.env.example` to `.env` and set values:

- `DATABASE_URL` Postgres connection string
- `SHOPIFY_API_KEY` App key from Shopify Partner Dashboard
- `SHOPIFY_API_SECRET` App secret
- `SHOPIFY_APP_URL` Public app URL (Railway domain)
- `SHOPIFY_SCOPES` App scopes (default: `read_products`)
- `SHOPIFY_API_VERSION` Admin API version (default: `2025-10`)
- `TOKEN_ENCRYPTION_KEY` Base64-encoded 32-byte key

Generate encryption key:
```bash
openssl rand -base64 32
```

## Local Setup
```bash
npm install
cp .env.example .env
# configure .env values
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Railway Deployment
1. Create a Railway project.
2. Add a Postgres service.
3. Add a web service from this repository.
4. Set environment variables from `.env.example`.
5. Set build/start commands:
   - Build: `npm run build`
   - Start: `npm run start`
6. Ensure migration command runs on deploy (pre-deploy or release phase):
   - `npm run prisma:migrate`
7. Set `SHOPIFY_APP_URL` to Railway public domain.
8. Update Shopify app URLs in Partner Dashboard to match Railway domain.

## Shopify Partner Dashboard Setup
Configure your app:
- **App URL**: `https://<your-domain>`
- **Allowed redirection URLs**: include your app domain routes used for auth/session bootstrap
- **Embedded app**: enabled
- **Admin API scopes**: at minimum `read_products` (add more if your org requires)

The app uses App Bridge session tokens and OAuth 2.0 token exchange to persist offline access tokens per shop.

## Database Notes
`po_header` and `po_item` exactly follow `table_schema.md` rules:
- `po_header.po_number` is `GENERATED ALWAYS AS IDENTITY`
- app never assigns `po_number` manually
- `po_item` composite PK preserved: (`po_number`, `po_item`)
- enum-like rules and currencies enforced via DB CHECK constraints + zod
- numeric precision uses `numeric(12,2)`
- index set matches schema requirements

Additional support tables:
- `shop_installation` (encrypted Shopify tokens)
- `shopify_vendor_cache` (vendor cache)
- `user_prefs` (default filters/sorting)
- `po_shop_scope` (shop tenancy mapping without modifying PO table schema)

## Schema Enforcement Notes
Prisma cannot express every business CHECK constraint directly as first-class schema metadata for existing text columns. Enforcement is applied as follows:

- Enforced in DB migration SQL (`CHECK`):
  - `po_header.status` allowed values
  - `po_header.Import_type` allowed values
  - `po_header.shipping_fees >= 0`
  - currency constraints for header and item
  - `po_item.order_qty >= 1`
  - `po_item.received_qty >= 0`
  - `po_item.unit_cost >= 0`
  - `po_item.status` allowed values
  - `po_item.coo` length check
  - `po_item.received_qty <= po_item.order_qty`

- Enforced in API layer (zod + service checks):
  - Input shape and type safety
  - Enum/currency restrictions
  - COO length = 2
  - Monetary non-negative and 2-decimal validations
  - `received_qty <= order_qty` preserved during updates

## Security
- All API endpoints require authenticated Shopify session token.
- CSRF protection for mutating endpoints using signed CSRF tokens.
- Shopify access tokens encrypted at rest using AES-256-GCM.
- Auth/session validation done server-side.

## Scripts
- `npm run dev` start dev server
- `npm run build` build app
- `npm run start` start production server
- `npm run lint` run ESLint
- `npm run typecheck` run TypeScript checks
- `npm run test` run unit tests (validation)
- `npm run prisma:generate` generate Prisma client
- `npm run prisma:migrate:dev` run local migrations
- `npm run prisma:migrate` run deploy migrations

## Assumptions
- `table_schema.md` governs PO table definitions only; support tables were added as required for auth, caching, tenancy, and user prefs.
- `po_item.unit_cost_currency` nullability in source was not explicit; implemented as `NOT NULL DEFAULT 'CAD'` per schema recommendation.
- Shopify “vendor list” is derived from distinct `product.vendor` values and cached in `shopify_vendor_cache`.
- Shopify session token `sub` claim is used as `creation_user` / `last_modification_user`; fallback is shop domain.
- PO list and detail views are tenant-scoped through `po_shop_scope` because PO source tables do not contain a shop column.
- App Bridge/Polaris web components are loaded from Shopify CDN scripts in the root layout.

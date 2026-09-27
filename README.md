# Kelmon

**Campus fashion, beauty and salon platform for Kenya.**
Next.js 15 · Supabase · M-Pesa

Kelmon sells bags, perfumes, fashion accessories and nail products to university
students, delivered to campus drop points and paid for with M-Pesa. It also
lists salon services — nails, lashes, brows, makeup.

📚 **Technical documentation: [`docs/`](docs/README.md)**

---

## Contents

- [What's in here](#whats-in-here)
- [Features](#features)
- [Stack](#stack)
- [Setup](#setup)
- [Scripts](#scripts)
- [Project layout](#project-layout)
- [How it works](#how-it-works)
- [Security](#security)
- [Documentation map](#documentation-map)
- [Provenance](#provenance)
- [Status and known gaps](#status-and-known-gaps)

---

## What's in here

This repository previously held **two separate projects in one folder**: Kelmon
(a Next.js storefront) and **EzyBite** (a vanilla HTML + Firebase food-delivery
app, complete with its own admin panel and M-Pesa backend).

They have been merged into one Next.js application:

- EzyBite's **storefront was removed** — Kelmon's replaces it.
- EzyBite's **admin panel and backend were ported** to Next.js + Supabase and
  re-skinned for Kelmon.
- The database moved from Firestore to **Supabase Postgres with Row Level
  Security**.
- Auth moved from Firebase Auth to **Supabase Auth** with Google sign-in.
- The two M-Pesa implementations were **merged into one**.

There are no HTML files left; it is a single Next.js app. See
[Provenance](#provenance) for the file-by-file mapping. The pre-merge state is
preserved in the first Git commit, so nothing removed is lost.

---

## Features

### Storefront
- Product catalogue with categories, search, and size/colour variants
- Cart with a free-delivery threshold (KES 3,000) and a flat fee below it
- Checkout with M-Pesa STK Push or cash on delivery
- Order history and live payment status
- Kelmon Points loyalty scheme, awarded on paid orders
- Product reviews with ratings
- Salon service listings
- Google and email/password sign-in
- Light/dark theme, mobile-first, bottom nav on small screens

### Admin panel (`/admin`)
- Dashboard: order counts, revenue, pending queue
- Orders: search, filter, expand line items, change fulfilment and payment
  status, create direct road-sale orders
- Products: full CRUD with image upload, sizes, colours, stock, sale prices
- Statistics: 7-day order and revenue charts, payment-outcome breakdown
- Deals, updates and review moderation
- Successful and failed payment ledgers with M-Pesa receipts and failure reasons

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth — Google OAuth + email/password |
| File storage | Supabase Storage |
| Payments | M-Pesa STK Push (Safaricom Daraja) |

**Why Supabase Auth rather than Firebase Auth** — Google sign-in is free on both,
so cost did not decide it. Supabase Auth issues the JWT that Row Level Security
reads, so authorisation rules live in the schema rather than in app code. Pairing
Firebase Auth with a Supabase database would mean signing a custom JWT and
bridging it into every policy — a bug there is an authorisation bug across every
table at once. Full reasoning in
[docs/architecture.md](docs/architecture.md#1-supabase-auth-over-firebase-auth).

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Run it immediately (no database needed)

```bash
cp .env.example .env.local
npm run dev
```

The app runs **unconfigured**: pages render with sample data and you can reach
the admin panel with a test login. Nothing is saved.

**Test admin login** at `/signin`:

| Field | Value |
|---|---|
| Email | `admin@gmail.com` |
| Password | anything 6+ characters |

Then open `/admin`. This fallback is disabled in production and whenever
Supabase is configured — see [Security](#security).

### 3. Create the Supabase project

Create one at [supabase.com](https://supabase.com), then apply the schema —
either paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
into the dashboard SQL editor, or:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 4. Configure environment

Fill in `.env.local` from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

The anon key is public by design — it ships to the browser and RLS is what
protects data. **The service-role key bypasses RLS and must never carry a
`NEXT_PUBLIC_` prefix.**

Full variable list: [docs/environment.md](docs/environment.md).

### 5. Enable Google sign-in

1. **Google Cloud Console → Credentials** → new OAuth 2.0 Web client.
   Authorised redirect URI — this is *Supabase's* callback, not your app's:
   `https://<ref>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Providers → Google** → paste the client ID and
   secret.
3. **Supabase → Authentication → URL Configuration → Redirect URLs** → add
   `http://localhost:3000/auth/callback` and your production equivalent.

Details: [docs/google-oauth.md](docs/google-oauth.md).

### 6. Seed, then grant yourself admin

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

This loads the products and salon services. The admin grant at the bottom of
that file needs your account to exist first, so **sign in once**, then edit the
email in `supabase/seed.sql` and re-run it (it is idempotent).

`profiles.role` is deliberately not client-writable — the RLS policy re-reads the
stored row, so nobody can promote themselves. The first admin must be granted
with the service role.

### M-Pesa in development

Safaricom must reach your callback over public HTTPS:

```bash
npx ngrok http 3000
# MPESA_CALLBACK_URL=https://<id>.ngrok-free.app/api/mpesa/callback
```

Leave `MPESA_TILL_NUMBER` blank for Paybill; set it to collect on a till, which
switches `PartyB` to the till and the transaction type to
`CustomerBuyGoodsOnline`. Without M-Pesa credentials, STK Push returns 503 and
cash on delivery still works. See [docs/mpesa.md](docs/mpesa.md).

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Run `typecheck` before committing — the Supabase types are hand-written, so it is
what catches schema drift.

---

## Project layout

```
app/
  (storefront)      /, shop, product/[id], salon, cart, checkout,
                    orders, profile, about, contact, signin
  admin/            dashboard, orders, products, stats, deals,
                    updates, reviews, transactions[/failed]
  admin/actions.ts  all admin mutations as Server Actions
  api/
    orders/         create an order (re-prices server-side)
    mpesa/stk-push/ start a payment
    mpesa/callback/ Safaricom result handler
  auth/callback/    OAuth code exchange
components/
  admin/            AdminShell, per-screen managers, BarChart
  providers/        Auth, Cart, Theme, Toast
  home|shop|product|layout|salon|orders|ui/
lib/
  supabase/         client, server, types, products, orders,
                    content, stats, salon
  mpesa.ts          STK Push
  products.ts       Product type, row mapper, formatKes
  cart.ts           cart maths, delivery fee, variant options
  dev-auth.ts       development-only login fallback
  dev-fixtures.ts   development-only sample data
middleware.ts       session refresh + /admin gate
supabase/
  migrations/0001_init.sql
  seed.sql
docs/
```

---

## How it works

### Placing an order

1. Checkout POSTs the cart to `/api/orders`.
2. The route **re-prices every line** against the `products` table and
   recomputes the delivery fee. Client-supplied money is discarded.
3. The order and its line items are inserted. RLS pins the new row to
   `pending` / `unpaid`.
4. For M-Pesa, the client calls `/api/mpesa/stk-push`, which reads the amount
   **from the order row**, not the request.
5. Safaricom calls `/api/mpesa/callback`, which marks the order paid and awards
   loyalty points.

### Reaching the admin panel

Four checks: middleware, the admin layout, `requireAdmin()` in each Server
Action, and finally RLS. The first three are redundant by design; RLS is the
guarantee.

Full flows and all design decisions: [docs/architecture.md](docs/architecture.md).

---

## Security

- **RLS on every table.** The anon key ships to the browser, so anyone can query
  the REST API directly — route handlers are not the security boundary, RLS is.
- **Privilege escalation is blocked in the schema.** `profiles.role` and
  `loyalty_points` are not client-writable: the update policy re-reads the stored
  row and requires both unchanged.
- **Money is never trusted from the client.** `/api/orders` re-prices every line;
  `/api/mpesa/stk-push` takes no amount at all.
- **Order status is pinned on insert**, so a client cannot open an order that
  claims to be paid. Promotion to paid happens only in the callback, via the
  service role.
- **Loyalty points are awarded in Postgres** and are idempotent — a duplicate
  M-Pesa callback cannot double-award.
- **The development login cannot reach production.** It requires *both*
  `NODE_ENV !== "production"` **and** Supabase being unconfigured; the role is
  re-derived from the email server-side, so a forged cookie grants nothing.
  Verified against a real production build: the endpoint 404s and the cookie is
  ignored.

Trust boundaries and the full model: [docs/security-model.md](docs/security-model.md).
Open risks: [docs/known-issues.md](docs/known-issues.md).

---

## Documentation map

| Document | Covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | **The whole architecture design** and all five design decisions |
| [docs/data-model.md](docs/data-model.md) | Every table, column, function and trigger |
| [docs/row-level-security.md](docs/row-level-security.md) | RLS policies table by table |
| [docs/api-reference.md](docs/api-reference.md) | Route handlers and status codes |
| [docs/server-actions.md](docs/server-actions.md) | Admin mutations |
| [docs/migrations.md](docs/migrations.md) | Applying and writing migrations |
| [docs/mpesa.md](docs/mpesa.md) | STK Push, callbacks, troubleshooting |
| [docs/google-oauth.md](docs/google-oauth.md) | Google sign-in setup |
| [docs/environment.md](docs/environment.md) | Every environment variable |
| [docs/local-development.md](docs/local-development.md) | Running locally, gotchas |
| [docs/deployment.md](docs/deployment.md) | Production checklist |
| [docs/security-model.md](docs/security-model.md) | Trust boundaries |
| [docs/known-issues.md](docs/known-issues.md) | Open risks with fixes |
| [docs/admin-panel.md](docs/admin-panel.md) | Operator guide |
| [docs/managing-products.md](docs/managing-products.md) | Catalogue guide |

---

## Provenance

What happened to each part of EzyBite:

| EzyBite | Became |
|---|---|
| `index.html`, `pages/`, `js/app.js`, `js/ui-components.js`, `assets/` | Deleted — storefront replaced by Kelmon's |
| `admin/*.html` + `admin-shell.js` | `app/admin/*` + `components/admin/AdminShell.tsx` |
| `admin/admin-auth.js` (hardcoded email list, client-side gate) | `middleware.ts` + `app/admin/layout.tsx` + `profiles.role` |
| `js/firebase-service.js` (`window.fb_*`) | `lib/supabase/*` + `app/admin/actions.ts` |
| `js/auth.js` (`getAuthErrorMessage`) | `authErrorMessage()` in `AuthProvider.tsx` |
| `api/stkpush.js` | merged into `lib/mpesa.ts` + `app/api/mpesa/stk-push/route.ts` |
| `api/callback.js` | `app/api/mpesa/callback/route.ts` |
| Firestore `users` / `bitePoints` | `profiles` / `loyalty_points` (tiers rescaled for fashion prices) |
| Firestore `customOrders` | `salon_bookings` |
| Chart.js via CDN | `components/admin/BarChart.tsx` — inline SVG, no dependency |
| `robots.txt`, `vercel.json` | `app/robots.ts`, `app/sitemap.ts`; the wildcard CORS config was dropped |
| — | `products` table + admin products CRUD (**new** — EzyBite's menu was hardcoded) |

### Issues found and fixed during the merge

- `package.json` was EzyBite's and had overwritten Kelmon's — no `next`, `react`,
  `tailwindcss` or `typescript` was declared, so the app could never have built.
- `.gitignore` matched neither `.env.local` nor `.env.production`, so the file
  holding the service-role key was committable.
- `/api/orders` stored client-supplied totals.
- `/api/mpesa/stk-push` charged a client-supplied amount.
- M-Pesa timestamps used local-time getters, so the password depended on the
  host's timezone.

---

## Status and known gaps

Working: storefront, admin panel, auth, orders, M-Pesa, products CRUD.

Not finished:

- **Stock is never decremented.** `products.stock` is displayed and editable but
  no order reduces it, so overselling is possible.
- **M-Pesa callbacks are unauthenticated.** Safaricom does not sign them; the
  `CheckoutRequestID` being unguessable is mitigation, not a fix.
- **Salon bookings are not wired up.** The table, RLS and query layer exist, but
  `/salon` is still the waitlist UI — it needs scheduling and availability
  decisions.
- **No automated tests.** RLS policy tests are the highest-value place to start.
- **No rate limiting** and **no admin audit log**.
- **Seed images are borrowed URLs** that will eventually expire; replace with
  real photography.

All eleven open items, with severity and suggested fixes, are in
[docs/known-issues.md](docs/known-issues.md).

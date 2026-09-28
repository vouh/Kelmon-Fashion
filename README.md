# Kelmon

**Campus fashion and beauty platform for Kenya.**
Next.js 15 · Firebase Auth · Supabase · M-Pesa

Kelmon sells bags, perfumes, fashion accessories and nail products to university
students, delivered to campus drop points and paid for with M-Pesa.

📚 **Documentation:** [architecture](docs/architecture.md) · [data model](docs/data-model.md) · [security](docs/security.md) · [design](design.md)

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
- Auth is **Firebase Auth**, registered with Supabase as a third-party provider,
  so Firebase issues the tokens and Supabase's RLS enforces access against them.
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
- Google and email/password sign-in, with profile photo uploads
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
| Auth | Firebase Auth — Google + email/password — as a Supabase third-party provider |
| File storage | Supabase Storage — `product-images`, `deal-images`, `avatars` |
| Payments | M-Pesa STK Push (Safaricom Daraja) |

**How the two halves join** — Supabase is configured with Firebase as a
third-party auth provider, so it validates Firebase ID tokens itself and every RLS
policy reads the Firebase UID straight out of the token. There is no second JWT to
sign and no bridge to maintain, which is what made this workable; authorisation
rules still live in the schema rather than in app code.

Two consequences worth knowing up front: a user id is a Firebase UID, so
`auth.uid()` is unusable and `app_uid()` replaces it; and every token needs a
`role: authenticated` custom claim, without which Supabase treats the caller as
anonymous. Full reasoning in
[docs/architecture.md](docs/architecture.md#6-firebase-auth-as-a-supabase-third-party-provider).

---

## Setup

### 1. Install

```bash
npm install
```

```bash
cp .env.example .env.local
npm run dev
```

The storefront renders without credentials, but **empty, with sign-in disabled**.
There is no offline mode and no sample data — an empty shop means an empty
`products` table. Everything below is needed before the app does anything.

### 2. Create the Firebase project

At [console.firebase.google.com](https://console.firebase.google.com):

1. **Authentication → Sign-in method** → enable **Email/Password** and **Google**.
2. **Authentication → Settings → Authorised domains** → add `localhost` and your
   production domain. Missing this shows up as `auth/unauthorized-domain` when the
   sign-in popup opens.
3. **Project settings → General → Your apps** → register a Web app and copy its
   config into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

All six are public by design — they identify the project and authorise nothing.

### 3. Add the Firebase service account

**Project settings → Service accounts → Generate new private key.** The server
needs this to verify tokens and to write the custom claims RLS reads, so `/admin`
stays closed until it exists.

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@<project>.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----\n"
ADMIN_EMAILS=you@example.com
```

Keep the `\n` escapes and the surrounding quotes — the key arrives as one line and
is unescaped at load. **Never prefix these with `NEXT_PUBLIC_`.** Alternatively set
`FIREBASE_SERVICE_ACCOUNT_JSON` to the whole downloaded file, raw or base64.

`ADMIN_EMAILS` is how the first admin comes to exist: neither the claim nor
`profiles.role` can be self-granted, so one of them has to be seeded from outside
the app.

### 4. Create the Supabase project

Create one at [supabase.com](https://supabase.com) and fill in `.env.local` from
**Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

The anon key is public by design — it ships to the browser and RLS is what
protects data. **The service-role key bypasses RLS and must never carry a
`NEXT_PUBLIC_` prefix.**

Full variable list: [docs/architecture.md](docs/architecture.md#environment-variables).

### 5. Point Supabase at Firebase

**Supabase → Authentication → Third Party Auth → Add provider → Firebase**, and
give it your Firebase **project ID**.

Do not skip this. Without it Supabase rejects every token, and the symptom is not
a sign-in error — sign-in succeeds and then nothing loads, because each query
fails authorisation before RLS is even reached.

### 6. Apply the schema

Paste each file in [`supabase/migrations/`](supabase/migrations/) into the
dashboard SQL editor in numerical order, or:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

0001 creates the schema, 0002 drops the salon tables, and 0003 moves identity to
Firebase and restates every RLS policy. Where 0001 and 0003 disagree, 0003 wins.

### 7. Sign in, then add your catalogue

Restart the dev server — `NEXT_PUBLIC_*` values are inlined at build time and do
not hot-reload — then sign in with the email you put in `ADMIN_EMAILS`. The
`admin` claim and `profiles.role` are both written on that first sign-in, and
`/admin` opens.

Add products at `/admin/products`, images included; they upload straight to the
`product-images` bucket. `supabase/seed.sql` contains no catalogue — only an
optional admin grant by email, for promoting someone who has already signed in.

### M-Pesa in development

Safaricom must reach your callback over public HTTPS:

```bash
npx ngrok http 3000
# MPESA_CALLBACK_URL=https://<id>.ngrok-free.app/api/mpesa/callback
```

Leave `MPESA_TILL_NUMBER` blank for Paybill; set it to collect on a till, which
switches `PartyB` to the till and the transaction type to
`CustomerBuyGoodsOnline`. Without M-Pesa credentials, STK Push returns 503 and
cash on delivery still works. See [docs/architecture.md](docs/architecture.md#m-pesa).

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
  (storefront)      /, shop, product/[id], cart, checkout,
                    orders, profile, about, contact, signin
  admin/            dashboard, orders, products, stats, deals,
                    updates, reviews, transactions[/failed]
  admin/actions.ts  all admin mutations as Server Actions
  api/
    auth/session/   ID token -> claims, profile row, cookie
    orders/         create an order (re-prices server-side)
    mpesa/stk-push/ start a payment
    mpesa/callback/ Safaricom result handler
components/
  admin/            AdminShell, per-screen managers, BarChart
  providers/        Auth, Cart, Theme, Toast
  home|shop|product|layout|orders|ui/
lib/
  firebase/         client SDK, Admin SDK, server identity, cookie
  supabase/         client, server, types, products, orders,
                    content, stats, storage
  mpesa.ts          STK Push
  products.ts       Product type, row mapper, formatKes
  cart.ts           cart maths, delivery fee, variant options
middleware.ts       /admin gate (decode only — see security.md)
styles/design.css   design tokens
supabase/
  migrations/0001_init.sql
  migrations/0002_remove_salon.sql
  migrations/0003_firebase_auth.sql
  seed.sql
docs/
  architecture.md   front end, back end, API, integrations, decisions
  data-model.md     tables, functions, migrations
  security.md       RLS, trust boundaries, known issues
  formal/           reserved
design.md           colours, fonts, components
README.md           this file
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

### Signing in

1. Firebase signs the user in — Google popup or email/password — entirely in the
   browser.
2. `AuthProvider` POSTs the ID token to `/api/auth/session`, which verifies it,
   writes the `role: authenticated` and `admin` custom claims, ensures a
   `profiles` row, and stores the token in an httpOnly cookie.
3. Every Supabase call — browser and server — sends that token as its access
   token. Supabase validates it and RLS reads the Firebase UID out of it.

Custom claims can only be written with the service-account key, so admin can
never be self-granted.

### Reaching the admin panel

Four checks: middleware, the admin layout, `requireAdmin()` in each Server
Action, and finally RLS. The first three are redundant by design; RLS is the
guarantee.

Middleware runs on the Edge runtime and can only *decode* the token, not verify
it — so it decides redirects and nothing else. The admin layout does the real
signature check.

Full flows and all design decisions: [docs/architecture.md](docs/architecture.md).

---

## Security

- **RLS on every table.** The anon key ships to the browser, so anyone can query
  the REST API directly — route handlers are not the security boundary, RLS is.
- **Privilege escalation is blocked in the schema.** `profiles.role` and
  `loyalty_points` are not client-writable: a `BEFORE UPDATE` trigger raises if a
  client changes either.
- **Admin cannot be self-granted.** The `admin` custom claim needs the Firebase
  service-account private key to write, and `profiles.role` needs the Supabase
  service role. The first admin comes from the `ADMIN_EMAILS` allowlist.
- **Money is never trusted from the client.** `/api/orders` re-prices every line;
  `/api/mpesa/stk-push` takes no amount at all.
- **Order status is pinned on insert**, so a client cannot open an order that
  claims to be paid. Promotion to paid happens only in the callback, via the
  service role.
- **Loyalty points are awarded in Postgres** and are idempotent — a duplicate
  M-Pesa callback cannot double-award.
- **Storage writes are policy-controlled.** Product and deal images are
  admin-only; avatars may only be written inside a folder named after the
  caller's own Firebase UID.
- **There is no development auth bypass.** The cookie-based dev login and the
  sample-data fallback have both been removed. They made a misconfigured
  environment look like a working one, which is the opposite of what a fallback
  should do.

Trust boundaries, RLS policies and open risks: [docs/security.md](docs/security.md).

---

## Documentation map

| Document | Covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | **Everything about the front end and back end** — routes, components, providers, styling, middleware, data layer, full API reference, Server Actions, M-Pesa, Firebase Auth setup, environment, local setup, deployment, and all six design decisions |
| [docs/data-model.md](docs/data-model.md) | Every table, column, constraint, function and trigger; migrations and the TypeScript mirror |
| [docs/security.md](docs/security.md) | Trust boundaries, authorisation layers, RLS policies table by table, and 11 open risks with fixes |
| [design.md](design.md) | Colours, typography, spacing, components, theming |

---

## Provenance

What happened to each part of EzyBite:

| EzyBite | Became |
|---|---|
| `index.html`, `pages/`, `js/app.js`, `js/ui-components.js`, `assets/` | Deleted — storefront replaced by Kelmon's |
| `admin/*.html` + `admin-shell.js` | `app/admin/*` + `components/admin/AdminShell.tsx` |
| `admin/admin-auth.js` (hardcoded email list, client-side gate) | `middleware.ts` + `app/admin/layout.tsx` + `profiles.role` |
| `js/firebase-service.js` (`window.fb_*`) | `lib/supabase/*` + `app/admin/actions.ts` |
| `js/auth.js` (`getAuthErrorMessage`) | `authErrorMessage()` in `AuthProvider.tsx` — back to matching `auth/*` codes, since Firebase issues them again |
| `api/stkpush.js` | merged into `lib/mpesa.ts` + `app/api/mpesa/stk-push/route.ts` |
| `api/callback.js` | `app/api/mpesa/callback/route.ts` |
| Firestore `users` / `bitePoints` | `profiles` / `loyalty_points` (tiers rescaled for fashion prices) |
| Firestore `customOrders` | `salon_bookings` — since dropped, in `0002_remove_salon.sql` |
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
- **The catalogue starts empty.** There is no seed data by design — products are
  added in `/admin/products`. A fresh install shows an empty shop until you add
  one.
- **No automated tests.** RLS policy tests are the highest-value place to start,
  and the token path — claims, cookie expiry, third-party auth config — is the
  riskiest untested surface.
- **No rate limiting** and **no admin audit log**.
- **Preset avatar images are borrowed URLs** that will eventually expire; replace
  with real artwork.

All eleven open items, with severity and suggested fixes, are in
[docs/security.md](docs/security.md#known-issues-and-accepted-risks).

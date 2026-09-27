# Local Development

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs **without any configuration**. Pages render with sample data, and
you can reach the admin panel with a test login. Nothing is saved.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server, hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the build (sets `NODE_ENV=production`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Run `typecheck` before committing. The Supabase types are hand-written, so it is
what catches schema drift — see
[database/migrations.md](../database/migrations.md).

## Test login (no database needed)

Go to **`/signin`**:

| Field | Value |
|---|---|
| Email | `admin@gmail.com` |
| Password | anything 6+ characters |

Then open **`/admin`**. The sign-in screen has a link that fills the email in.

Any other email signs in as a customer and is **refused** at `/admin`. The admin
list is in `DEV_ADMIN_EMAILS` in [`lib/dev-auth.ts`](../../lib/dev-auth.ts).

### Why a cookie and not localStorage

The `/admin` gate runs in `middleware.ts` and `app/admin/layout.tsx`, both
server-side, where `localStorage` is unreadable. A localStorage-only test profile
makes the storefront look signed in while `/admin` keeps redirecting.
`/api/dev-auth` sets an `httpOnly` cookie the server can see.

### This cannot reach production

Gated on two independent conditions, either of which disables it:

1. `NODE_ENV !== "production"`
2. Supabase **not** configured

`npm run build && npm start` fails condition 1. Adding real keys fails condition
2. Verified: `/api/dev-auth` returns 404 in production and the cookie is ignored.
Full detail in [ADR-0005](../architecture/decisions/0005-dev-auth-fallback.md).

## Sample data

[`lib/dev-fixtures.ts`](../../lib/dev-fixtures.ts) supplies, on the same gate:

- **8 orders** spread over the last 5 days, deliberately covering every state —
  paid, unpaid, failed, cancelled, awaiting M-Pesa, and one `admin_direct` road
  sale — so badges, the payment-outcome tiles and both transaction pages have
  content, and the 7-day charts plot real bars.
- **6 products** across all four categories, with sizes, colours and stock.
- **6 reviews** spanning 2–5 stars so the rating histogram is not flat.
- 3 deals, 3 updates, 4 salon services.

**Writes do not persist in this mode.** Editing a product or changing an order
status appears to do nothing, because the reads return fixtures. That is
expected; connect Supabase for working writes.

## Working against real Supabase

Follow [environment.md](environment.md), then:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Sign in once, then grant yourself admin (see
[environment.md § First admin](environment.md#first-admin)).

The dev fallback switches off automatically as soon as the keys are present.

### Local Supabase stack

```bash
npx supabase start     # prints local URL and keys for .env.local
npx supabase db reset  # re-apply migrations + seed
npx supabase stop
```

`db reset` drops the database. Never aim it at production.

## M-Pesa locally

Safaricom needs a public HTTPS callback:

```bash
npx ngrok http 3000
# MPESA_CALLBACK_URL=https://<id>.ngrok-free.app/api/mpesa/callback
```

Without credentials, STK Push returns 503 and cash on delivery still works.

## Gotchas

**Port already in use.** Next.js silently picks the next free port — read the
startup output rather than assuming 3000.

**`next dev` and `next build` conflict.** They share `.next`, and running them
together produces confusing `Cannot find module for page: /…` errors that look
like code faults. Stop the dev server before building.

**Functions cannot be passed from Server to Client Components.** The symptom is
a build-time error like `Functions cannot be passed directly to Client
Components`. `BarChart` takes `valueFormat="kes"` instead of a formatter for
exactly this reason.

**Every query types as `never`.** Two causes, both in
[database/migrations.md](../database/migrations.md): a row declared as
`interface` instead of `type`, or an `@supabase/ssr` version mismatch.

**New image host.** Remote images must be allow-listed in
[`next.config.ts`](../../next.config.ts) or `next/image` refuses them.

**Env changes need a restart.** `NEXT_PUBLIC_*` values are inlined at build time.

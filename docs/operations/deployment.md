# Deployment

Target is Vercel, but nothing is Vercel-specific — any Node host that runs
`next build && next start` works. Middleware must be supported, since the
`/admin` gate lives there.

The Ezybite-era `vercel.json` was removed. It applied wildcard CORS
(`Access-Control-Allow-Origin: *`) to `/api/*` to bridge a Netlify storefront
and a Vercel API. There is now one origin, so it was both unnecessary and
needlessly permissive.

## Pre-deploy checklist

### Database
- [ ] `supabase/migrations/0001_init.sql` applied to the production project
- [ ] `supabase/seed.sql` run (or a real catalogue loaded)
- [ ] RLS verified against the checklist in
      [row-level-security.md](../database/row-level-security.md) — in particular
      that a normal user cannot update their own `role`
- [ ] First admin granted

### Environment
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — **no `NEXT_PUBLIC_` prefix**
- [ ] `NEXT_PUBLIC_SITE_URL` — your real origin, or robots/sitemap point at the
      fallback domain
- [ ] M-Pesa: `MPESA_ENV=production` plus production credentials
- [ ] `MPESA_CALLBACK_URL` → `https://<your-domain>/api/mpesa/callback`
- [ ] `MPESA_TILL_NUMBER` set only if collecting on a till

Production M-Pesa credentials differ from sandbox ones. Shipping sandbox keys
with `MPESA_ENV=production` fails every payment.

### Auth
- [ ] Google provider configured in Supabase
- [ ] Redirect URLs include `https://<your-domain>/auth/callback`
- [ ] Supabase **Site URL** set to the production origin

### Verify the dev fallback is inert

The development login must not work in production. Check rather than assume:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com"}' \
  https://<your-domain>/api/dev-auth
# expect 404
```

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  -H 'Cookie: kelmon-dev-session=%7B%22email%22%3A%22admin%40gmail.com%22%2C%22role%22%3A%22admin%22%7D' \
  https://<your-domain>/admin
# expect a redirect, not 200
```

Both are already guaranteed by `NODE_ENV=production` *and* Supabase being
configured, but this is the one control worth confirming on every deploy.

### Build
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run lint`

## Post-deploy smoke test

1. `/` renders with real products (not empty).
2. `/shop` filters by category.
3. `/product/<slug>` renders; `/product/nonsense` 404s.
4. Sign in with Google. `/profile` shows your name.
5. `/admin` as a non-admin → redirected.
6. `/admin` as an admin → dashboard with live data.
7. Place a small real order and pay it. Confirm:
   - the STK prompt arrives,
   - the order flips to `paid` with a receipt number,
   - loyalty points were awarded,
   - it appears under **Successful Payments**.
8. `/robots.txt` and `/sitemap.xml` show your real domain.

Step 7 is the one that matters most, and the one that cannot be verified in
sandbox — the callback has to reach your deployed origin.

## Operational notes

**Admin routes are `force-dynamic`** (`app/admin/layout.tsx`), so they are never
cached or prerendered. Removing that would risk serving one admin's view to
another.

**Middleware runs on nearly every request.** Its matcher excludes Next internals
and static assets; widening it adds latency to image requests for no benefit.

**Revalidation.** Admin writes call `revalidatePath()` for the affected
storefront routes, so a product edit appears without a redeploy.

**Callback reachability is the usual failure.** If orders stay in
`awaiting_mpesa`, Safaricom cannot reach `MPESA_CALLBACK_URL`. It must be public
HTTPS with no auth in front of it.

## Rollback

The app is stateless, so a redeploy of the previous build is a full rollback —
provided no migration ran. Migrations are append-only and not automatically
reversible: if a deploy included one, write a compensating migration rather than
reverting the file, since environments that already applied it will not re-run it.

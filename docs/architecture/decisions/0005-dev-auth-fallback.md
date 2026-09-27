# ADR-0005 — Development-only auth fallback

- **Status:** Accepted
- **Date:** 2026-09-27

## Context

The admin panel could not be reviewed without first creating a Supabase project,
applying migrations, configuring Google OAuth, signing in, and promoting a
profile to admin with the service role. That is a long path before anyone can
look at a screen.

An initial attempt stored a test profile in `localStorage`. That cannot work for
`/admin`: the gate runs in `middleware.ts` and `app/admin/layout.tsx`, both
server-side, and `localStorage` is not readable there. The storefront profile
appeared to work while `/admin` kept redirecting.

Deliberately adding an auth bypass to an application that will handle real
payments needs justification and hard limits.

## Options considered

### A. No fallback — require Supabase
Honest and safest. Also means no one can see the admin panel without
provisioning infrastructure, and reviewing a UI change requires a live database.

### B. A `NEXT_PUBLIC_DEV_ADMIN=true` flag
Rejected. `NEXT_PUBLIC_*` is inlined into the client bundle and can be set in a
production environment as easily as a local one. A single misconfigured
environment variable would disable the admin gate in production.

### C. Cookie session gated on conditions that cannot both hold in production

## Decision

**Option C.** `lib/dev-auth.ts` plus `/api/dev-auth`, enabled only when **both**
are true:

```ts
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !supabaseConfigured();
}
```

Two independent conditions, either of which disables it:

1. `NODE_ENV !== "production"` — `next build` and `next start` set production,
   and it is not overridable from `.env` in a normal deployment.
2. Supabase is **not** configured — the moment real keys exist, the fallback is
   off and the real `profiles.role` check applies with no code change.

A deployed build fails condition 1. A configured local dev server fails
condition 2. Both must fail for the bypass to be live.

Two further constraints:

- **The role is re-derived from the email server-side, never read from the
  cookie.** Editing the cookie to `{"role":"admin"}` grants nothing, because
  `parseDevSession()` discards the supplied role and recomputes it from
  `DEV_ADMIN_EMAILS`.
- **The endpoint returns 404 when disabled**, rather than 403, so it does not
  advertise its own existence.

`lib/dev-fixtures.ts` supplies sample orders, products, reviews, deals and
updates on the same gate, so the panel and charts have content.

## Verification

Checked against a real `next build && next start`, not reasoned about:

| Test | Expected | Result |
|---|---|---|
| `POST /api/dev-auth` in production | 404 | 404 |
| `/admin` + admin cookie in production | redirect | 307 → `/?error=supabase-not-configured` |
| Forged cookie `{"role":"admin"}` in dev | refused | 307 → `/signin` |
| Non-admin email in dev | `customer` | refused |
| `admin@gmail.com` in dev | `admin` | 200 |

## Consequences

**Good**

- The admin panel and storefront are reviewable on a fresh clone.
- Adding real Supabase keys switches it off automatically.
- No production code path depends on it.

**Bad / accepted**

- Auth-adjacent code exists whose only purpose is to be disabled in production.
  It is confined to two files, both named `dev-*`, and the gate is a single
  function.
- Writes do not persist in fallback mode — the admin panel reads fixtures, so
  editing a product appears to do nothing. Potentially confusing; the sign-in
  screen states that nothing is saved.
- `DEV_ADMIN_EMAILS` is a hardcoded list, the same pattern criticised in
  [ADR-0003](0003-admin-panel-in-nextjs.md). Acceptable here only because it
  cannot execute in production, where the database is the authority.

## If this is ever removed

Delete `lib/dev-auth.ts`, `lib/dev-fixtures.ts`, `app/api/dev-auth/route.ts`,
and the `isDevAuthEnabled()` branches in `middleware.ts`,
`lib/supabase/server.ts`, `app/admin/layout.tsx`, and each `lib/supabase/*`
read module. Nothing else depends on it.

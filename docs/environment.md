# Environment Variables

Template: [`.env.example`](../.env.example). Copy to `.env.local`.

```bash
cp .env.example .env.local
```

## Secret handling

`.gitignore` ignores every `.env` variant and un-ignores only the template:

```gitignore
.env
.env.*
!.env.example
```

This was a real gap. The previous patterns were `.env` and `*.env`, which match
neither `.env.local` nor `.env.production` — `.env` matches only that exact name,
and `*.env` matches `foo.env`. The file holding the service-role key was
therefore committable. Verify after touching `.gitignore`:

```bash
git check-ignore -v .env.local    # must report a match
```

## Supabase

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public by design — ships to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | for M-Pesa | **Bypasses RLS. Server-only.** |

Both from **Project Settings → API**.

The anon key being public is fine: it is a *routing* credential, not an
authorisation one. RLS decides what it can read. See
[row-level-security.md](row-level-security.md).

**The service-role key must never carry a `NEXT_PUBLIC_` prefix.** That prefix
inlines the value into the client bundle, which would hand every visitor
unrestricted database access. It is needed only by the M-Pesa callback, which
runs with no user session.

## M-Pesa

| Variable | Required | Notes |
|---|---|---|
| `MPESA_ENV` | no | `sandbox` (default) or `production` |
| `MPESA_CONSUMER_KEY` | yes | Daraja app |
| `MPESA_CONSUMER_SECRET` | yes | |
| `MPESA_SHORTCODE` | yes | HO/store code. Sandbox: `174379` |
| `MPESA_PASSKEY` | yes | |
| `MPESA_TILL_NUMBER` | no | **Only** for till/Buy Goods. Blank for Paybill |
| `MPESA_CALLBACK_URL` | yes | Public HTTPS. Use ngrok locally |
| `MPESA_ACCOUNT_REFERENCE` | no | Default `Kelmon`. Max 12 chars |

Credentials are environment-specific — a production key with
`MPESA_ENV=sandbox` fails. See [integrations/mpesa.md](mpesa.md).

Missing values are reported by the API rather than guessed at:

```json
{ "error": "M-Pesa is not configured.", "missing": ["MPESA_PASSKEY"] }
```

## Site

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | production | Used by `app/robots.ts` and `app/sitemap.ts` |

Without it these fall back to `https://kelmon.co.ke`, so the sitemap will
advertise the wrong origin.

## Google OAuth

No variables. Configured in the Supabase dashboard —
[integrations/google-oauth.md](google-oauth.md).

## Degraded modes

The app is designed not to crash on missing configuration.

| Missing | Behaviour |
|---|---|
| All Supabase vars | Pages render empty; `/admin` uses the dev fallback locally, redirects in production |
| `SUPABASE_SERVICE_ROLE_KEY` | Storefront fine; M-Pesa callback throws when it fires |
| All M-Pesa vars | STK Push returns 503; cash on delivery still works |
| `NEXT_PUBLIC_SITE_URL` | Sitemap/robots use the fallback domain |

Reads degrade to empty and log the cause; writes fail loudly. Silently dropping
a write is worse than an error.

## First admin

`profiles.role` is not client-writable — the RLS policy re-reads the stored row,
so a user cannot promote themselves. The first admin must therefore be granted
outside the app:

1. Apply `supabase/migrations/0001_init.sql`.
2. **Sign in once** through the app, so `auth.users` and `profiles` have a row.
3. Run, as the service role (SQL Editor is fine):

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

`supabase/seed.sql` ends with this statement — edit the email and re-run it; it
is idempotent.

Subsequent admins can be promoted by an existing admin, since the
`"profiles: admin writes all"` policy permits it.

## After changing `.env.local`

Restart the dev server. Next.js reads environment variables at startup;
`NEXT_PUBLIC_*` values are inlined at build time and will not hot-reload.

Note that adding real Supabase keys also **disables the development auth
fallback** — from that point `/admin` requires a genuine `profiles.role = 'admin'`.

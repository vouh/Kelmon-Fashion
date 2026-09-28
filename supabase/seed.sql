-- ============================================================================
-- Kelmon Fashion — seed
--
-- There is no sample catalogue here. Products, deals and updates are real
-- business data and are entered through /admin, which writes to the same tables
-- with the same policies — so an empty storefront is an empty `products` table,
-- and the fix is to add a product, not to run a fixture.
--
-- The demo rows that used to live in this file (8 products lifted from the old
-- hardcoded lib/products.ts, plus the salon services) were removed along with
-- lib/dev-fixtures.ts. They made a fresh database look populated, which hid the
-- difference between "not wired up" and "nothing added yet".
--
-- Run after the migrations:
--   supabase db reset                            (local; migrations then this)
--   psql "$DATABASE_URL" -f supabase/seed.sql    (remote)
--
-- Safe to re-run.
-- ============================================================================

-- ── First admin ─────────────────────────────────────────────────────────────
--
-- Normally you do not need this. Set ADMIN_EMAILS in .env.local and
-- app/api/auth/session/route.ts grants admin on that account's next sign-in,
-- writing both the `admin` custom claim and profiles.role.
--
-- This statement is the fallback for granting admin to someone who has already
-- signed in, without an app restart. profiles.role is deliberately not
-- client-writable (see 0003_firebase_auth.sql), so it has to be done with the
-- service role or as the database owner, which is what running this file gives
-- you.
--
-- The account must have signed in at least once, so that a profiles row exists.
-- The change takes effect for that user on their next token refresh — within
-- the hour, or immediately if they sign out and back in.

update profiles
set role = 'admin'
where email in (
  'info@globalsolutionsug.com'
  -- add more admins here, comma-separated
);

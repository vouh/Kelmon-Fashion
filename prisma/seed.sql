-- ============================================================================
-- Kelmon Fashion — seed
--
-- There is no sample catalogue here, and that is deliberate. Products, deals and
-- updates are real business data, entered through /admin against the same tables
-- with the same policies. So an empty storefront means an empty `products`
-- table, and the fix is to add a product rather than to run a fixture.
--
-- The demo rows this file used to carry — eight products lifted from a hardcoded
-- array, plus salon services — were removed along with lib/dev-fixtures.ts. They
-- made a fresh database look populated, which hid the difference between "not
-- wired up" and "nothing added yet".
--
-- Run after the migration:
--   psql "$DIRECT_URL" -f prisma/seed.sql
--
-- Safe to re-run.
-- ============================================================================

-- ── First admin ─────────────────────────────────────────────────────────────
--
-- Normally you do not need this. Set ADMIN_EMAILS in .env.local and
-- app/api/auth/session/route.ts grants admin on that account's next sign-in,
-- writing both the `admin` custom claim and profiles.role.
--
-- This statement is the fallback for promoting someone who has already signed
-- in, without an app restart. profiles.role is not client-writable — the
-- guard_profile_columns() trigger raises unless the caller is an admin or the
-- service role, and running this file as the database owner is the latter.
--
-- The account must have signed in at least once, so that a profiles row exists.
-- The change reaches Postgres on that user's next token refresh: within the
-- hour, or immediately if they sign out and back in.

UPDATE profiles
SET role = 'admin'
WHERE email IN (
  'info@globalsolutionsug.com'
  -- add more admins here, comma-separated
);

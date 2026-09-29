-- ============================================================================
-- Terms of Service / Privacy Policy acceptance
--
-- Recorded when a customer creates an account (the sign-up form has a required
-- "I agree" checkbox; Google sign-in shows the same notice). The version is
-- the policies' effective date, so a future update can ask people to re-accept.
-- The customer's own row is updated through the existing "profiles: update
-- own" policy.
-- ============================================================================

ALTER TABLE "profiles" ADD COLUMN "terms_accepted_at" TIMESTAMPTZ(6);
ALTER TABLE "profiles" ADD COLUMN "terms_version" TEXT;

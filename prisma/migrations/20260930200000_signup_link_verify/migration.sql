-- The sign-up email also carries a one-click link. Clicking it stamps the
-- challenge as verified; the sign-up window that is waiting on the code then
-- finishes creating the account without the code being typed in.
ALTER TABLE "signup_email_codes" ADD COLUMN "verified_at" TIMESTAMPTZ(6);

-- ============================================================================
-- Account roles: owner, super admins, admins, customers
--
-- * The owner (peterkelvinkibiru1532@gmail.com) is the one protected account:
--   never deleted, never demoted, always a super admin.
-- * Super admins are admins with profiles.super_admin set. Only the owner may
--   grant or revoke it (enforced in app/admin/account-actions.ts); here the
--   column is simply not writable by anyone but the service role.
-- * profiles.role becomes the source of truth for admin rights. A demoted
--   admin's old token still carries `admin: true` for up to an hour, so
--   is_admin() no longer trusts the claim once a profile row exists.
--
-- Keep the owner list in step with lib/auth/protected-accounts.ts.
-- ============================================================================

ALTER TABLE "profiles" ADD COLUMN "super_admin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "profiles" SET role = 'admin', super_admin = true
WHERE lower(email) IN ('peterkelvinkibiru1532@gmail.com', 'monicapeter398@gmail.com');

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_super_admin_is_admin" CHECK (NOT super_admin OR role = 'admin');

-- Monica stays a super admin, but is no longer protected: the owner can demote her.
CREATE OR REPLACE FUNCTION public.is_protected_account(account_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(account_email, ''))) IN (
    'peterkelvinkibiru1532@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_protected_accounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_protected_account(old.email) THEN
    RETURN coalesce(new, old);
  END IF;

  IF tg_op = 'DELETE' THEN
    RAISE EXCEPTION 'The owner account % is protected and cannot be deleted.', old.email;
  END IF;

  IF new.role IS DISTINCT FROM 'admin' OR new.super_admin IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'The owner account % is protected and must stay a super admin.', old.email;
  END IF;

  IF lower(coalesce(new.email, '')) IS DISTINCT FROM lower(old.email) THEN
    RAISE EXCEPTION 'The owner account % is protected; its email cannot be changed.', old.email;
  END IF;

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_protected_accounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_protected_account(new.email) THEN
    new.role := 'admin';
    new.super_admin := true;
  END IF;
  RETURN new;
END;
$$;

-- Roles are changed only through the server (service role), which checks who
-- may promote whom. An admin's own token can no longer rewrite roles directly.
CREATE OR REPLACE FUNCTION public.guard_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.app_is_service() THEN
    RETURN new;
  END IF;

  IF new.role IS DISTINCT FROM old.role OR new.super_admin IS DISTINCT FROM old.super_admin THEN
    RAISE EXCEPTION 'Account roles can only be changed from the admin Accounts page.';
  END IF;

  IF public.is_admin() THEN
    RETURN new;
  END IF;

  IF new.loyalty_points IS DISTINCT FROM old.loyalty_points THEN
    RAISE EXCEPTION 'profiles.loyalty_points is only changed by award_loyalty_points() and redeem_loyalty_points().';
  END IF;

  RETURN new;
END;
$$;

-- The profile row decides; the claim only counts before a profile exists
-- (a brand-new bootstrap admin on their very first request).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = public.app_uid())
      THEN EXISTS (SELECT 1 FROM public.profiles WHERE id = public.app_uid() AND role = 'admin')
    ELSE public.app_is_admin_claim()
  END;
$$;

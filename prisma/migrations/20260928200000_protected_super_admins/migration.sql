-- ============================================================================
-- Protected super admins
--
-- These accounts can never be deleted, demoted from admin, or have their email
-- changed (which would move the protection off them). The rule applies to every
-- caller, the service role and other admins included.
--
-- Keep the list in step with lib/auth/protected-accounts.ts.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_protected_account(account_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(account_email, ''))) IN (
    'peterkelvinkibiru1532@gmail.com',
    'monicapeter398@gmail.com'
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
    RAISE EXCEPTION 'Super admin % is protected and cannot be deleted.', old.email;
  END IF;

  IF new.role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Super admin % is protected and must stay an admin.', old.email;
  END IF;

  IF lower(coalesce(new.email, '')) IS DISTINCT FROM lower(old.email) THEN
    RAISE EXCEPTION 'Super admin % is protected; its email cannot be changed.', old.email;
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER profiles_guard_protected
  BEFORE UPDATE OR DELETE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION public.guard_protected_accounts();

-- Promote protected accounts that already have a profile row.
UPDATE "profiles" SET role = 'admin'
WHERE public.is_protected_account(email) AND role IS DISTINCT FROM 'admin';

-- Promote any protected account on insert too, so it is never briefly a customer.
CREATE OR REPLACE FUNCTION public.promote_protected_accounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_protected_account(new.email) THEN
    new.role := 'admin';
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER profiles_promote_protected
  BEFORE INSERT ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION public.promote_protected_accounts();

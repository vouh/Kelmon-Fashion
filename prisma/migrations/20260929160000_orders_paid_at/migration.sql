-- ============================================================================
-- orders.paid_at: when the order became paid
--
-- Set by a trigger whichever path marks the order paid (the Safaricom
-- callback, the STK status query, or an admin), so the admin order view can
-- say when the money came in. updated_at can't: it moves on every later edit.
-- ============================================================================

ALTER TABLE "orders" ADD COLUMN "paid_at" TIMESTAMPTZ(6);

COMMENT ON COLUMN "orders"."paid_at" IS
  'Set by orders_set_paid_at() when payment_status becomes paid. Never written by clients.';

-- Best available guess for orders already paid; runs before the trigger exists.
UPDATE "orders" SET "paid_at" = "updated_at" WHERE "payment_status" = 'paid';

CREATE OR REPLACE FUNCTION public.set_paid_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.payment_status <> 'paid' THEN
    new.paid_at := NULL;
  ELSIF tg_op = 'INSERT' OR old.payment_status <> 'paid' THEN
    new.paid_at := now();
  ELSE
    new.paid_at := old.paid_at;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER orders_set_paid_at
  BEFORE INSERT OR UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION public.set_paid_at();

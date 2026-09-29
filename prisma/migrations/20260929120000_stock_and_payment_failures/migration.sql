-- ============================================================================
-- Stock tracking and M-Pesa failure log
--
--  1. orders.stock_deducted + a trigger that takes stock off the shelf exactly
--     once, the moment an order becomes paid — whichever path marks it paid
--     (the Safaricom callback, the STK status query, or an admin).
--  2. adjust_product_stock() so an admin can take stock off (or put it back)
--     by hand in one atomic statement.
--  3. payment_failures: one row per failed M-Pesa attempt. The order row only
--     holds the latest result, so a customer who fails twice and then pays
--     would otherwise leave no trace of the failures.
-- ============================================================================

-- 1. Stock deduction on payment ---------------------------------------------

ALTER TABLE "orders" ADD COLUMN "stock_deducted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "mpesa_result_code" INTEGER;

COMMENT ON COLUMN "orders"."stock_deducted" IS
  'Set by orders_deduct_stock() when the order is paid. Never written by clients.';

CREATE OR REPLACE FUNCTION public.deduct_stock_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clients never set this flag themselves; only this trigger flips it.
  IF tg_op = 'INSERT' THEN
    new.stock_deducted := false;
    RETURN new;
  END IF;
  new.stock_deducted := old.stock_deducted;

  IF new.payment_status = 'paid' AND NOT old.stock_deducted THEN
    -- Floors at zero: two customers racing for the last item must not leave
    -- the shelf at -1.
    UPDATE products p
    SET stock = greatest(p.stock - agg.qty, 0)
    FROM (
      SELECT product_id, sum(quantity)::int AS qty
      FROM order_items
      WHERE order_id = new.id AND product_id IS NOT NULL
      GROUP BY product_id
    ) agg
    WHERE p.id = agg.product_id;

    new.stock_deducted := true;
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER orders_deduct_stock
  BEFORE INSERT OR UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_payment();

-- 2. Manual stock adjustment ------------------------------------------------

-- SECURITY INVOKER, so the "products: admin writes" policy is what authorises
-- it: a non-admin's call updates no row and gets null back.
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id text, p_delta integer)
RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE products
  SET stock = greatest(stock + p_delta, 0)
  WHERE id = p_product_id
  RETURNING stock;
$$;

-- 3. Failed payment log -----------------------------------------------------

CREATE TABLE "payment_failures" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id"            TEXT,
  "checkout_request_id" TEXT,
  "result_code"         INTEGER,
  "result_desc"         TEXT,
  "reason"              TEXT NOT NULL,
  "phone"               TEXT,
  "amount"              DECIMAL(10,2),
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "payment_failures_pkey" PRIMARY KEY ("id")
);

-- One row per Safaricom attempt, so a retried callback cannot log twice.
CREATE UNIQUE INDEX "payment_failures_checkout_key"
  ON "payment_failures" ("checkout_request_id")
  WHERE "checkout_request_id" IS NOT NULL;
CREATE INDEX "payment_failures_created_idx" ON "payment_failures" ("created_at" DESC);

ALTER TABLE "payment_failures"
  ADD CONSTRAINT "payment_failures_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Written only by the service role (the callback); admins read it.
ALTER TABLE "payment_failures" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_failures: admin reads" ON "payment_failures"
  FOR SELECT USING (public.is_admin());

CREATE POLICY "payment_failures: admin deletes" ON "payment_failures"
  FOR DELETE USING (public.is_admin());

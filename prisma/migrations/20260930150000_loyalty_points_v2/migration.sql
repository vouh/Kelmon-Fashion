-- ============================================================================
-- Kelmon points, v2
--
-- Per paid order: 5 points, plus 1 for every full KES 100 of the order total,
-- plus 5 more once the order reaches KES 1,000:
--   KES 0–99 → 5 · 100–199 → 6 · 200–299 → 7 … 900–999 → 14
--   KES 1,000–1,099 → 20 · 1,100–1,199 → 21 · and so on.
--
-- Weekly bonus: the first time a customer's paid orders in one week (Monday to
-- Sunday, Nairobi time) add up to KES 1,000 or more, they get 5 points on top,
-- once per week. Each bonus is recorded in loyalty_weekly_bonuses.
--
-- Points are only ever awarded for paid orders, and exactly once per order:
-- a trigger now awards them whenever an order becomes paid (M-Pesa callback,
-- status query, or an admin marking it paid), not just on the M-Pesa path.
--
-- The rules live only in the database; customers just see their points.
-- ============================================================================

-- 1. Weekly bonus record ----------------------------------------------------

CREATE TABLE "loyalty_weekly_bonuses" (
    "user_id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "order_id" TEXT,
    "week_total" DECIMAL(10,2) NOT NULL,
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_weekly_bonuses_pkey" PRIMARY KEY ("user_id", "week_start")
);

ALTER TABLE "loyalty_weekly_bonuses" ADD CONSTRAINT "loyalty_weekly_bonuses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_weekly_bonuses" ADD CONSTRAINT "loyalty_weekly_bonuses_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON TABLE "loyalty_weekly_bonuses" IS
  'Weekly spend bonuses, written only by award_loyalty_points(). One row per customer per week.';

ALTER TABLE "loyalty_weekly_bonuses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_weekly_bonuses: admin reads" ON "loyalty_weekly_bonuses"
  FOR SELECT USING (public.is_admin());

-- 2. The per-order formula --------------------------------------------------

CREATE OR REPLACE FUNCTION public.loyalty_points_for_total(p_total numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 5
       + floor(greatest(coalesce(p_total, 0), 0) / 100)::integer
       + CASE WHEN p_total >= 1000 THEN 5 ELSE 0 END;
$$;

-- 3. Awarding ---------------------------------------------------------------

-- Idempotent: points_awarded is checked under a row lock on the order, and the
-- weekly bonus under the table's primary key.
CREATE OR REPLACE FUNCTION public.award_loyalty_points(p_order_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o            orders;
  v_points     integer;
  v_bonus      integer := 0;
  v_week_start date;
  v_week_total numeric;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND OR o.points_awarded OR o.user_id IS NULL OR o.payment_status <> 'paid' THEN
    RETURN 0;
  END IF;

  -- One award per customer at a time, so two orders paid at the same moment
  -- both count towards the week's total.
  PERFORM 1 FROM profiles WHERE id = o.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_points := public.loyalty_points_for_total(o.total);

  v_week_start := date_trunc('week', coalesce(o.paid_at, now()) AT TIME ZONE 'Africa/Nairobi')::date;
  SELECT coalesce(sum(total), 0) INTO v_week_total
  FROM orders
  WHERE user_id = o.user_id
    AND payment_status = 'paid'
    AND coalesce(paid_at, updated_at) AT TIME ZONE 'Africa/Nairobi' >= v_week_start
    AND coalesce(paid_at, updated_at) AT TIME ZONE 'Africa/Nairobi' < v_week_start + 7
    AND coalesce(paid_at, updated_at) <= coalesce(o.paid_at, now());

  IF v_week_total >= 1000 THEN
    INSERT INTO loyalty_weekly_bonuses (user_id, week_start, order_id, week_total, points)
    VALUES (o.user_id, v_week_start, o.id, v_week_total, 5)
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_bonus := 5;
    END IF;
  END IF;

  UPDATE orders
  SET points_awarded = true, points_earned = v_points + v_bonus
  WHERE id = o.id;

  UPDATE profiles
  SET loyalty_points = loyalty_points + v_points + v_bonus
  WHERE id = o.user_id;

  RETURN v_points + v_bonus;
END;
$$;

-- Server and triggers only: customers can't call these through the API.
REVOKE EXECUTE ON FUNCTION public.loyalty_points_for_total(numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_points(text) TO service_role;

-- 4. Award whenever an order becomes paid ------------------------------------

CREATE OR REPLACE FUNCTION public.award_points_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_loyalty_points(new.id);
  RETURN NULL;
END;
$$;

-- award_loyalty_points() updates the order again, but not payment_status, so
-- this doesn't fire a second time.
CREATE TRIGGER orders_award_points
  AFTER INSERT OR UPDATE OF payment_status ON "orders"
  FOR EACH ROW
  WHEN (new.payment_status = 'paid' AND NOT new.points_awarded)
  EXECUTE FUNCTION public.award_points_on_payment();

-- 5. Paid orders that never got points (e.g. marked paid by an admin) --------
-- Oldest first, so weekly totals build up in the order they happened. Orders
-- already awarded under the old tiers keep what they got.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM orders
    WHERE payment_status = 'paid' AND user_id IS NOT NULL AND NOT points_awarded
    ORDER BY coalesce(paid_at, updated_at)
  LOOP
    PERFORM public.award_loyalty_points(r.id);
  END LOOP;
END;
$$;

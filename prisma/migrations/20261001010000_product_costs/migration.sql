-- ============================================================================
-- What the shop paid for one piece of a product (its buying price).
--
-- Kept out of "products" on purpose: products are readable by anyone, and the
-- buying price must never reach the storefront. Admin only.
-- ============================================================================

CREATE TABLE "product_costs" (
  "product_id" TEXT NOT NULL,
  "buy_price"  DECIMAL(10,2) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_costs_pkey" PRIMARY KEY ("product_id"),
  CONSTRAINT "product_costs_buy_price_non_negative" CHECK ("buy_price" >= 0)
);

ALTER TABLE "product_costs"
  ADD CONSTRAINT "product_costs_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER product_costs_touch BEFORE UPDATE ON "product_costs"
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE "product_costs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_costs: admin only" ON "product_costs"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

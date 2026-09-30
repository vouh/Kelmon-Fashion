-- ============================================================================
-- Finance: stock the shop buys, and what it sells for.
--
-- An inventory is one buying trip ("Monday 15 May 2026"); its items are what
-- was bought on it — a free-text name ("Bags"), what one piece cost, what one
-- piece sells for, how many were bought and how many have sold so far. An item
-- can optionally point at a catalogue product, but never has to. Admin only.
-- ============================================================================

CREATE TABLE "inventories" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"         TEXT NOT NULL,
  "purchased_on" DATE NOT NULL DEFAULT CURRENT_DATE,
  "notes"        TEXT,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventories_name_not_blank" CHECK (length(trim("name")) BETWEEN 1 AND 120)
);

CREATE INDEX "inventories_purchased_on_idx" ON "inventories" ("purchased_on" DESC);

CREATE TABLE "inventory_items" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "inventory_id" UUID NOT NULL,
  "name"         TEXT NOT NULL,
  "product_id"   TEXT,
  "buy_price"    DECIMAL(10,2) NOT NULL,
  "sell_price"   DECIMAL(10,2) NOT NULL,
  "quantity"     INTEGER NOT NULL,
  "sold"         INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_items_name_not_blank" CHECK (length(trim("name")) BETWEEN 1 AND 160),
  CONSTRAINT "inventory_items_prices_non_negative" CHECK ("buy_price" >= 0 AND "sell_price" >= 0),
  CONSTRAINT "inventory_items_quantity_positive" CHECK ("quantity" >= 1),
  CONSTRAINT "inventory_items_sold_in_range" CHECK ("sold" >= 0 AND "sold" <= "quantity")
);

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_inventory_id_fkey"
  FOREIGN KEY ("inventory_id") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "inventory_items_inventory_idx" ON "inventory_items" ("inventory_id");
CREATE INDEX "inventory_items_product_idx" ON "inventory_items" ("product_id");

CREATE TRIGGER inventories_touch BEFORE UPDATE ON "inventories"
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER inventory_items_touch BEFORE UPDATE ON "inventory_items"
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE "inventories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventories: admin only" ON "inventories"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "inventory_items: admin only" ON "inventory_items"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

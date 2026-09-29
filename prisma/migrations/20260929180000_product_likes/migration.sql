-- ============================================================================
-- Product likes
--
-- One row per customer per liked product, written by the heart on the product
-- page. The raw signal for recommendations: what a customer liked, and when.
-- ============================================================================

CREATE TABLE "product_likes" (
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_likes_pkey" PRIMARY KEY ("user_id", "product_id")
);

ALTER TABLE "product_likes" ADD CONSTRAINT "product_likes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_likes" ADD CONSTRAINT "product_likes_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- "Who else liked this" and "what has this customer liked lately".
CREATE INDEX "product_likes_product_idx" ON "product_likes"("product_id");
CREATE INDEX "product_likes_user_created_idx" ON "product_likes"("user_id", "created_at" DESC);

ALTER TABLE "product_likes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_likes: read own" ON "product_likes"
  FOR SELECT USING (user_id = public.app_uid());

CREATE POLICY "product_likes: create own" ON "product_likes"
  FOR INSERT WITH CHECK (user_id = public.app_uid());

CREATE POLICY "product_likes: delete own" ON "product_likes"
  FOR DELETE USING (user_id = public.app_uid());

CREATE POLICY "product_likes: admin full access" ON "product_likes"
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

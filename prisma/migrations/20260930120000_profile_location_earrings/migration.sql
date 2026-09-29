-- ============================================================================
-- Profile location, order county, avatar cleanup, and Earrings (E)
-- ============================================================================

-- Where a customer is. `campus` stays and is shown as "School" (optional).
ALTER TABLE "profiles" ADD COLUMN "county" TEXT;
ALTER TABLE "profiles" ADD COLUMN "location" TEXT;

-- The county each order is delivered to; drop_point holds the exact location.
ALTER TABLE "orders" ADD COLUMN "county" TEXT;

-- The old preset avatars were stock images hosted by Google ("aida-public").
-- Anyone still on one goes back to the default until they pick a Kelmon
-- avatar or upload a photo. Real Google account photos are untouched.
UPDATE "profiles" SET avatar_url = NULL WHERE avatar_url LIKE '%/aida-public/%';

-- Earrings: a shop category, with product code letter E (E001, E002…).
INSERT INTO "categories" (name, show_in_filter, sort_order)
VALUES ('Earrings', true, 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO "code_prefixes" (letter, category)
SELECT 'E', 'Earrings'
WHERE NOT EXISTS (SELECT 1 FROM code_prefixes WHERE letter = 'E' OR lower(trim(category)) = 'earrings');

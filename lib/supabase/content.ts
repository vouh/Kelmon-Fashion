import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { HOMEPAGE_DROPS_SHUFFLE_KEY } from "@/lib/homepage-drops";
import type { DealRow, HomepageDropRow, ReviewRow, UpdateRow } from "@/lib/supabase/types";

/**
 * Reviews, deals and updates.
 *
 * Ports fb_addReview, fb_getReviews, fb_deleteReview, fb_getRatingsStats,
 * fb_getDeals, fb_createDeal, fb_deleteDeal, fb_getUpdates, fb_createUpdate
 * and fb_deleteUpdate from js/firebase-service.js.
 */

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function getReviews(limit?: number): Promise<ReviewRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("[content] getReviews:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getProductReviews(productId: string): Promise<ReviewRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[content] getProductReviews:", error.message);
    return [];
  }
  return data ?? [];
}

export interface RatingsStats {
  dist: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
  avg: number;
}

/** Builds the histogram from a flat list of ratings. */
function statsFromRatings(ratings: number[]): RatingsStats {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingsStats["dist"];
  let total = 0;
  let sum = 0;

  for (const rating of ratings) {
    const r = rating as 1 | 2 | 3 | 4 | 5;
    if (r >= 1 && r <= 5) {
      dist[r] += 1;
      total += 1;
      sum += r;
    }
  }

  return { dist, total, avg: total ? Number((sum / total).toFixed(1)) : 0 };
}

/** Rating histogram for the admin stats charts. Ports fb_getRatingsStats. */
export async function getRatingsStats(): Promise<RatingsStats> {
  const empty: RatingsStats = { dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0, avg: 0 };
  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();
  const { data, error } = await supabase.from("reviews").select("rating");
  if (error) {
    console.error("[content] getRatingsStats:", error.message);
    return empty;
  }

  return statsFromRatings((data ?? []).map((row) => row.rating));
}

// ── Deals ───────────────────────────────────────────────────────────────────

export async function getDeals(activeOnly = true): Promise<DealRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let query = supabase.from("deals").select("*").order("created_at", { ascending: false });
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) {
    console.error("[content] getDeals:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Whether the homepage carousel shuffles its order daily. On unless an admin
 * turned it off. Read with the service role because site_settings is
 * admin-only and the homepage is public.
 */
export async function getHomepageDropsShuffle(): Promise<boolean> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  const { data, error } = await createServiceClient()
    .from("site_settings")
    .select("value")
    .eq("key", HOMEPAGE_DROPS_SHUFFLE_KEY)
    .maybeSingle();
  if (error) console.error("[content] getHomepageDropsShuffle:", error.message);
  return data?.value !== false;
}

/** Cards for the homepage carousel, ordered by their admin-defined position. */
export async function getHomepageDrops(activeOnly = true): Promise<HomepageDropRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase
    .from("homepage_drops")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) {
    // A deployed app can briefly run newer code than its database migration.
    // Keep the homepage on its product fallback during that window instead of
    // emitting a development error overlay for the missing optional table.
    if (error.code !== "PGRST205") console.error("[content] getHomepageDrops:", error.message);
    return [];
  }
  const drops = data ?? [];
  if (!activeOnly) return drops;

  // Drops linked to a product show its live name, price and category, and are
  // left out while that product is unpublished or sold out — so the homepage
  // never links to something a customer can't buy.
  const linkedIds = [...new Set(drops.map((d) => d.product_id).filter((id): id is string => Boolean(id)))];
  if (linkedIds.length === 0) return drops;
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, category, images, active, stock")
    .in("id", linkedIds);
  const live = new Map((products ?? []).map((p) => [p.id, p]));

  return drops.flatMap((drop) => {
    if (!drop.product_id) return [drop];
    const product = live.get(drop.product_id);
    if (!product || !product.active || product.stock <= 0) return [];
    return [{
      ...drop,
      name: product.name,
      price: Number(product.price),
      category: product.category,
      image: product.images?.[0] ?? drop.image,
    }];
  });
}

// ── Updates ─────────────────────────────────────────────────────────────────

export async function getUpdates(limit?: number): Promise<UpdateRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let query = supabase.from("updates").select("*").order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("[content] getUpdates:", error.message);
    return [];
  }
  return data ?? [];
}

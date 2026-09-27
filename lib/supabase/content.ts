import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { DealRow, ReviewRow, UpdateRow } from "@/lib/supabase/types";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { devDeals, devReviews, devUpdates } from "@/lib/dev-fixtures";

/**
 * Reviews, deals and updates.
 *
 * Ports fb_addReview, fb_getReviews, fb_deleteReview, fb_getRatingsStats,
 * fb_getDeals, fb_createDeal, fb_deleteDeal, fb_getUpdates, fb_createUpdate
 * and fb_deleteUpdate from js/firebase-service.js.
 */

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function getReviews(limit?: number): Promise<ReviewRow[]> {
  if (isDevAuthEnabled()) return limit ? devReviews.slice(0, limit) : devReviews;
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
  if (isDevAuthEnabled()) return statsFromRatings(devReviews.map((r) => r.rating));
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
  if (isDevAuthEnabled()) return activeOnly ? devDeals.filter((d) => d.active) : devDeals;
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

// ── Updates ─────────────────────────────────────────────────────────────────

export async function getUpdates(limit?: number): Promise<UpdateRow[]> {
  if (isDevAuthEnabled()) return limit ? devUpdates.slice(0, limit) : devUpdates;
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

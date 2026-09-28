import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { productFromRow, type Product } from "@/lib/products";
import type { ProductRow } from "@/lib/supabase/types";

/**
 * Server-side product reads. The catalogue lives entirely in the `products`
 * table — there is no hardcoded or sample data behind these any more, so an
 * empty storefront means an empty table, and the fix is to add products in
 * /admin/products.
 *
 * Every function degrades to an empty result when Supabase is unconfigured, so
 * the storefront renders (empty) instead of crashing on a fresh clone.
 */

export async function getProducts(options?: {
  category?: string;
  limit?: number;
}): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (options?.category && options.category !== "All") {
    query = query.eq("category", options.category);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  let data: Awaited<typeof query>["data"];
  let error: Awaited<typeof query>["error"];
  try {
    ({ data, error } = await query);
  } catch (fetchError) {
    console.warn("[products] getProducts request unavailable", fetchError);
    return [];
  }
  if (error) {
    console.warn("[products] getProducts:", error.message);
    return [];
  }
  return (data ?? []).map(productFromRow);
}

/** Products worth putting on the homepage: badged first, then newest. */
export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let data: ProductRow[] | null;
  let error: { message: string } | null;
  try {
    ({ data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .not("badge", "is", null)
      .order("rating", { ascending: false })
      .limit(limit));
  } catch (fetchError) {
    console.warn("[products] getFeaturedProducts request unavailable", fetchError);
    return [];
  }

  if (error) {
    console.warn("[products] getFeaturedProducts:", error.message);
    return [];
  }

  // Top up with newest products if not enough are badged.
  if ((data?.length ?? 0) < limit) {
    const rest = await getProducts({ limit });
    const seen = new Set((data ?? []).map((r) => r.id));
    const merged = [...(data ?? []).map(productFromRow)];
    for (const p of rest) {
      if (merged.length >= limit) break;
      if (!seen.has(p.id)) merged.push(p);
    }
    return merged;
  }

  return (data ?? []).map(productFromRow);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  let data: ProductRow | null;
  let error: { message: string } | null;
  try {
    ({ data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle());
  } catch (fetchError) {
    console.warn("[products] getProductById request unavailable", fetchError);
    return null;
  }

  if (error) {
    console.warn("[products] getProductById:", error.message);
    return null;
  }
  return data ? productFromRow(data) : null;
}

/** Same-category suggestions for the product detail page. */
export async function getRelatedProducts(
  product: Pick<Product, "id" | "category">,
  limit = 6
): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let data: ProductRow[] | null;
  let error: { message: string } | null;
  try {
    ({ data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .eq("category", product.category)
      .neq("id", product.id)
      .limit(limit));
  } catch (fetchError) {
    console.warn("[products] getRelatedProducts request unavailable", fetchError);
    return [];
  }

  if (error) {
    console.warn("[products] getRelatedProducts:", error.message);
    return [];
  }
  return (data ?? []).map(productFromRow);
}

/** Distinct categories that actually have active products. */
export async function getCategories(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let data: Pick<ProductRow, "category">[] | null;
  let error: { message: string } | null;
  try {
    ({ data, error } = await supabase
      .from("products")
      .select("category")
      .eq("active", true));
  } catch (fetchError) {
    console.warn("[products] getCategories request unavailable", fetchError);
    return [];
  }

  if (error) {
    console.warn("[products] getCategories:", error.message);
    return [];
  }
  return [...new Set((data ?? []).map((r) => r.category))].sort();
}

/** Admin view: includes inactive products. Relies on RLS for authorisation. */
export async function getAllProductsForAdmin(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let data: ProductRow[] | null;
  let error: { message: string } | null;
  try {
    ({ data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false }));
  } catch (fetchError) {
    console.warn("[products] getAllProductsForAdmin request unavailable", fetchError);
    return [];
  }

  if (error) {
    console.warn("[products] getAllProductsForAdmin:", error.message);
    return [];
  }
  return (data ?? []).map(productFromRow);
}

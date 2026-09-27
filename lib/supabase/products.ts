import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { productFromRow, type Product } from "@/lib/products";

/**
 * Server-side product reads. These replace the hardcoded `shopProducts` /
 * `featuredProducts` arrays that used to live in lib/products.ts.
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

  const { data, error } = await query;
  if (error) {
    console.error("[products] getProducts:", error.message);
    return [];
  }
  return (data ?? []).map(productFromRow);
}

/** Products worth putting on the homepage: badged first, then newest. */
export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .not("badge", "is", null)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[products] getFeaturedProducts:", error.message);
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

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[products] getProductById:", error.message);
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

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(limit);

  if (error) {
    console.error("[products] getRelatedProducts:", error.message);
    return [];
  }
  return (data ?? []).map(productFromRow);
}

/** Distinct categories that actually have active products. */
export async function getCategories(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("active", true);

  if (error) {
    console.error("[products] getCategories:", error.message);
    return [];
  }
  return [...new Set((data ?? []).map((r) => r.category))].sort();
}

/** Admin view: includes inactive products. Relies on RLS for authorisation. */
export async function getAllProductsForAdmin(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[products] getAllProductsForAdmin:", error.message);
    return [];
  }
  return (data ?? []).map(productFromRow);
}

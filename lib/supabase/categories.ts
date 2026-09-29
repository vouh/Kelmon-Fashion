import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/supabase/types";

/**
 * Server-side category reads. Like lib/supabase/products.ts, every function
 * degrades to an empty result when Supabase is unconfigured or unreachable.
 */

async function listCategories(onlyFilters: boolean): Promise<CategoryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let query = supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (onlyFilters) query = query.eq("show_in_filter", true);

  let data: CategoryRow[] | null;
  let error: { message: string } | null;
  try {
    ({ data, error } = await query);
  } catch (fetchError) {
    console.warn("[categories] request unavailable", fetchError);
    return [];
  }
  if (error) {
    console.warn("[categories]", error.message);
    return [];
  }
  return data ?? [];
}

/** Names of the categories shown as filter chips on /shop, in display order. */
export async function getFilterCategories(): Promise<string[]> {
  return (await listCategories(true)).map((c) => c.name);
}

/** Every category, for the admin category manager and product form. */
export async function getAllCategories(): Promise<CategoryRow[]> {
  return listCategories(false);
}

import "server-only";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { CodePrefixRow } from "@/lib/supabase/types";

/**
 * Product code letters (P = Perfumes, B = Bags…) for Products → Settings.
 * The codes themselves are handed out by the database (see the
 * 20260929210000_product_codes migration), never by app code.
 */

export interface CodePrefixSummary extends CodePrefixRow {
  /** Where the letter has reached, e.g. "P012"; null before its first product. */
  reached: string | null;
  /** Products currently in the catalogue with this letter. */
  productCount: number;
}

export function formatCode(letter: string, n: number): string {
  return letter + String(n).padStart(3, "0");
}

export async function getCodePrefixes(): Promise<CodePrefixRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await (await createClient())
    .from("code_prefixes")
    .select("*")
    .order("letter");
  if (error) {
    console.error("[product-codes] getCodePrefixes:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getCodePrefixSummaries(): Promise<CodePrefixSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const [prefixes, { data: products }] = await Promise.all([
    getCodePrefixes(),
    supabase.from("products").select("code").not("code", "is", null),
  ]);

  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    const letter = p.code?.[0];
    if (letter) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  return prefixes.map((p) => ({
    ...p,
    reached: p.last_number > 0 ? formatCode(p.letter, p.last_number) : null,
    productCount: counts.get(p.letter) ?? 0,
  }));
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient, isAdmin } from "@/lib/supabase/server";
import { inventoryNameFor } from "@/lib/finance";
import { kenyaToday } from "@/lib/date-range";

/**
 * Server Actions for the admin Finance page (inventories and their items).
 * Same two guards as app/admin/actions.ts: an admin check up front, and a
 * Zod parse of anything the client sends.
 */

export type FinanceResult = { ok: true; id?: string } | { ok: false; error: string };

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized.");
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : createClient();
}

function fail(err: unknown): FinanceResult {
  return { ok: false, error: err instanceof Error ? err.message : String(err) };
}

/** Turns a Postgres error into something an admin can act on. */
function dbError(error: { code?: string; message: string }): Error {
  if (error.code === "23503") return new Error("That product no longer exists. Pick another one.");
  if (error.code === "23514") return new Error("Sold can't be more than the quantity bought.");
  return new Error(error.message);
}

const uuid = z.string().uuid("Invalid id.");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");
const money = z.coerce.number().finite().min(0, "Prices can't be negative.").max(10_000_000);

const itemSchema = z
  .object({
    name: z.string().trim().min(1, "Give each item a name, e.g. Bags.").max(160),
    productId: z.string().trim().max(200).nullish(),
    buyPrice: money,
    sellPrice: money,
    quantity: z.coerce.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(100_000),
    sold: z.coerce.number().int().min(0).default(0),
  })
  .refine((item) => item.sold <= item.quantity, { message: "Sold can't be more than the quantity bought." });

const inventorySchema = z.object({
  name: z.string().trim().max(120).optional(),
  purchasedOn: day,
  notes: z.string().trim().max(1000).nullish(),
});

type ItemInput = z.input<typeof itemSchema>;

function itemRow(item: z.output<typeof itemSchema>) {
  return {
    name: item.name,
    product_id: item.productId || null,
    buy_price: item.buyPrice,
    sell_price: item.sellPrice,
    quantity: item.quantity,
    sold: item.sold,
  };
}

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  return parsed.data;
}

function refresh() {
  revalidatePath("/admin/finance");
}

// ── Inventories ────────────────────────────────────────────────────────────

/** Records a buying trip with everything bought on it (items may be empty). */
export async function createInventory(input: {
  name?: string;
  purchasedOn: string;
  notes?: string | null;
  items: ItemInput[];
}): Promise<FinanceResult> {
  try {
    const supabase = await requireAdmin();
    const inventory = parse(inventorySchema, input);
    if (inventory.purchasedOn > kenyaToday()) throw new Error("The purchase date can't be in the future.");
    const items = parse(z.array(itemSchema).max(500), input.items);

    const { data, error } = await supabase
      .from("inventories")
      .insert({
        name: inventory.name || inventoryNameFor(inventory.purchasedOn),
        purchased_on: inventory.purchasedOn,
        notes: inventory.notes || null,
      })
      .select("id")
      .single();
    if (error) throw dbError(error);

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("inventory_items")
        .insert(items.map((item) => ({ ...itemRow(item), inventory_id: data.id })));
      if (itemsError) {
        // No half-saved trips: drop the empty inventory if its items failed.
        await supabase.from("inventories").delete().eq("id", data.id);
        throw dbError(itemsError);
      }
    }

    refresh();
    return { ok: true, id: data.id };
  } catch (err) {
    return fail(err);
  }
}

export async function updateInventory(input: {
  id: string;
  name: string;
  purchasedOn: string;
  notes?: string | null;
}): Promise<FinanceResult> {
  try {
    const supabase = await requireAdmin();
    const id = parse(uuid, input.id);
    const inventory = parse(inventorySchema, input);
    if (inventory.purchasedOn > kenyaToday()) throw new Error("The purchase date can't be in the future.");
    const { error } = await supabase
      .from("inventories")
      .update({
        name: inventory.name || inventoryNameFor(inventory.purchasedOn),
        purchased_on: inventory.purchasedOn,
        notes: inventory.notes || null,
      })
      .eq("id", id);
    if (error) throw dbError(error);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Deletes a trip and every item on it. */
export async function deleteInventory(id: string): Promise<FinanceResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("inventories").delete().eq("id", parse(uuid, id));
    if (error) throw dbError(error);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Items ──────────────────────────────────────────────────────────────────

export async function addInventoryItem(inventoryId: string, item: ItemInput): Promise<FinanceResult> {
  try {
    const supabase = await requireAdmin();
    const row = itemRow(parse(itemSchema, item));
    const { error } = await supabase
      .from("inventory_items")
      .insert({ ...row, inventory_id: parse(uuid, inventoryId) });
    if (error) throw dbError(error);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateInventoryItem(id: string, item: ItemInput): Promise<FinanceResult> {
  try {
    const supabase = await requireAdmin();
    const row = itemRow(parse(itemSchema, item));
    const { error } = await supabase.from("inventory_items").update(row).eq("id", parse(uuid, id));
    if (error) throw dbError(error);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** The +/− buttons: moves "sold" by delta, kept between 0 and the quantity. */
export async function adjustInventorySold(id: string, delta: number): Promise<FinanceResult> {
  try {
    const supabase = await requireAdmin();
    const itemId = parse(uuid, id);
    const step = parse(z.number().int().min(-100_000).max(100_000), delta);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("sold, quantity")
      .eq("id", itemId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw new Error("That item no longer exists.");
    const sold = Math.min(data.quantity, Math.max(0, data.sold + step));
    if (sold !== data.sold) {
      const { error: updateError } = await supabase.from("inventory_items").update({ sold }).eq("id", itemId);
      if (updateError) throw dbError(updateError);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteInventoryItem(id: string): Promise<FinanceResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("inventory_items").delete().eq("id", parse(uuid, id));
    if (error) throw dbError(error);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

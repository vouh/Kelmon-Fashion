import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { salonServiceFromRow, type SalonService } from "@/lib/salon";
import type { SalonBookingRow } from "@/lib/supabase/types";
import { isDevAuthEnabled } from "@/lib/dev-auth";
import { devSalonServices } from "@/lib/dev-fixtures";

/**
 * Salon services and bookings.
 * Bookings replace EzyBite's customOrders collection (fb_saveCustomOrder).
 */

export async function getSalonServices(): Promise<SalonService[]> {
  if (isDevAuthEnabled()) return devSalonServices;
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("salon_services")
    .select("*")
    .eq("active", true)
    .order("price", { ascending: true });

  if (error) {
    console.error("[salon] getSalonServices:", error.message);
    return [];
  }
  return (data ?? []).map(salonServiceFromRow);
}

export async function getUserBookings(): Promise<SalonBookingRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("salon_bookings")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[salon] getUserBookings:", error.message);
    return [];
  }
  return data ?? [];
}

/** Admin view of all bookings. Admin-only by RLS. */
export async function getAllBookings(): Promise<SalonBookingRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("salon_bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[salon] getAllBookings:", error.message);
    return [];
  }
  return data ?? [];
}

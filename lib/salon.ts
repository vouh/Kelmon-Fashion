import type { SalonServiceRow } from "@/lib/supabase/types";

/**
 * Salon service shape the storefront renders. Unchanged from the previous
 * hardcoded version, so SalonServicesSection and app/salon work as before —
 * the rows now come from the salon_services table (seeded in supabase/seed.sql).
 */
export interface SalonService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  icon: string;
  image: string;
}

export function salonServiceFromRow(row: SalonServiceRow): SalonService {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    duration: row.duration ?? "",
    icon: row.icon ?? "spa",
    image: row.image ?? "/logo.png",
  };
}

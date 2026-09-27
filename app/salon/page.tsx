import SalonClient from "@/components/salon/SalonClient";
import { getSalonServices } from "@/lib/supabase/salon";

export const metadata = {
  title: "Salon — Kelmon",
  description: "Nails, lashes, brows and makeup services from Kelmon.",
};

export default async function SalonPage() {
  const salonServices = await getSalonServices();
  return <SalonClient salonServices={salonServices} />;
}

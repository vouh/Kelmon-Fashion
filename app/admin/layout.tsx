import { redirect } from "next/navigation";
import { isAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Server-side gate for every /admin route.
 *
 * middleware.ts already redirects non-admins, but this is a second, independent
 * check: a layout runs on the server for every nested route, so no admin page
 * can ever render for a non-admin even if the matcher is later changed.
 */
/**
 * Never prerender or cache an admin route: every page depends on the caller's
 * session and shows live order data.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect("/?error=supabase-not-configured");
  }
  if (!(await isAdmin())) {
    redirect("/?error=not-authorized");
  }
  return children;
}

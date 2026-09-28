import { redirect } from "next/navigation";
import { isAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";

/**
 * The authorisation boundary for every /admin route.
 *
 * middleware.ts already redirects non-admins, but it runs on the Edge runtime
 * and can only *decode* the token, not verify it. This layout runs on Node, so
 * isAdmin() here goes through the Admin SDK and checks the signature. A layout
 * also runs for every nested route, so no admin page can render for a non-admin
 * even if the middleware matcher is later narrowed.
 */
/**
 * Never prerender or cache an admin route: every page depends on the caller's
 * session and shows live order data.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Without the service account there is no way to verify a token, so the gate
  // cannot be trusted — fail closed rather than waving everyone through.
  if (!isFirebaseAdminConfigured()) {
    redirect("/?error=firebase-admin-not-configured");
  }
  if (!isSupabaseConfigured()) {
    redirect("/?error=supabase-not-configured");
  }
  if (!(await isAdmin())) {
    redirect("/?error=not-authorized");
  }
  return children;
}

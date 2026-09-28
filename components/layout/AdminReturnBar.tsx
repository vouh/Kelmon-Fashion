"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * Floating shortcut back to /admin, shown on customer pages to admins only —
 * the other half of the dashboard's "Preview user account" button.
 *
 * Purely a convenience: /admin is still gated by middleware and its layout.
 */
export default function AdminReturnBar() {
  const { isAdmin, isSuperAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6 md:justify-end md:px-6">
      <Link
        href="/admin"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-black/25 ring-1 ring-purple-400/40 transition hover:-translate-y-0.5 hover:bg-zinc-800"
      >
        <span className="material-symbols-outlined text-base text-purple-300">
          admin_panel_settings
        </span>
        <span>
          Viewing as a customer
          <span className="mx-1.5 text-white/30">·</span>
          <span className="text-purple-300">
            Back to {isSuperAdmin ? "super admin" : "admin"} dashboard
          </span>
        </span>
      </Link>
    </div>
  );
}

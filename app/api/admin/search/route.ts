import { NextResponse } from "next/server";
import { searchAdmin } from "@/app/admin/search-actions";

/**
 * GET /api/admin/search?q=… — the admin search, as a plain request.
 *
 * The search used to be a Server Action, and Next.js runs Server Actions one
 * at a time per page: a slow search (or any other pending action) queued the
 * next one behind it, and the box sat on "Searching…" indefinitely. A normal
 * request can be cancelled when the admin keeps typing, and times out.
 * searchAdmin() still does the admin check and the queries.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const hits = await searchAdmin(q);
    return NextResponse.json({ hits }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin search] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ hits: [], error: "Search failed." }, { status: 500 });
  }
}

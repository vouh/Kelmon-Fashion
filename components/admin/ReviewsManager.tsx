"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, Panel, formatDateTime } from "@/components/admin/ui";
import { deleteReview } from "@/app/admin/actions";
import type { ReviewRow } from "@/lib/supabase/types";
import { searchAnchor } from "@/lib/admin-search";

export default function ReviewsManager({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteReview(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <Panel title="All reviews" hint="Newest first">
        {reviews.length === 0 ? (
          <EmptyState icon="star" message="No reviews yet" />
        ) : (
          <ul className="divide-y divide-white/5">
            {reviews.map((review) => (
              <li key={review.id} id={searchAnchor("review", review.id)} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-white">{review.author_name}</span>
                    <span className="text-[11px] text-amber-300" aria-label={`${review.rating} of 5 stars`}>
                      {"★".repeat(review.rating)}
                      <span className="text-white/15">{"★".repeat(5 - review.rating)}</span>
                    </span>
                    {review.product_id && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/50">
                        {review.product_id}
                      </span>
                    )}
                  </div>
                  {review.body && (
                    <p className="mt-1 text-[11px] leading-relaxed text-white/50">{review.body}</p>
                  )}
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/25">
                    {formatDateTime(review.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(review.id)}
                  className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  aria-label="Delete review"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

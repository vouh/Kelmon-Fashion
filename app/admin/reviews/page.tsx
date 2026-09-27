import AdminShell from "@/components/admin/AdminShell";
import ReviewsManager from "@/components/admin/ReviewsManager";
import { getRatingsStats, getReviews } from "@/lib/supabase/content";
import { StatCard } from "@/components/admin/ui";

export const metadata = { title: "Reviews — Kelmon Admin" };

/** Port of admin/reviews.html. */
export default async function AdminReviewsPage() {
  const [reviews, stats] = await Promise.all([getReviews(), getRatingsStats()]);

  return (
    <AdminShell title="Reviews" subtitle={`${stats.total} total`}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Average"
          value={stats.avg || "—"}
          hint="Out of 5"
          icon="star"
          iconColor="text-amber-300"
        />
        <StatCard label="Reviews" value={stats.total} hint="All time" icon="rate_review" />
        <StatCard
          label="5 star"
          value={stats.dist[5]}
          hint="Happy customers"
          icon="thumb_up"
          iconColor="text-green-400"
        />
        <StatCard
          label="1–2 star"
          value={stats.dist[1] + stats.dist[2]}
          hint="Needs attention"
          icon="thumb_down"
          iconColor="text-red-400"
        />
      </div>

      {/* Rating histogram — CSS bars, no chart library needed */}
      <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
        <h3 className="mb-3 text-xs font-black text-white">Rating distribution</h3>
        <div className="space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = stats.dist[star];
            const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 text-[10px] font-black text-white/40">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-amber-400/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[10px] font-bold text-white/40">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ReviewsManager reviews={reviews} />
    </AdminShell>
  );
}

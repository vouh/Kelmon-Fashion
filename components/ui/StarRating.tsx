interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
}

export default function StarRating({ rating, reviewCount, size = "sm" }: StarRatingProps) {
  const iconSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(rating);
        return (
          <span
            key={i}
            className={`material-symbols-outlined ${iconSize} ${filled ? "text-secondary" : "text-on-surface-variant/30"}`}
            style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            aria-hidden="true"
          >
            star
          </span>
        );
      })}
      {typeof reviewCount === "number" && (
        <span className="text-xs text-on-surface-variant ml-1">({reviewCount})</span>
      )}
    </div>
  );
}

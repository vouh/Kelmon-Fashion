interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
  tone?: "secondary" | "primary";
}

export default function StarRating({
  rating,
  reviewCount,
  size = "sm",
  tone = "secondary",
}: StarRatingProps) {
  const iconSize = size === "sm" ? "text-sm" : "text-base";
  const filledClass = tone === "primary" ? "text-primary" : "text-secondary";

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(rating);
        return (
          <span
            key={i}
            className={`material-symbols-outlined ${iconSize} ${filled ? filledClass : "text-on-surface-variant/30"}`}
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

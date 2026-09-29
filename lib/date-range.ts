/**
 * Date-range filters for admin tables. Day boundaries use Kenya time
 * (EAT, UTC+3, no daylight saving) so the server render and the browser agree
 * on where "today" starts, whatever timezone either runs in.
 */

export type DateRangePreset = "all" | "today" | "3d" | "7d" | "week" | "30d" | "custom";

export interface DateRange {
  preset: DateRangePreset;
  /** Custom range only: inclusive Kenya-time days, as YYYY-MM-DD. */
  from?: string;
  to?: string;
}

export const DATE_RANGE_PRESETS: { value: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "3d", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "week", label: "This week" },
  { value: "30d", label: "Last 1 month" },
];

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Start of the Kenya-time day containing `ms`, `daysBack` days earlier. */
function dayStart(ms: number, daysBack = 0): number {
  return Math.floor((ms + EAT_OFFSET_MS) / DAY_MS) * DAY_MS - EAT_OFFSET_MS - daysBack * DAY_MS;
}

function parseDay(day: string): number | null {
  if (!DAY_PATTERN.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  // Rejects dates like 2026-02-31 that Date.UTC would roll over.
  return new Date(ms).toISOString().slice(0, 10) === day ? ms - EAT_OFFSET_MS : null;
}

/** Today's date in Kenya as YYYY-MM-DD, for date inputs. */
export function kenyaToday(now = Date.now()): string {
  return new Date(now + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Reads a range from URL params, falling back to all time for anything invalid. */
export function parseDateRange(params: { range?: string; from?: string; to?: string }): DateRange {
  const preset = params.range as DateRangePreset | undefined;
  if (preset === "custom") {
    const from = params.from && parseDay(params.from) !== null ? params.from : undefined;
    const to = params.to && parseDay(params.to) !== null ? params.to : undefined;
    if (!from && !to) return { preset: "all" };
    return from && to && from > to ? { preset, from: to, to: from } : { preset, from, to };
  }
  return DATE_RANGE_PRESETS.some((p) => p.value === preset) ? { preset: preset! } : { preset: "all" };
}

/** [start, end) in epoch ms; either side is null when open-ended. */
export function dateRangeBounds(range: DateRange, now = Date.now()): [number | null, number | null] {
  switch (range.preset) {
    case "today":
      return [dayStart(now), null];
    case "3d":
      return [dayStart(now, 2), null];
    case "7d":
      return [dayStart(now, 6), null];
    case "week": {
      // Weeks start on Monday.
      const weekday = new Date(now + EAT_OFFSET_MS).getUTCDay();
      return [dayStart(now, (weekday + 6) % 7), null];
    }
    case "30d":
      return [dayStart(now, 29), null];
    case "custom": {
      const from = range.from ? parseDay(range.from) : null;
      const to = range.to ? parseDay(range.to) : null;
      return [from, to === null ? null : to + DAY_MS];
    }
    default:
      return [null, null];
  }
}

export function isInDateRange(iso: string, bounds: [number | null, number | null]): boolean {
  const [start, end] = bounds;
  if (start === null && end === null) return true;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return false;
  return (start === null || ms >= start) && (end === null || ms < end);
}

function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Short label for the filter button, e.g. "Last 7 days" or "1 Sept – 15 Sept 2026". */
export function dateRangeLabel(range: DateRange): string {
  if (range.preset !== "custom") {
    return DATE_RANGE_PRESETS.find((p) => p.value === range.preset)?.label ?? "All time";
  }
  if (range.from && range.to) return range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} – ${formatDay(range.to)}`;
  if (range.from) return `From ${formatDay(range.from)}`;
  if (range.to) return `Until ${formatDay(range.to)}`;
  return "All time";
}

/** Writes the range into the current URL without navigating. */
export function writeDateRangeToUrl(range: DateRange) {
  const url = new URL(window.location.href);
  for (const key of ["range", "from", "to"]) url.searchParams.delete(key);
  if (range.preset !== "all") url.searchParams.set("range", range.preset);
  if (range.preset === "custom") {
    if (range.from) url.searchParams.set("from", range.from);
    if (range.to) url.searchParams.set("to", range.to);
  }
  window.history.replaceState(null, "", url);
}

/**
 * DOM ids for items the admin topbar search can land on, e.g. hit-deal-<uuid>.
 * The search result links to `page#id`, and the page renders the same id on
 * the item so it can be scrolled to and flashed.
 */
export function searchAnchor(kind: string, id: string): string {
  return `hit-${kind}-${id}`.replace(/[^A-Za-z0-9_-]/g, "-");
}

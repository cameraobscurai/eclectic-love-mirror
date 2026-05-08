/**
 * Owner-curated overrides — display-only, never mutates the catalog or DB.
 *
 * Two purposes:
 *   1. FORCE_GROUP_BY_SLUG — pin a specific product to a browse group when
 *      the rule engine routes it elsewhere. E.g. "Gwenevere Mulberry Daybed"
 *      lives in seating but its title doesn't match sofa keywords; the owner
 *      wants it under Sofas.
 *   2. HIDE_FROM_SITE_SLUGS — items present in Supabase but the owner does
 *      NOT want on the public site (e.g. "Ingram Black Leather + Wood Sofa").
 *      Filtered out at getCollectionCatalog() time.
 *
 * Keyed by the catalog `slug` (stable, includes rms_id suffix).
 * Source of truth: owner-confirmed in chat, dated. Add a comment per row.
 */
import type { BrowseGroupId } from "./collection-taxonomy";

// Pin specific products to a browse group regardless of what the rule
// engine would say. Use sparingly — these are owner edits, not heuristics.
export const FORCE_GROUP_BY_SLUG: Record<string, BrowseGroupId> = {
  // 2026-05-08 — owner: belongs under Sofas alongside loveseats/settees.
  "gwenevere-mulberry-daybed-2118": "sofas",
  // 2026-05-08 — owner: round velvet banquette reads as a sofa, not a bench.
  "rosalind-cream-velvet-round-banquette-4014": "sofas",
};

// Hide specific items from the public site. They stay in Supabase (truth)
// but never reach the grid, counts, rails, or category overview.
export const HIDE_FROM_SITE_SLUGS: ReadonlySet<string> = new Set([
  // 2026-05-08 — owner: explicitly does not want this on the site.
  "ingram-black-leather-wood-sofa-4180",
]);

// Canonical inventory categories for the admin editor.
// Single source of truth for both "New product" and the edit drawer so a
// category is never missing just because no existing row uses it yet.

export const ADMIN_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "seating", label: "Seating" },
  { slug: "tables", label: "Tables" },
  { slug: "bars", label: "Cocktail & Bar" },
  { slug: "tableware", label: "Tableware" },
  { slug: "serveware", label: "Serveware" },
  { slug: "pillows-throws", label: "Pillows & Throws" },
  { slug: "rugs", label: "Rugs" },
  { slug: "lighting", label: "Lighting" },
  { slug: "candlelight", label: "Candlelight" },
  { slug: "chandeliers", label: "Chandeliers" },
  { slug: "large-decor", label: "Large Decor" },
  { slug: "styling", label: "Styling" },
  { slug: "storage", label: "Storage" },
  { slug: "furs-pelts", label: "Furs & Pelts" },
];

export const ADMIN_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_CATEGORIES.map((c) => [c.slug, c.label]),
);

/** Canonical list first, then any legacy values still present in the DB. */
export function mergeCategoryOptions(existing: string[] = []) {
  const seen = new Set(ADMIN_CATEGORIES.map((c) => c.slug));
  const extras = existing
    .filter((c) => c && !seen.has(c))
    .map((c) => ({ slug: c, label: c }));
  return [...ADMIN_CATEGORIES, ...extras];
}

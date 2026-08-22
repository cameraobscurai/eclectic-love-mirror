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
  const extras = existing.filter((c) => c && !seen.has(c)).map((c) => ({ slug: c, label: c }));
  return [...ADMIN_CATEGORIES, ...extras];
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcategories
//
// Admin category slug → the subcategory chips a product can be filed under on
// the public collection. Ids MUST match PARENT_SUBS in collection-parents.ts —
// that's what the runtime classifier checks the override against.
// ─────────────────────────────────────────────────────────────────────────────

export type AdminSubcategory = { id: string; label: string };

export const CATEGORY_SUBCATEGORIES: Record<string, AdminSubcategory[]> = {
  seating: [
    { id: "sofas-loveseats", label: "Sofas & Loveseats" },
    { id: "chairs", label: "Chairs" },
    { id: "benches", label: "Benches" },
    { id: "ottomans", label: "Ottomans" },
    { id: "dining-chairs", label: "Dining Chairs" },
    { id: "stools", label: "Stools" },
  ],
  tables: [
    { id: "coffee-tables", label: "Coffee Tables" },
    { id: "side-tables", label: "Side Tables" },
    { id: "consoles", label: "Consoles" },
    { id: "dining-tables", label: "Dining Tables" },
    { id: "cocktail-tables", label: "Cocktail Tables" },
    { id: "community-tables", label: "Community Tables" },
  ],
  bars: [
    { id: "bars", label: "Bars" },
    { id: "cocktail-tables", label: "Cocktail Tables" },
    { id: "community-tables", label: "Community Tables" },
    { id: "stools", label: "Stools" },
    { id: "storage", label: "Storage" },
  ],
  tableware: [
    { id: "dinnerware", label: "Dinnerware" },
    { id: "flatware", label: "Flatware" },
    { id: "glassware", label: "Glassware" },
    { id: "serveware", label: "Serveware" },
  ],
  serveware: [{ id: "serveware", label: "Serveware" }],
  "pillows-throws": [
    { id: "pillows", label: "Pillows" },
    { id: "throws", label: "Throws" },
  ],
  rugs: [{ id: "rugs", label: "Rugs" }],
  lighting: [
    { id: "lamps", label: "Lamps" },
    { id: "chandeliers", label: "Chandeliers" },
    { id: "candlelight", label: "Candlelight" },
    { id: "specialty", label: "Specialty" },
  ],
  candlelight: [{ id: "candlelight", label: "Candlelight" }],
  chandeliers: [{ id: "chandeliers", label: "Chandeliers" }],
  "large-decor": [
    { id: "structures", label: "Structures" },
    { id: "walls", label: "Walls" },
    { id: "other", label: "Other" },
  ],
  styling: [
    { id: "accents", label: "Accents" },
    { id: "crates-baskets", label: "Crates & Baskets" },
  ],
  storage: [{ id: "storage", label: "Storage" }],
  "furs-pelts": [],
};

/** Subcategory options for a category, with any legacy value appended so a
 *  saved subcategory never silently disappears from the dropdown. */
export function subcategoryOptions(
  categorySlug: string | null | undefined,
  current?: string | null,
): AdminSubcategory[] {
  const base = CATEGORY_SUBCATEGORIES[categorySlug ?? ""] ?? [];
  if (current && !base.some((s) => s.id === current)) {
    return [...base, { id: current, label: current }];
  }
  return base;
}

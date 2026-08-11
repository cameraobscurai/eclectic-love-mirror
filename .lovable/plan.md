# Declared Taxonomy — Adrienne's 10 Collections

Answer to her: yes, no reason it can't be that simple. Her sheet becomes the law.

Her model is 10 Collections × ~38 Categories, two levels. Today the same job is done by five inference layers stacked on scraped data: DB category slugs → alias remap → browse-group keyword classifier (`collection-browse-groups.ts`, `collection-taxonomy.ts`) → subcategory inference (`collection-subcategories.ts`) → owner overrides. We replace all of it with two stored columns.

## Vocabulary (adopt hers, retire ours)

- `collection_slug` — her Collection (10 values). Replaces "category"/"browse group".
- `category_slug` — her Category (~38 values). Replaces "subcategory".

No internal synonyms kept. Old names disappear at the code boundary.

## Sequencing

Does not touch Frame Studio Phase 1 — build that on its own rails. This lands **before** Phase 2, so fit rules key to her collections. Her Dining/Lounge Seating split fixes the dining-chair-vs-sofa fit collision for free.

## Steps

1. **Migration** — add `collection_slug` and `category_slug` to `inventory_items` (nullable at first), plus a `taxonomy` reference table holding her 10 collections and their allowed categories so values can't drift. Collection slugs are derived from the existing live nav `group` param values (`lounge-seating`, `cocktail-bar`, `dining`, …), not freshly invented — her names already match almost exactly, so public URLs barely move and no collection-level redirects are needed. Do not "clean up" those slugs.
2. **Review round-trip** — Adrienne edits the draft workbook already generated (635 rows: 462 white / 121 yellow / 52 red). We import her returned file, validate every value against the reference table, and reject/report anything off-vocabulary before writing.
3. **Assign** — dry-run manifest first, then apply. Assignment is per family tile: variant rows inherit the lead row's collection/category, so review stays at 635 rows, not 835. Anything unassigned stays out of nav rather than silently falling back.
4. **Import protection (required, not optional)** — `scripts/import.mjs` must never write `collection_slug` or `category_slug` on existing rows; the RMS upsert explicitly excludes both columns. Without this, the next sync after her review nulls her assignments and — because unassigned products stay out of nav — silently removes live products with no error anywhere. New RMS products land unassigned and surface in an "Unassigned" queue in admin Inventory. That queue is the answer to who classifies product #636: her review is ongoing intake, not a one-time cleanup.
5. **Read path** — nav, collection filters, PDP breadcrumbs, admin Inventory sort, and the catalog bake read the two columns directly. No scoring, no keywords.
6. **Split delete — do NOT delete everything at once.**
   - Deleted now, once the read path is on the columns and verified: browse-group scorer, subcategory keyword inference, owner-subcategory overrides.
   - Survives untouched: the alias map (`canonicalCategorySlug`) and the old category column. `categoryFit.ts` imports the alias map and that solver stays live in production until Frame Studio Phase 4/5. Deleting it now either breaks the grid or forces edits inside frozen files. Alias map + old column go out in the same commit as the Phase 5 solver delete.


## Re-classification, not a rename

Her tree crosses current DB boundaries in seven places, each needing per-product assignment: dining chairs and bar stools leave seating; storage folds into Cocktail + Bar; candlelight moves under Styling; chandeliers into Lighting; serveware into Tableware; furs-pelts into Textiles; pillows-throws (153 items) splits into Pillows and Throws.

## Questions for her reply

- "Candlighting" — confirm display spelling before it becomes a URL slug.
- "Specialty" (Lighting) and "Other" (Large Decor) are catch-alls: agree now that anything parked there long-term earns a real category or gets reassigned.
- Textiles lands at 159 items and Dining at only 19 — worth her eyes on whether Dining should be defined more broadly.
- Bare "chair" titles: lounge vs dining.
- Does non-bar storage (crates, shelving) really belong under Cocktail + Bar, or Styling?

## Technical notes

- Reference table + FK-style validation is what stops the taxonomy rotting back into free text.
- Publish overlay and `bake-catalog.mjs` must carry both new columns, same carry-point discipline as `cover_framed_url`.
- Step 5 is a hard delete, not a deprecation — the layers only cause harm once truth is declared.

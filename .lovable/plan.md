# Task C apply (ruled) → Task C2 read-path switchover

Two tasks, strictly sequential. C executes on approval. C2 is drafted here but does not run
until C's `--apply` confirms.

## Rulings carried into the apply

1. **10 candlelighting blockers** — workbook is wrong, reference table is right. Correct to
   `styling/candlelighting`. Cause: the mapper inherited the old-site collection for a category
   that crossed collections between trees. Fix the mapper rule too, not just the rows: when a
   category's home differs between old and new tree, the new tree's collection wins.
2. **PIERCE FRENCH ANTIQUE CONSOLE** → `lounge-tables/consoles`.
3. **Bucket 4 (33 rows)** — keep their current values, stamp
   `{ confidence: 'med', source: 'v1-seed', reviewed: false, needs_owner: false }`. `v1-seed` is
   added to the documented source enum. These are post-bake intake, not stale junk; they route to
   the studio's CONFIRM queue.
4. **15 workbook ids with no DB row** — skip, never create. Listed in
   `docs/taxonomy-open-questions.md` for one glance at the meeting.
5. **KEATON** stays demoted (`med` / `export-disagreement`) — one item in the CONFIRM queue.
6. Title lint stays advisory; the three banquette-titled rows get ruled in the studio.

## Task C — apply

- Update `scripts/reseed-taxonomy.mjs`: collection-crossing rule (category's declared collection
  wins over the workbook column when they disagree for a known category), bucket-4 stamping with
  `v1-seed`, ghost-id list written to open questions.
- Re-run the dry run — expect 0 blockers, 831 writes, 51 changed, 33 bucket-4 stamped, 1 demotion.
- Run `--apply`, then `bun run bake:catalog`.

**Done when:** the re-run dry run reports 0 blockers and emits a predicted counts table (rows
written, bucket-2 changes, bucket-4 review-stamps, demotions, per-collection totals, confidence
distribution), and the apply's actual counts equal that predicted table exactly. No count in this
document is authoritative — predictions come from the script that does the writing, never from
arithmetic in a plan.

## Task C2 — read-path switchover (drafted, held)

Does not start until C's apply confirms. Reason: C2's done-when compares live counts against the
reseeded columns, and until the reseed lands those columns still hold v1 guesses.

**Unassigned policy (ruled):** hide from nav, keep reachable. A product with no
`collection_slug`/`category_slug` is excluded from collection nav, category chips, filters, and
category grids — and stays fully live at its `/collection/$slug` PDP, in global search, and in
sitemap. No existing URL breaks. Unassigned is a normal ongoing condition served by the studio's
intake queue, not an error state.

**Scope:** every public and studio read surface resolves category from the two declared columns
only. Work proceeds surface by surface, each verified before the next:

- Catalog production: `src/lib/phase3-catalog.ts` + `scripts/bake-catalog.mjs` emit
  `collectionSlug`/`categorySlug` from the declared columns; `liveCategory` and inferred
  `displayCategory` stop being sources of truth (label comes from `taxonomy_categories`).
- Public: `/collection` (group + subcategory filters, chips, counts), `collection_.$slug`
  breadcrumbs, navigation, `CategoryTonalGrid`, collection rails, `ShopTheLookRail`, sitemap.
- Studio/admin: `admin.products.tsx` grouping and sort, `admin.photos.tsx`, `ProductEditDrawer`,
  `StudioBrowser`, `board-deck`.
- Deletions after the surfaces are clean: the keyword browse-group scorer
  (`src/lib/collection-browse-groups.ts`) and its alias/inference helpers, once ripgrep confirms
  zero importers. Anything still referenced gets a manifest, not a delete.
- `categoryFit.ts`, `productFit.ts`, `productPhysicalScale.ts`, `NormalizedProductImage.tsx` are
  untouched — the Frame Studio freeze holds. Sizing keeps reading its shelf slug, which now comes
  from the declared columns.

**Done when:** per-collection and per-category counts on `/collection` equal the database counts
for the declared columns; an unassigned row is absent from every nav/filter surface but its PDP
still returns 200; no read surface imports the keyword scorer; typecheck clean.

## Technical notes

- Legacy `inventory_items.category` (free text) and `subcategory_slug` stay in place as tracked
  deletion candidates in `docs/taxonomy-open-questions.md`, tied to Frame Studio Phase 5.
- Task D (export archive) can run any time after C. Task E (Taxonomy Studio) follows C2.

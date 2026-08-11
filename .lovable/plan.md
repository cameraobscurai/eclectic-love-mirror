# Reseed taxonomy from the v3 (Squarespace-restored + export-enriched) workbook

v3 is 588 white / 33 yellow / 14 red across 635 lead rows, with per-row provenance
(`squarespace`, `squarespace-export`, `squarespace+title`, `title`, `liveCat*`, `none`). It
supersedes v2 and the v1 seed currently in the database. Ten collections.

## 1. Blank category = unassigned, not an abort

`scripts/apply-taxonomy.mjs` currently treats any unresolvable row as off-vocabulary and exits
without writing.

- blank collection *and* blank category → skipped, reported in the "unassigned (red)" list
- a value present but off-vocabulary → still a hard abort (the typo guard for her returned file)

## 2. Export cross-check (demoted from enrichment)

The enrichment work is already in v3, so the matcher becomes a verifier, not a writer. Run the
title match from the Squarespace products export against v3 and report **disagreements** between
the scrape-derived assignment and the export's `Categories` column.

- agree → white is bulletproof, provenance noted as two independent records
- disagree → the row is demoted to yellow regardless of its current color, and lands in the review
  list. No automatic overwrite in either direction.

**Colorado rule — enforced in the matcher, not in anyone's head.** Rows whose `Product Page` starts
with `ut-` are excluded from the match index entirely. A title shared between a CO page and a UT
page must never silently pull the UT row's category. The archive README states the scope decision
verbatim: *"Colorado only — UT rows retained for record, never classified."*

## 3. Four diff buckets, including the stale-v1 bucket

The dry run writes `docs/taxonomy-v3-diff.md` with:

1. **unchanged** — v1 value equals v3 proposal
2. **changed** — v1 value differs; both shown
3. **newly assigned** — was NULL, now assigned
4. **outside workbook — currently assigned** — rows the workbook does not cover (directly or by
   family inheritance) that nevertheless carry a v1 value

Bucket 4 is the one that matters. 894 rows in `inventory_items`, 857 currently carry a collection;
the workbook covers 635 leads plus variants. Uncovered-but-assigned rows are stale v1 guesses.
They get listed explicitly and a deliberate decision — null them or keep them — is made from that
list before `--apply`. Nothing is decided by omission.

## 4. Rename `category_slug_v2` → `category_slug`

Checked: **there is no `category_slug` column.** The name is free. What exists is `category`
(legacy free-text) and `subcategory_slug` (142 rows, legacy). The `_v2` suffix was defensive
naming against those, not a real collision — so it is synonym rot with no justification and it
gets removed now, while the column is one day old and carries no external consumers.

- Migration: `ALTER TABLE inventory_items RENAME COLUMN category_slug_v2 TO category_slug`
- Update the 11 call sites: `scripts/apply-taxonomy.mjs`, `scripts/import.mjs`,
  `scripts/bake-catalog.mjs`, `src/lib/phase3-catalog.ts`, `src/lib/photos-admin.functions.ts`,
  `src/lib/collection-parents.ts`, `src/lib/products-admin.functions.ts`,
  `src/lib/inventory-images.functions.ts`, `src/routes/admin.products.tsx`,
  `src/components/admin/ProductEditDrawer.tsx`, regenerated `types.ts`
- Rename lands **before** the reseed, so every diff, doc and log written by this pass already says
  `category_slug`
- Deferred, named, not silent: `category` and `subcategory_slug` are deletion candidates once the
  legacy browse-group scorer and `categoryFit.ts` freeze lift at Frame Studio Phase 5. They go in
  `docs/taxonomy-open-questions.md` as a tracked removal, not a someday.

## 5. Apply, rebake, verify

Dry run → read the diff → resolve bucket 4 → `--apply`. Family variants inherit the lead row's
assignment. Then `scripts/bake-catalog.mjs`, confirm counts per collection on `/collection`, and
spot-check the categories whose membership moves most in the diff.

## 6. Meeting doc

`docs/taxonomy-open-questions.md` gets the 14 reds (TIVOLI ×6, LYNDEN, OVALIA, RUNA and the
remaining tray/plinth rows — all recent adds), any rows demoted to yellow by the export
cross-check, the "Candlighting" spelling, and whether Dining's small size is intentional.
Storage-under-Cocktail+Bar and the bare-"chair" boundary are marked **closed by her own historical
data**.

## Archive

`docs/archive/squarespace-products-2026-08-11.csv` plus a README recording: source (Commerce →
Export All), date, row/title/category counts (1,453 / 1,116 / 37), and the Colorado scope line.
This is the only structured record of eight years of merchandising once the subscription lapses.

## Not in this pass

- No re-scraping. Display order (`ownerSiteRank`), taxonomy and mirrored images are captured.
- No bulk asset-library pulls — one at a time, when Frame Studio's SRC_UPSCALED advisory names a
  specific soft cover.
- Frame Studio Phase 2 stays after this. The legacy browse-group scorer and the `categoryFit.ts`
  freeze are untouched until Phase 5.

## Technical notes

- Only `collection_slug` and `category_slug` are written. `import.mjs` already excludes both from
  RMS sync updates, so an inventory import cannot clobber them.
- Non-numeric `rms_id` values in the workbook (`live-maor`, `tivoli-travertine-*`) match real rows
  and use the existing string-keyed update path.

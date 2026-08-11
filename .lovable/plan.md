# Reseed taxonomy from the v2 (Squarespace-restored) workbook

The v2 workbook is 576 high / 43 medium / 16 low across 635 lead rows, with 557 rows sourced
directly from her old site's own assignments. It replaces the v1 seed that is currently in the
database. Ten collections, 31 of the 33 declared categories used.

## What changes

1. **Blank category = unassigned, not an abort.**
   `scripts/apply-taxonomy.mjs` currently treats any unresolvable row as off-vocabulary and exits
   without writing. The 16 red rows have a blank `proposed_category` on purpose. Change the rule:
   - blank collection *and* blank category → skipped, reported in an "unassigned (red)" list
   - a value that is present but not in the vocabulary → still a hard abort (this is the guard that
     catches her typos when she returns the reviewed file)

2. **Diff before write.** Add a `--diff` manifest to the dry run showing, per row, current
   `collection_slug` / `category_slug_v2` vs proposed. Output three buckets: unchanged, changed,
   newly assigned. Written to `docs/taxonomy-v2-diff.md` so the moves from the v1 guesses are
   reviewable in one place rather than inferred from collection counts.

3. **Dry run → review → apply.** Run the dry run, read the diff, then `--apply`. Family variants
   inherit the lead row's assignment exactly as today.

4. **Rebake and verify.** `scripts/bake-catalog.mjs`, then confirm collection/category counts on
   `/collection` for each of the ten collections and spot-check the categories whose membership
   moves most in the diff.

5. **Red list for the meeting.** Emit the still-unresolved rows to `docs/taxonomy-open-questions.md`
   alongside the two remaining items: the "Candlighting" spelling and whether Dining's small size
   is intentional. Storage-under-Cocktail+Bar and the bare-"chair" boundary are marked resolved by
   her historical data — no longer questions.

## The export does help — here is exactly how much

1,453 rows / 1,116 distinct titles / 37 categories. Checked against the v2 workbook:

- 462 of 635 workbook titles match a row in the export; 452 of those carry a category. This is
  independent confirmation of the restored white rows, from the source rather than the scrape.
- 173 workbook titles are absent — those are genuinely post-Squarespace products, which is the
  "here are the 59 added since" framing, sharpened.
- The export resolves 4 of the 16 reds outright: AMITOLA, DARNELL, MAOR and GEORGIA BRASS SCONCE
  were all filed under **Specialty** — a lighting bucket. Three more (GIBBS, POWEL, SHETANI trays,
  plus OXFORD FOSSIL PLINTH) exist in the export with a null category, so the title match confirms
  vintage but not filing. The six TIVOLI plinths, LYNDEN, OVALIA and RUNA are absent entirely —
  those are the real reds, and they are all recent adds.
- Second signal for the yellows: 701 rows have a null `Categories` but every row has a
  `Product Page` (`textiles`, `tableware`, `lounge`, `cocktail-bar`, `bars1`, `rugs1`, …). That
  column is a usable fallback classifier where `Categories` is empty.

So one extra step goes in front of the reseed: **enrich the workbook from the export** —
`Categories` first, `Product Page` as fallback — re-scoring confidence for the rows it touches.
Expected outcome is roughly 4 reds cleared, a meaningful share of the 43 yellows promoted, and a
verification pass on the 452 whites. Then the reseed runs against the enriched sheet.

The CSV itself gets archived at `docs/archive/squarespace-products-2026-08-11.csv` — the only
structured record of eight years of merchandising once the subscription lapses.


## Technical notes

- Only `collection_slug` and `category_slug_v2` are written. `import.mjs` already excludes both
  from RMS sync updates, so a later inventory import cannot clobber them.
- 894 rows in `inventory_items`, 857 currently carry a collection. Rows absent from the workbook
  and rows resolved as red stay NULL and stay out of navigation.
- Non-numeric `rms_id` values in the workbook (`live-maor`, `tivoli-travertine-*`) match real
  rows and are handled by the existing string-keyed update path.

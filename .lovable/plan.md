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

5. **Red list for the meeting.** Emit the 16 unresolved rows to `docs/taxonomy-open-questions.md`
   alongside the three real open items: the 16 reds, the "Candlighting" spelling, and whether
   Dining's small size is intentional. Storage-under-Cocktail+Bar and the bare-"chair" boundary
   are marked resolved by her historical data — no longer questions.

## Not in this pass

- No re-scraping of anything. Display order (`ownerSiteRank`), taxonomy, and mirrored images are
  already captured.
- No asset-library pulls. Those happen one at a time when Frame Studio's SRC_UPSCALED advisory
  names a specific soft cover.
- Frame Studio Phase 2 stays after this; the legacy browse-group scorer and `categoryFit.ts`
  freeze are untouched until Phase 5.

## The products CSV export (your task, today)

Commerce → Inventory → Export All, before the subscription lapses. Drop the file in and it gets
cross-checked against the 16 reds — some likely existed under earlier titles — and archived in
`docs/` as the only structured record of eight years of merchandising. This plan does not block
on it; the reseed runs either way.

## Technical notes

- Only `collection_slug` and `category_slug_v2` are written. `import.mjs` already excludes both
  from RMS sync updates, so a later inventory import cannot clobber them.
- 894 rows in `inventory_items`, 857 currently carry a collection. Rows absent from the workbook
  and rows resolved as red stay NULL and stay out of navigation.
- Non-numeric `rms_id` values in the workbook (`live-maor`, `tivoli-travertine-*`) match real
  rows and are handled by the existing string-keyed update path.

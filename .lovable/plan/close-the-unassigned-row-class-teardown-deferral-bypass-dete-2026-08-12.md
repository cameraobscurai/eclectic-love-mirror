# Close the unassigned-row class: teardown, deferral, bypass detector

Three producers, three fixes. You walk the 22 by hand in the studio; nothing below touches those rows.

## (a) E2E artifacts — teardown first, then delete

The 8 `ZZ E2E Test Piece …` rows are created by `inventory-e2e.spec.ts`, which currently leaves them
as draft/not-public by design. Deleting them without a teardown resets the counter and nothing else.

1. **Teardown in the spec.** Track every created row id in the spec and delete it in an
   `afterAll`/`test.afterEach` hook via the existing admin delete path (`deleteProduct`), so a run
   ends with the same row count it started with. Teardown runs even when the test body fails.
2. **Name guard, defence in depth.** A single shared predicate — title starting with `ZZ E2E` or
   `rms_id` starting with the test prefix — excluded at the catalog/public read boundary
   (`bake-catalog` + the published-overlay merge) and from Taxonomy Studio's row list. A leaked
   artifact can then never reach a public query or pollute the ledger counts, teardown or not.
3. **Delete the current 8** only after 1 and 2 are in and a full spec run leaves zero residue.

Done when: run the suite twice, row count unchanged, and a manually inserted `ZZ E2E` row is invisible
to the live catalog and to the studio.

## (b) Drawer: required taxonomy, with an explicit deferral

`createInventoryItem` today takes the legacy `category` only — no `collection_slug`/`category_slug` —
which is how Portia and Zala arrived unassigned and unnoticed.

- `/admin/new-product` gains a constrained Collection → Category pair, loaded from the taxonomy
  reference tables (same source as the studio), **required by default** to save or publish.
- Next to it: **"Decide later"**. Choosing it clears the requirement and writes
  `taxonomy_review = { confidence:'low', source:'human-deferred', reviewed:false }` with both slugs
  NULL, so the row lands in the Unassigned queue on purpose and is labelled as deliberate.
- `createInventoryItem` validates the pair server-side against `taxonomy_categories` exactly as
  `assignTaxonomy` does, and rejects an invalid pair. Omitting both slugs is only legal when the
  deferral flag is set; silent omission stops being representable.

Done when: creating without a choice is blocked, "Decide later" creates a row that shows up in the
studio's Unassigned filter tagged `human-deferred`, and an off-vocabulary pair posted directly to the
server function is rejected.

## (d) Unassigned = the bypass class, not just the unfilled class

The reseed never saw these rows because `taxonomy_review IS NULL` — null review is a reliable marker
for "row that bypassed the declared pipeline." Make that the definition:

```text
unassigned  ⟵  collection_slug IS NULL OR category_slug IS NULL OR taxonomy_review IS NULL
```

In `rowState()` in the studio, `!r.review` joins the unassigned test (currently a null-review row with
slugs falls into `needs_ruling` and hides among 600 others). Tiles in that filter show a small origin
tag — `no-review` / `human-deferred` / `unfilled` — so the queue tells you why each row is there. It
becomes a permanent detector rather than a one-time cleanup.

Done when: the Unassigned chip count equals the same SQL predicate run against the database.

## (c) Held for you

The 22 legacy stragglers stay untouched — identification calls, done by hand in the studio. The 5
Tivoli "NEED IMAGE" placeholders and retired Vanna get ASK ADRIENNE, not a forced classification.

## Technical notes

- Files: `inventory-e2e.spec.ts` (teardown), a shared `isTestArtifact()` predicate used by
  `scripts/bake-catalog.mjs`, `src/lib/phase3-catalog.ts` and `listTaxonomyRows`,
  `src/lib/inventory-images.functions.ts` (`createItemInput` + insert),
  `src/routes/admin.new-product.tsx` (dropdowns + deferral), `src/routes/admin.taxonomy.tsx`
  (`rowState`, origin tags).
- No migration required — `taxonomy_review`, `collection_slug`, `category_slug` all exist.
- R6 holds: the drawer writes human-owned fields only; RMS re-import still never clobbers them.
- Order: (a1)+(a2) → verify → (a3) delete → (b) → (d). Each step lands on its own.

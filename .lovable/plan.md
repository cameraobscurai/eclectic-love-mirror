## Subrentals reality

| Status    | Count |
|-----------|-------|
| available | 1 (Moxxi Black Dining Chair) |
| draft     | 2 |
| **total** | **3** |

Subrentals isn't a category — it's a leftover bucket with one public item. Don't build a UI for it.

## Recommendation: move Moxxi to `seating`

- Only one public item lives there. A subcategory is dead weight.
- Memory already locks the public taxonomy at 14 categories — adding a 15th breaks the contract and the navigation/overview wiring (CategoryIndex, CategoryTonalGrid, owner_site_rank, etc.).
- Moxxi is a dining chair → fits `seating` cleanly. The two draft items can be triaged later (recategorize or delete).

## Broken-image audit (full inventory)

Diffed every image URL in (a) `inventory_items.images` and (b) `src/data/inventory/current_catalog.json` against the actual `storage.objects` table across `inventory`, `squarespace-mirror`, `collection` buckets.

| Source | Refs checked | Missing in storage | Fully broken products |
|---|---|---|---|
| `inventory_items.images` (DB) | 1,574 | **0** | **0** |
| Baked catalog JSON (site reads this) | 1,023 | 2 | 0 (1 partial: Elgin Pony Bookends — still has 4 working images) |

The `inventory/inventory/<slug>/` pattern that triggered alarm bells on Moxxi is **actually correct** for 9 of the 10 root-folder products — owner uploaded them with that prefix. Only Moxxi's two files live at true bucket root, so its catalog URL was the lone drift.

**Conclusion: image health is essentially perfect.** No bulk repair needed. The Moxxi case was a one-off that hid behind subrentals (excluded from public grid → never validated against the rebake).

## Plan

1. **Recategorize Moxxi** — set `inventory_items.category = 'seating'` for `rms_id = 2746`.
2. **Re-run `scripts/bake-catalog.mjs`** so `current_catalog.json` picks up Moxxi in `seating` with the correct (single-`inventory/`) URL. This also overwrites my earlier hand-patch with a properly baked entry.
3. **Fix the 2 missing Elgin Pony bookend variant URLs** — the product has 4 working images, but 2 refs point to non-existent `inventory/elgin-pony-{bronze,silver}-bookend-set/01-*.png`. Either drop those 2 refs from `inventory_items.images` for `rms_id` 2873/2874, or upload the missing files. Drop is faster.
4. **Decide draft subrentals (2 items)** — recategorize or delete. Out of scope unless you want it now.

No category-count memory edit needed if seating goes from 102 → 103 (still under the 14-category cap; I'll update the seating count line in the index).

## Out of scope

- No new "subrentals" subcategory.
- No bulk image rebind. The audit shows none is needed.
- No nav changes.
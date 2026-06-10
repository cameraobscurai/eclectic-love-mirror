# Cocktail-Bar Editorial Order — ALL First, Subcategories Inherit

## The insight

If ALL is ordered well and ALL is strict subcategory chunks (Bars → Cocktail Tables → Community Tables → Stools → Storage), then each subcategory view is literally a slice of ALL. One ordering decision, five views stay consistent. No drift, no contradiction.

## Pipeline (cocktail-bar only, then template the rest)

```text
1. scripts/order/dump-slice.mjs cocktail-bar
     → scripts-tmp/order/cocktail-bar.slice.json
       { subcategory: [{ rms_id, title, image, family, dims }] }

2. spawn ONE capable subagent
     input: the slice JSON + image URLs grouped by subcategory
     job:   within each subcategory chunk, rank products by
              (a) family hero leads, variants follow
              (b) silhouette block: wide → square → tall
              (c) tonal flow inside each block
              (d) true outliers at chunk end
     output: { bars: [rms_id,...], cocktail-tables: [...], ... } + rationale

3. write scripts-tmp/order/cocktail-bar.proposal.json
     review in chat (titles + thumbs, no apply yet)

4. scripts/order/apply.mjs cocktail-bar --dry-run
     prints SQL: UPDATE inventory_items SET editorial_order = N WHERE rms_id = ...
     numbering: 100, 200, 300... (gaps for manual nudge later)

5. scripts/order/apply.mjs cocktail-bar --apply
     writes editorial_order column

6. scripts/bake-catalog.mjs
     editorialOrder lands in current_catalog.json

7. collection-sort-intelligence.ts "By Type" composite key becomes:
       (subcategoryPillIndex, editorial_order ?? Infinity, title)
     ALL view = chunks in pill order, each chunk in editorial order.
     Subcategory view = same chunk, same order. Guaranteed consistent.
```

## Schema (one migration)

```sql
ALTER TABLE public.inventory_items
  ADD COLUMN editorial_order INT NULL;

CREATE INDEX inventory_items_editorial_order_idx
  ON public.inventory_items (editorial_order)
  WHERE editorial_order IS NOT NULL;
```
No GRANT/RLS change (additive column on existing table). Null = unranked, sorts last.

## Sort key change (one file)

`src/lib/collection-sort-intelligence.ts` — "By Type" branch composite becomes:
```
subcategoryPillIndex * 1e9
  + (editorialOrder ?? Infinity) * 1e3
  + scrapedOrder
```
Existing owner-rank/site-rank logic stays as fallback for parents without editorial_order yet. Cocktail-bar gets the new key; other 13 parents unchanged until their pass runs.

## Three grid modes

3-col, 5-col, and Wall all consume the same sorted product array. One order = consistent across all three. Wall's masonry packing is unaffected; we're only changing sequence, not tile sizing.

## Verify

Playwright at 1874×1130: screenshot ALL + each of 5 subcategories in 3-col and 5-col. Confirm subcategory chunks in ALL match standalone subcategory views (same items, same order). Wall mode spot-check.

## Out of scope

- Other 13 parents (template after cocktail-bar lands clean)
- Admin drag-reorder UI (later, once the JSON pipeline is proven)
- Cross-parent ordering (ALL-all view)
- Pill order changes

## Risk

Low. `editorial_order` is additive + nullable, reversible by `UPDATE ... SET editorial_order = NULL`. Sort key change is gated by null-check, so unranked parents fall through to existing logic.

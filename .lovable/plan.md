## Root cause

Both tiles are merged families with no entry in the live Squarespace snapshot, so the rank pass sets `ownerSiteRank=null`. The "By Type" sorter then drops them at the tail (rank 999,999).

Same fix pattern already exists in `scripts/bake-catalog.mjs` → `MANUAL_RANK_OVERRIDES` (used for Giesel Green Fringe Lamp).

## Live tableware order (anchor positions)

```
10  LAVANYA STONEWARE       ← stoneware/dinnerware
11  EVITA 13" MARBLE CHARGER
12  OLIVE GREEN LEATHER CHARGER
14  DIALNI IRIDESCENT IVORY LEATHER CHARGER
15  ANASTASIA ANTIQUE SILVER FLATWARE  ← flatware band starts
```

## Change

Add 2 entries to `MANUAL_RANK_OVERRIDES` in `scripts/bake-catalog.mjs`:

```js
'marina-plate': { ownerSiteRank: 10.5, liveCategory: 'tableware' },
'dover-matte-oyster-plates-bowl': { ownerSiteRank: 10.7, liveCategory: 'tableware' },
```

Float ranks are sort-stable (the comparator only subtracts) and slot both tiles into the dinnerware band, before flatware kicks in at 15.

Then rebake: `node scripts/bake-catalog.mjs`.

## Verify

After rebake, on `/collection?group=tableware&subcategory=all&sort=type`:
- Marina Plate + Dover Matte appear in the upper-left dinnerware cluster (right after Lavanya Stoneware).
- Flatware/glassware/serveware order unchanged.
- Bottom-right tail no longer contains either tile.

## Why this is the right pattern

1. Declarative — sits next to existing override (Giesel Lamp), one line each.
2. No schema changes, no new alias fields.
3. Bake script already runs after every catalog rebuild, so future re-imports don't lose the placement.
4. Easy to extend when the next merged family appears.

## Not changing

- Green Sage Tassel Lumbar Pillow — already has `ownerSiteRank=62`, sorts correctly. No fix needed.
- title-aliases.json schema.
- Sort algorithm itself.
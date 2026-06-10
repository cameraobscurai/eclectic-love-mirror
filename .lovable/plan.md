# Finish the Cocktail-Bar Shelf Alignment

## Diagnosis

The 517/514/514 baseline fix only applies to the **Bars subcategory**. Every other view in the cocktail-bar group (ALL, Cocktail Tables, Community Tables, Stools, Storage) still uses center-anchored images, so each product floats at its own visual floor. That's the row-by-row drift visible in screenshots 2 and 3.

Root cause is one line in `src/routes/collection.tsx` (~L1210):
```
alignToSharedBaseline={activeParent === "cocktail-bar" && activeSubcategory === "bars"}
```

The 3 toolbar buttons are: 3-col grid · 5-col dense grid · Wall. The first two share the same `ProductTile` path and both benefit from the fix. Wall mode uses a separate component (`CollectionWallTile`) that doesn't participate in baseline math — leave it out of scope.

## Changes

**1. `src/routes/collection.tsx`** — widen the condition to the whole parent:
```
alignToSharedBaseline={activeParent === "cocktail-bar"}
```
Single-line change. Pins every cocktail-bar product (ALL view + all subcategories) to `visualBaselineY = 0.66`.

**2. `src/lib/collection-tile-presets.ts`** — add `PRODUCT_TILE_OVERRIDES` entries for the non-bar outliers visible in screenshots 2 and 3 that have baked bottom whitespace or unusual silhouettes:
- Steamer-trunk bars (open, tall) — row 1 leftmost two
- Wood-stack cocktail tables — row 1 & 2 of screenshot 3, several variants
- Bar carts (tall, thin, wheels) — row 3 of screenshot 3
- Arched storage cabinet — row 3 rightmost

Each gets a targeted `{ targetArea, maxW, maxH, visualOffsetY? }` tuned to its silhouette family (wide-furniture pattern for cocktail tables, tall-narrow pattern for carts/cabinet). Exact IDs pulled from the catalog before writing.

**3. Verify** with Playwright at 1874×1130, screenshot the ALL view + each subcategory in both 3-col and 5-col modes, measure visible product bottoms in pixels per row, confirm rows hold a shared shelf line (±3px).

## Out of Scope

- Wall mode (`CollectionWallTile`) — different render path, user did not flag it.
- Other category parents — alignment work stays scoped to cocktail-bar.
- Catalog/image re-binding.

## Risk

Low. The bottom-anchor math is already proven on bars. Widening the flag exposes more products to the same transform; outliers get per-ID overrides, not global changes. No other category is touched.

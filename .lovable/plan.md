## Goal
Confirm the cocktail/bar fix didn't leave outliers in any other category, and identify any section that still needs its own aspect override.

## Approach

Current logic: every category uses `PRODUCT_TILE_ASPECT` (4:5 portrait) + `NormalizedProductImage`. Only `cocktail-bar` is overridden to `PRODUCT_TILE_WIDE_ASPECT` (5:4 landscape). So the only categories at risk of "outlier" rows are ones with a mix of tall + wide objects, or predominantly wide silhouettes forced into a portrait frame.

Risk-ranked categories to inspect:
1. tables — mix of long dining tables (wide) and side tables (square/tall)
2. seating — sofas (very wide) vs. chairs/stools (portrait)
3. storage — consoles (wide) vs. cabinets (tall)
4. lighting — chandeliers (tall) vs. sconces (compact)
5. chandeliers — uniform tall, likely fine
6. large-decor — unknown silhouettes
7. rugs — naturally landscape, forced portrait = severe outlier risk
8. styling, candlelight, tableware, serveware, pillows-throws, furs-pelts — small/uniform, expected fine

## Execution

Spawn parallel `acp_subagent--explore` runs, one per risk category (1–7 above), each instructed to:
- Open the preview at `/collection?group=<slug>` at 1874×1130 (matches current viewport)
- Take a full-page screenshot
- Report: row alignment consistency, presence of vertical gaps, any tile where the product visually leaks/floats vs. neighbors
- Compare against a reference shot of `pillows-throws` (known-good uniform grid)

Aggregate findings into a table: `category | status (clean / minor / outlier) | offending product(s) | recommended fix (data fix vs. wide-frame override vs. per-tile normalization tweak)`.

## Deliverable

A short report in chat listing each category's status and a concrete remediation plan for any flagged section (e.g., "add `rugs` to wide-frame override", "Ovalia miscategorized, move to seating", "Anathema console silhouette too wide — reduce maxW cap"). No code changes in this pass — verification only.

## Technical notes

- All checks are read-only via the browser tool against the running preview.
- Reference files: `src/routes/collection.tsx:714` (wide-frame switch), `src/lib/collection-tile-presets.ts` (aspect constants), `src/components/collection/NormalizedProductImage.tsx` (scaling caps).
- If a fix is approved after the report, it lands as either (a) extending the `useWideProductFrame` condition, or (b) a data-layer category correction in `current_catalog.json`.

# Category-Aware Tile Fit System — Rigorous Geometric Model

## The core problem

Every silhouette exists in three coordinate systems and we've been sloppy about which one owns the constraint:

1. **Natural pixel space** — the source image `naturalWidth × naturalHeight`.
2. **Rendered frame space** — the image letterboxed/pillarboxed into the tile's 5:4 frame. `renderedW`, `renderedH` ∈ (0, 1] of tile.
3. **Silhouette space** — the measured non-background bounding box inside the rendered frame. `bw`, `bh`, `cx`, `cy`, `bottom`, `top` ∈ (0, 1] of tile.

Uniformity means: **after scale + translate, the silhouette bbox lands at prescribed (x, y, w, h) in tile space, within tolerance, or the least-bad clamp.**

## The geometry contract

For every tile we solve for a single `scale s` and translate `(tx, ty)` such that the silhouette bbox, in tile space, satisfies:

```text
  silhouette_width_after   = s · (TILE_IMAGE_INSET · renderedW · bw)
  silhouette_height_after  = s · (TILE_IMAGE_INSET · renderedH · bh)
  silhouette_bottom_after  = 0.5 + (bottom − 0.5) · s + ty
  silhouette_top_after     = 0.5 + (top    − 0.5) · s + ty
  silhouette_cx_after      = 0.5 + (cx − 0.5) · s + tx   (== target_cx)
```

Then apply the category rule as a constrained optimization:

```text
  minimize |s − s_target|
  subject to:
    silhouette_width_after   ≤ maxW
    silhouette_height_after  ≤ maxH
    anchor_after             = anchor_target     (hard equality)
    clampMin ≤ s ≤ clampMax
```

`s_target` comes from the primary axis. Caps prevent overflow on the secondary axis. Anchor equality is solved via `ty` after `s` is fixed. `tx` centers on the silhouette centroid.

## The rule shape

```ts
type FitRule = {
  // Primary axis — the one the target is measured against.
  primary: "width" | "height" | "area";
  primaryTarget: number;          // silhouette W, H, or √area in tile units

  // Secondary-axis cap (opposite of primary; ignored for area).
  secondaryMax: number;           // e.g. width primary → max height

  // Anchor: which silhouette edge is pinned, and where in the tile.
  anchor: "bottom" | "top" | "center";
  anchorY: number;                // tile-space y (0 = top, 1 = bottom)

  // Horizontal placement of the silhouette centroid.
  centerX: number;                // usually 0.5

  // Scale safety net — measurement noise or outlier photos.
  clampMin: number;
  clampMax: number;

  // Fallback when measurement fails (CORS, decode, transparent PNG).
  fallback: { scale: number; cx: number; cy: number; bottom: number; top: number };
};
```

Every field is required. No implicit defaults inside the component.

## Per-category rules

Numbers below are targets in tile-space (5:4 frame). Every category is written as (primary, target, secondaryMax, anchor@Y, centerX, clamp).

| Category | Primary | Target | Sec. cap | Anchor | AnchorY | CenterX | Clamp |
|---|---|---|---|---|---|---|---|
| seating | width | 0.82 | h ≤ 0.52 | bottom | 0.90 | 0.50 | 0.55–1.10 |
| tables | width | 0.80 | h ≤ 0.50 | bottom | 0.90 | 0.50 | 0.55–1.10 |
| bars | height | 0.60 | w ≤ 0.70 | bottom | 0.90 | 0.50 | 0.55–1.10 |
| lighting | height | 0.72 | w ≤ 0.55 | bottom | 0.92 | 0.50 | 0.50–1.15 |
| chandeliers | height | 0.78 | w ≤ 0.60 | top | 0.08 | 0.50 | 0.50–1.15 |
| candlelight | height | 0.55 | w ≤ 0.55 | bottom | 0.85 | 0.50 | 0.60–1.15 |
| tableware | area | 0.30 | — | center | 0.50 | 0.50 | 0.75–1.20 |
| serveware | area | 0.32 | — | center | 0.50 | 0.50 | 0.75–1.20 |
| pillows-throws | area | 0.42 | — | center | 0.50 | 0.50 | 0.75–1.20 |
| rugs | width | 0.88 | h ≤ 0.35 | center | 0.55 | 0.50 | 0.60–1.20 |
| large-decor | height | 0.72 | w ≤ 0.62 | bottom | 0.90 | 0.50 | 0.55–1.15 |
| storage | height | 0.68 | w ≤ 0.62 | bottom | 0.90 | 0.50 | 0.55–1.15 |
| styling | area | 0.34 | — | center | 0.55 | 0.50 | 0.75–1.20 |
| furs-pelts | area | 0.42 | — | center | 0.55 | 0.50 | 0.75–1.20 |
| default | area | 0.32 | — | center | 0.50 | 0.50 | 0.70–1.20 |

Rug secondary cap exists so a 10:1 runner doesn't span floor to ceiling. Rug anchorY = 0.55 keeps it visually grounded without floor-pinning (rugs read wrong pinned to floor line — they're on the floor).

Bars flipped to height-primary because bar carts and bar cabinets vary more in height than width; height-primary gives them a shared silhouette weight.

## Solving each rule

Given measured `renderedW, renderedH, bw, bh, cx, cy, bottom, top`:

```text
1. Compute s_target from primary:
     width:   s = primaryTarget / (INSET · renderedW · bw)
     height:  s = primaryTarget / (INSET · renderedH · bh)
     area:    s = primaryTarget / √(INSET² · renderedW · renderedH · bw · bh)

2. Compute s_cap from secondaryMax (skip for area):
     width primary  → s_cap = secondaryMax / (INSET · renderedH · bh)
     height primary → s_cap = secondaryMax / (INSET · renderedW · bw)

3. s = clamp( min(s_target, s_cap), clampMin, clampMax )

4. Solve ty from anchor equality:
     bottom: ty = anchorY − (0.5 + (bottom − 0.5) · s)
     top:    ty = anchorY − (0.5 + (top    − 0.5) · s)
     center: ty = 0.5     − (0.5 + (cy − 0.5) · s)

5. tx = centerX − (0.5 + (cx − 0.5) · s)
```

Deterministic. No hidden `visualBaselineY`, no `visualOffsetY` bolted on top.

## Fallback path

When measurement fails, `fallback` supplies pre-solved `scale, cx, cy, bottom, top` in tile-space. The same anchor solver runs on these values, so a fallback tile lands at the same anchor line as a measured tile — never floats.

## Top anchor (new)

`measureImage` currently returns `bottom` only. Extend it to also return `top = contentTop + (minY / ch) · renderedH`. Same measurement pass, zero extra cost. Required for chandeliers and any future top-anchored category.

## Debug overlay upgrades

`?debug=media` gains three lines per tile:

- Anchor line (red) at `anchorY`.
- Secondary-cap band (blue) at `anchorY ± secondaryMax / 2` for center anchors, or from `anchorY` extending against gravity for bottom/top anchors.
- Centroid crosshair (green) at `(centerX, anchorY)`.

One glance per category verifies the contract holds.

## Files

1. `src/components/collection/NormalizedProductImage.tsx`
   - Add `top` to `Fit`, extend `measureImage` to compute it.
   - Add `anchor: "bottom" | "top" | "center"` and `anchorY: number` props.
   - Replace the `fitMode`/`targetWidth`/`visualAnchorY`/`visualBaselineY` surface with the solver above.
2. `src/components/collection/categoryFit.ts` (new)
   - Rule table + `resolveFit(categorySlug): FitRule`.
3. `src/components/collection/ProductTile.tsx`
   - Delete seating branch. Read `resolveFit(product.categorySlug)`, spread onto `<NormalizedProductImage>`.
4. `src/components/collection/QuickViewModal.tsx`
   - Same resolver so tile and modal geometry match exactly.
5. `src/routes/collection.tsx`
   - Debug overlay CSS gets three lines per tile when `?debug=media`.

## Ship order

1. Extend `NormalizedProductImage` with `top`, `anchor`, `anchorY`, solver. No consumers change — old props map to new solver internally so nothing regresses.
2. Add registry + resolver. Wire `ProductTile` and `QuickViewModal`. Seating should render identically to today (rule matches current numbers).
3. QA loop, one category per pass with `?debug=media`: chandeliers → lighting → bars → tables → large-decor → storage → rugs → area categories. Adjust numbers in the registry only.
4. Once every category passes visually, remove the legacy prop names (`fitMode`, `targetWidth`, `visualAnchorY`, `visualBaselineY`) — dead code sweep.

## What this actually closes

- x-axis: centroid solved to `centerX`, no drift.
- y-axis: anchor pinned to `anchorY` by construction, not approximated.
- Floor: same anchor equation as ceiling and center — one code path, three configurations. No "floor works, ceiling doesn't" class of bug possible.
- Scale: primary target + secondary cap + clamp. Three levers, all visible, all in one file.

## Non-goals

Category cover H-plate, CategoryTonalGrid tuning, card backgrounds, focal-point admin tool, silhouette measurement algorithm.

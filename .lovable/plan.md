# Collection landing — viewport-fit pass

## What's wrong now

The `showOverview` branch in `src/routes/collection.tsx` renders an H-plate (left, desktop only) beside `<CategoryTonalGrid />` (right). Neither container has an enforced height, so:

- **Desktop**: the right column's `flex h-full flex-col` rows resolve to `h-full` of *nothing* — the parent has no defined height. Rows fall back to `min-h-[16vh]` × 4 ≈ 64vh, leaving a tall band of cream below the fold and the H-plate floats with no visual anchor. The landing fails to feel like "one screen."
- **Mobile**: the hero PNG renders at natural aspect (`h-auto`), eating ~50svh, then 4 rows × `min-h-[16vh]` adds another ~64svh — total ~114svh, so the last row gets clipped and the page scrolls before the user even acts.
- The 5-tile rows at ≤640px squeeze each tile to ~75px wide; labels truncate and tap targets fall under the iOS 44px guideline.

## The fix — three small, layered changes

### 1. Make the landing a single viewport box

In `src/routes/collection.tsx` (around lines 773–816, the `showOverview` branch), wrap the two-column grid in a container sized to the visible viewport below the nav:

```text
height: calc(100svh - var(--nav-h))
```

Use `100svh` (small viewport height) so iOS chrome doesn't clip the bottom row. The utility bar is already hidden on overview (line 614 gates it on `!showOverview`), so we don't subtract it.

The two-column wrapper becomes `h-full`; both children become `h-full min-h-0` so the flex-1 rows inside `CategoryTonalGrid` actually have a height to divide.

### 2. Mobile: stack with a fixed-share hero, grid fills the rest

Inside the same container, on `<lg`:
- Replace the natural-aspect hero `<img>` with a fixed-share band (~26svh) using `object-cover` so the H-plate reads cleanly without dominating.
- The `<CategoryTonalGrid>` then fills the remaining ~74svh. Its rows are already `flex-1`, so they'll partition that space evenly.
- Remove `min-h-[16vh]` from rows since the parent now has a real height; keep `min-h-0` to let flex shrink work.

### 3. Tile-grid: collapse 5-wide rows on small screens

In `src/components/collection/CategoryTonalGrid.tsx`, the inline `gridTemplateColumns: repeat(${row.length}, 1fr)` forces 5 columns even at 360px. Switch to a responsive rule:

- `<sm` (≤640px): cap at 3 columns. Rows of 5 wrap to 3+2; rows of 4 wrap to 3+1. The last tile in each wrapped row spans the remaining cells via `getSpanCols`-style math (or simply: `last:col-span-full` when remainder=1, otherwise no span — chosen per row length).
- `≥sm`: keep `repeat(${row.length}, 1fr)` as-is.

This keeps tap targets ≥110px wide on a 360px screen and preserves the editorial 5/5/4/4 composition on tablet+.

Concrete row-length → mobile span map:
- length 5 → 3 cols, last tile spans 1 (3+2 layout, 5th tile alone in its row spans col 1)... actually simplest: `grid-cols-3` and let cells flow naturally; `nth-last-child` rule makes the trailing 2 (for 5-rows) or 1 (for 4-rows) center themselves via `col-start-*`. We'll use a small helper that computes `gridColumn` per cell when `window.innerWidth < 640` is irrelevant — instead use Tailwind `sm:` breakpoint and a CSS-only solution:

```tsx
className="grid grid-cols-3 sm:[grid-template-columns:var(--row-cols)] min-h-0"
style={{ ['--row-cols' as string]: `repeat(${row.length}, minmax(0, 1fr))` }}
```

This way mobile is always 3 columns, ≥sm uses the per-row count. No span math needed; the trailing cells just sit in the next row, and because parent height is fixed and there are now potentially 5 rows on mobile (4 design rows × wrap), we drop one design row's split — simplest is to accept that mobile wraps to ~6 visual rows inside the 74svh band, each ~12svh tall, which is still tappable.

If 6 wrapped rows feels too tight, the alternative is to merge `sofas/chairs/benches` into a single "Seating" tile on mobile only — but that loses the sub-category drill-down the user explicitly asked for last week, so we keep wrapping.

### 4. Tone cycling stays correct after wrap

`TONES[(rowIdx + colIdx) % 3]` already produces a checkerboard regardless of column count. No change.

### 5. Image sizing inside cells

The current `sizes` attribute on the tile `<img>` assumes 5-col desktop / 2-col mobile. Update to:

```text
sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 15vw, (min-width: 640px) 20vw, 32vw"
```

Matches new 3-col mobile layout — slightly larger requests on phones, no waste on desktop.

## Files touched

- `src/routes/collection.tsx` — wrap `showOverview` branch in viewport-height container; replace mobile hero `<img>` with fixed-share band; pass `h-full` to children.
- `src/components/collection/CategoryTonalGrid.tsx` — swap row `gridTemplateColumns` for responsive CSS variable; drop `min-h-[16vh]`; update `sizes` attribute on tile image.

## Out of scope

- No new components, no new data, no changes to `CATEGORY_COVERS` or row composition.
- No changes to the product-grid branch (`!showOverview`) — that page already scrolls.
- The `H-plate` hero PNG itself is not re-cropped; we use `object-contain` desktop / `object-cover` mobile to fit it.

## Acceptance

- At 1920×1080 desktop: H-plate left, 4 tonal rows right, bottom row sits flush with viewport bottom, no scroll on the landing.
- At 375×812 iPhone: H-plate band ~26svh on top, tonal grid below filling to bottom edge, all tiles tappable (≥100px wide), no horizontal scroll.
- At 768×1024 tablet: keeps 5/5/4/4 row composition (sm breakpoint hits at 640px), uses full viewport height.

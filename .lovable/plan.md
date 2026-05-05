## What's broken on mobile

The Collection overview is currently forced into a single non-scrolling viewport on mobile:

- The outer wrapper sets `height: calc(100dvh - var(--nav-h))` + `overflow: hidden` for **all** breakpoints (collection.tsx ~line 832-839).
- Inside that fixed box the mobile branch stacks the H plate (locked to `aspect-ratio: 4/3`) on top of `<CategoryTonalGrid>` in `flex-1`.
- `CategoryTonalGrid` on mobile uses `grid-template-rows: repeat(9, 1fr)` filling its parent's height. Since the parent is whatever scraps remain after the H plate eats 4/3 of the screen width, every tile becomes a squashed letterbox strip — that's the clipped "SOFAS / CHAIRS / BENCHES & OTTOMANS…" rows in the screenshot. Tile labels get cut, the search FAB overlaps the grid, and nothing scrolls.

Desktop (md+) is fine: 40/60 split, H plate left, tonal grid right, both filling the viewport. Keep that.

## Mobile target

Match the editorial intent of the desktop split, but stacked and scrollable:

```text
┌─────────────────────────┐
│ utility bar (sticky)    │
├─────────────────────────┤
│                         │
│        ╔═══╗            │   H plate — full width,
│        ║ H ║  (chair)   │   ~square-ish, breathing room,
│        ╚═══╝            │   sits at top of page
│                         │
├─────────────────────────┤
│ ┌─────────┬───────────┐ │
│ │  SOFAS  │  CHAIRS   │ │   Tonal grid below,
│ ├─────────┼───────────┤ │   2 cols × 9 rows of
│ │ BENCHES │ COFFEE TBL│ │   square-ish tiles,
│ ├─────────┼───────────┤ │   page scrolls naturally
│ │   …     │    …      │ │
│ └─────────┴───────────┘ │
└─────────────────────────┘
```

## Changes

### 1. `src/routes/collection.tsx` — overview wrapper (lines ~822-898)

- Make the fixed-viewport box **desktop-only**. On mobile let the page scroll: drop `height: 100dvh - nav-h` and `overflow: hidden` below `md`.
- Mobile H plate: drop the `aspect-ratio: 4/3` lock. Use a contained aspect closer to `1/1` with reasonable padding so the serif "H" reads at full presence and the chair silhouette isn't cropped — same proportions the desktop column achieves naturally. Add a thin charcoal hairline at the bottom to mirror the desktop split rule.
- Remove `flex-1 min-h-0 overflow-hidden` wrapper around `<CategoryTonalGrid>` on mobile so the grid sizes from its own tile aspect ratios instead of fighting for leftover height.

### 2. `src/components/collection/CategoryTonalGrid.tsx`

The desktop grid logic (height-filling, 6×3 / 3×6) stays. Add a mobile branch that sizes from tile aspect-ratio instead of parent height:

- Below `640px`, replace `grid-template-rows: repeat(9, 1fr)` + `height: 100%` with `grid-auto-rows: 1fr` and `aspect-ratio: 2 / 9` on the grid container — OR simpler: drop `height: 100%` on mobile and give each tile `aspect-ratio: 1 / 1`. The 2-col × 9-row layout then naturally produces a tall scrollable surface of square tiles.
- Keep the checkerboard tone math (already correct for any column count).
- Bump label sizing slightly on mobile (`12px`, same `0.22em` tracking) so categories read at arm's length — current `10px` is undersized for touch browsing per the all-caps brand register.
- Ensure search FAB (currently floating bottom-right) doesn't overlap the last tile row — add `padding-bottom: 80px` on the mobile grid container OR tighten the FAB offset. Cleanest: add bottom safe-area on the overview wrapper.

### 3. Tablet sanity (640–767px)

The desktop split kicks in at `md` (768px). Between 640 and 767 we currently get a 3-col × 6-row tonal grid still inside a flex-column with H on top. Apply the same "mobile is scrollable, sized by aspect" treatment up through `md`. At `md` switch to the existing desktop split.

### 4. Verify

After implementation, browser-test at 390×844 (iPhone 14) and 820×1180 (iPad portrait):
- H plate readable, not letterboxed; chair silhouette intact.
- All 18 categories visible by scrolling, labels legible, no clipping.
- Tapping a tile still navigates into that category (existing `selectFromTile` wiring untouched).
- Sticky utility bar + nav stay pinned during scroll.
- Search FAB doesn't cover any tile.
- Desktop (≥ 1024px) unchanged — split layout, full-viewport, no scroll on overview.

## Out of scope

- No changes to the tonal grid's tile order, category covers, or selection logic.
- No changes to the desktop layout.
- No catalog, taxonomy, or data changes.

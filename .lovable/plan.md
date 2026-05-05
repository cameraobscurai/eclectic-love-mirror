## Problem

The current right grid uses `aspect-square` per cell, so its total height is locked by `(column-width × rows)` — pure math, not flexbox. When the left H-plate ends up taller than that math (the actual case at this viewport), you get a big empty cream slab below the grid. That's the "wasted space, not flex reactive" you're seeing.

The reference also shows two cells spanning **2 columns wide** (the bench and the wine glasses) for compositional rhythm — our current grid forces every cell to a uniform square.

## Fix — make the grid stretch to match the H-plate, with span variants

Switch `CategoryTonalGrid` from "fixed-aspect cells" to "fill the parent height with `1fr` rows," and let the right column's height be driven by the left H-plate (`items-stretch` on the parent — already set). Then opt a few categories into a `col-span-2` cell for the wider compositions in your reference.

```text
xl layout (5 cols × 4 rows, all rows = 1fr of grid height)
┌───────────────┬─────────┬─────────┬─────────┬─────────┐
│               │  SOFAS  │ CHAIRS  │ BENCHES & OTTOMANS │  ← wide (span 2)
│               ├─────────┼─────────┼─────────┼─────────┤
│   the HIVE    │ COFFEE  │ SIDE    │ COCKTAIL│  DINING │
│       H       ├─────────┼─────────┼─────────┼─────────┤
│   chair       │  BAR    │ STORAGE │LIGHTING │  RUGS   │
│  SIGNATURE    ├─────────┼─────────┼─────────┴─────────┤
│  COLLECTION   │PILLOWS  │ THROWS  │   LARGE DECOR     │  ← wide (span 2)
│               ├─────────┼─────────┼─────────┬─────────┤
│               │TABLEWARE│SERVEWARE│ STYLING │ ACCENTS │
└───────────────┴─────────┴─────────┴─────────┴─────────┘
```

That's 18 categories in a 5×4 grid (16 single + 2 double = 20 cells). Zero gaps, zero hard-coded math.

## Why this is reactive, not hard-coded

- Grid is `display: grid; grid-template-columns: repeat(5, 1fr); grid-auto-rows: 1fr; height: 100%;`
- Parent is the existing `lg:grid lg:grid-cols-[40%_60%] items-stretch` → both columns are the **same height** automatically.
- The H-plate decides that height (its natural intrinsic ratio at 40% column width). The grid stretches to match. Resize the window and both pieces grow/shrink in lockstep — no media-query height math, no `100vh` hacks.
- `WIDE_CELLS = new Set(["benches-ottomans", "large-decor"])` — picked because they're horizontal compositions and they fall on rows where exactly one wide cell + three single cells = 5 columns. Easy to swap later.

## Tonal checker still works

I walk the cards in render order honoring spans to compute each cell's actual `(row, col)`, then pick `TONES[(row + col) % 3]`. Spans don't break the alternation rule.

## Below xl

- **lg (4 cols)**, **sm (3)**, **base (2)**: revert each cell to `aspect-square`. The H-plate stacks above the grid on those breakpoints (already implemented), so there's no shared-height contract to honor — square cells just look like a tidy specimen grid.
- The wide-cell spans only apply at `xl:` so smaller breakpoints don't get awkward 2-col-wide cards crammed next to 1-col cards.

## Files

- **Edit** `src/components/collection/CategoryTonalGrid.tsx`
  - Drop `aspect-[5/4]` / `aspect-square` from the `<li>`.
  - Add `gridAutoRows: "1fr"` and `h-full` to the `<ul>`.
  - Add `WIDE_CELLS` set + per-card `wide` flag → `gridColumn: "span 2"` at xl.
  - Add `xlPlacement` walker to compute `(row, col)` for tonal checker with spans.
  - Wrap the inner button with a `aspect-square xl:aspect-auto` div so sub-xl breakpoints still get square cells.
  - Tighten image padding (`p-5 sm:p-7 xl:p-8`) so cutouts breathe inside the now-shorter cells.

No changes to `collection.tsx` (the parent stretch contract is already in place from the last pass).

## Out of scope

- Reordering categories (kept owner's `BROWSE_GROUP_ORDER`).
- Per-cell custom imagery beyond Sofas → Reshma (separate ask).
- Animating the wide-cell promotion on hover or anything else fancy — keep it static and editorial.

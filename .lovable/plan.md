# Dining-only width cap

## Change
1. `src/lib/collection-tile-presets.ts` — add optional `maxAspect?: number` to `TilePreset`. Set on `DINING` only: `maxAspect: 1.25`.
2. `src/components/collection/ProductTile.tsx` (~line 154) — when `preset.maxAspect` is set, wrap the `<img>` in a centered inner box with `maxWidth: calc(var(--archive-tile-media-h) * ${maxAspect})`. Image stays `object-contain` + existing pad/anchor.

Chairs are portrait (~0.9 aspect) → unaffected. Banquette/long bench/wide tables cap at ~1.25× cell height.

## Verify
After edit, screenshot at 1313w:
- `/collection?group=dining&subcategory=all` — banquette + long bench shrink, chairs unchanged
- `/collection?group=dining&subcategory=dining-chairs` — no change expected
- `/collection?group=dining&subcategory=dining-tables` — wide tables cap, pedestal tables unchanged
- `/collection?group=sofas` — no change (no maxAspect on WIDE_LOW)

Revert if any silhouette looks squashed or padding clips.

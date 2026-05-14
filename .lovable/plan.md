## Goal

Apply the wide-low normalization across every category by classifying each browse group into a **silhouette family** with tuned cell height + image padding + anchor.

## Four families

| Family | Browse groups | Cap | Pad | Anchor |
|---|---|---|---|---|
| **WIDE_LOW** (3:1+ landscape, ground-sitting) | sofas, benches-ottomans, coffee-tables, cocktail-tables, rugs, furs-pelts | `clamp(180px, 13vw, 230px)` | `pt-[10%] pb-[3%] px-[8%]` | `object-bottom` |
| **TALL_NARROW** (portrait, vertical) | side-tables, lighting, large-decor, bar, storage | `clamp(260px, 19vw, 340px)` | `p-[6%]` | `object-bottom` |
| **SMALL_OBJECT** (~1:1, single piece) | pillows, throws, tableware, serveware, styling, accents | `clamp(200px, 14vw, 260px)` | `p-[14%]` | `object-center` |
| **MIXED** (range of silhouettes) | chairs, dining | `clamp(220px, 15vw, 280px)` | `pt-[6%] pb-[3%] px-[6%]` | `object-bottom` |

## Implementation

1. **`src/lib/collection-tile-presets.ts`** (new) — single source of truth:
   ```ts
   export type TilePreset = { mediaH: string; pad: string; anchor: "bottom" | "center" };
   export const TILE_PRESETS: Record<BrowseGroupId, TilePreset> = { ... };
   export function getTilePreset(group: BrowseGroupId | null): TilePreset
   ```
   Default fallback = MIXED preset.

2. **`ProductTile.tsx`** — replace `WIDE_LOW_GROUPS` set + `padClass` ternary with `getTilePreset(spyGroup)`. Apply `pad` to `<img>` className, swap `object-bottom` for preset's anchor.

3. **`collection.tsx`** — replace the inline `visibleBatch.some(...)` height override with: derive cap from the dominant group in `visibleBatch` (or take the smallest cap among present families, so a mixed batch still respects wide-low). Apply via `--archive-tile-media-h`.

4. **`CollectionWallTile.tsx`** — same `getTilePreset` swap (already mirrors ProductTile's logic).

## Why this won't break anything

- Default preset = today's MIXED values, so any unclassified group renders identically to before.
- Sofas/benches-ottomans keep the values we just tuned.
- Tableware/serveware (currently using default 240–340px with `p-3`) get tighter cap + `p-[14%]` so plates/cups stop stretching tall.
- Lighting/large-decor keep tall cap (lamps need height) but gain consistent padding.

## Out of scope

- No taxonomy changes, no catalog edits, no business logic.
- No per-product overrides (aspect-ratio detection at load is the next layer if still needed).
- Mobile breakpoints unchanged — `clamp()` handles it.

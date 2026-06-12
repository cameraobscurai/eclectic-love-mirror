## What's actually wrong

**Atelier** — the file has a comment saying "scroll-pinned triptych — Pass 3" but no scroll-driven motion exists. Whatever was there got stripped. The screenshot you posted IS the layout we keep; only the motion is missing.

**Collection** — the wide-aspect override for bars / cocktail tables / storage is the source of the chaos. CSS Grid sizes each row to its tallest tile. With portrait + wide tiles mixed in 3-col rows, every row track inherits the tallest tile's height. `alignSelf:start` (last turn) stopped wide tiles from stretching, but it just moved the empty space below them instead of removing it. You can't have mixed aspects in a uniform grid and also have tight spacing — pick one.

## Plan

### 1. Collection grid — pick one path

**Recommended: drop the wide-aspect override entirely.** Restore the single invariant portrait frame the file's own comment promises. The wide ones look better in isolation but break the row rhythm. One aspect = clean grid.

Files:
- `src/components/collection/ProductTile.tsx` — remove `useWideFrame`, `tileAspect`, `frameAspect` branching; use `PRODUCT_TILE_ASPECT` / `PRODUCT_TILE_FRAME_ASPECT` only. Remove the `alignSelf:start` (no longer needed).
- `src/routes/admin.photos.tsx` — mirror the simplification (drop `useWideFrame`, `tileAspectFor`, `frameAspectFor`).
- Pad horizontal canvas: bump `column-gap` to `1.5rem` desktop / `1.25rem` tablet in `src/styles.css` so tiles breathe.

If you'd rather keep wide tiles, the only real fix is masonry (CSS `columns` or a JS masonry lib) — say the word and I'll go that route instead.

### 2. Atelier — re-add scroll motion

Three additions, all framer-motion (already in the bundle):

- **Hero pair fade-up** — `IMAGINED. / DESIGNED. / REALIZED.` lines stagger in on mount via `motion.h2` with delay 0/120/240ms. Eyebrow + body paragraph fade in after.
- **Section reveals** — wrap each top-level section (`THE HIVE`, capabilities, FAQ, CTA) with a `whileInView={{ opacity: 1, y: 0 }}` from `{opacity: 0, y: 24}`, `viewport={{ once: true, margin: "-15%" }}`.
- **Approach triptych pin** — the `APPROACH_STEPS` (01 Imagined / 02 Designed / 03 Realized) get a sticky container: tall outer wrapper, sticky inner that swaps the active step based on `useScroll` progress (number+label crossfade, no layout shift). Matches the "scroll-pinned triptych" the comment promised.

Files:
- `src/routes/atelier.tsx` only.

### 3. Verify

After build, screenshot `/atelier` at 1280×1800 to confirm scroll motion fires, and `/collection?cat=all` to confirm row gaps are even.

## Out of scope

- No image swaps, no copy changes, no layout reflow on atelier beyond adding motion wrappers.
- No catalog / data / inventory touched.

## Decision needed

Confirm option 1 (drop wide-aspect, single portrait frame) vs. masonry. Default is drop wide-aspect — fastest path out of the chaos.
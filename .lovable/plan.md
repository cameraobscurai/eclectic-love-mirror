## Quick honest answer first

**You're misremembering Local Love a little, and that's actually useful.** Local Love's ProductCard does a flat `index * 0.06` motion-stagger on every tile (capped at 0.5s) — basically "every card delays a tiny bit more than the previous." It looks great when the grid is small (a few dozen sneakers) and reveals top-to-bottom as you scroll because IntersectionObserver triggers each card individually with that constant per-index offset.

**That doesn't translate cleanly to Eclectic Hive.** Two reasons:

1. **Scale.** The Collection grid is ~876 products. A flat per-index delay would mean tile #500 has the same 0.5s cap as tile #18, but tiles around the same row would *also* fire from the same observer batch with no row awareness — which on a 6-col grid reads as "random tiles popping in," not "rows wiping in."
2. **Brand register.** Local Love is playful sneaker culture. Eclectic Hive is Prada/Casa Carta editorial restraint. We want subtle addiction through *rhythm*, not bounce or animation theatrics.

So we pull the **idea** (per-tile reveal stagger) and adapt it for our scale + register: **row-aware left-to-right wipe**, very short, very calm.

## What's there now

- **Product grid (`ProductTile.tsx`)**: 600px IntersectionObserver per tile, eager-loads first 12 images, fetchpriority high on first 12, but **no enter animation at all.** Tiles just appear when `near` flips. That's why it feels mechanical instead of rhythmic.
- **Category landing (`CategoryGalleryOverview.tsx`)**: Already has a stagger — but it's `idx * 0.02` flat across all cards, capped at 0.2s. On a 6-col grid the first 10 cards stagger nicely, then everything past index ~10 fires simultaneously. Reads as "first row reveals, then a clump."

## What we change

### 1. `ProductTile.tsx` — add row-aware left-to-right reveal

When a tile's `near` flips true and its image loads, fade+lift it in with a delay computed from its **column position in the current breakpoint's grid**, not its absolute index. So row 4 of the desktop 5-col grid wipes left→right in ~250ms total, then row 5 starts ~80ms later, etc.

Implementation:
- Add an `enter` state alongside `loaded`. Tile becomes "entered" when `loaded && near`.
- Animation: `opacity 0→1` + `translateY 4px→0` + tiny `filter: blur(2px)→0`. Duration 380ms, ease `[0.22, 1, 0.36, 1]` (same curve Local Love uses, same one we already use elsewhere).
- Stagger delay: `(index % colsAtCurrentBreakpoint) * 60ms`, capped at 240ms. We can't read the live column count cheaply, so we compute against the **widest** breakpoint (6 cols on xl). On narrower viewports the math still produces a pleasing left-bias because column-1 tiles get 0ms, column-6 tiles get 300ms, and CSS-grid wraps them naturally.
- First 12 tiles (above the fold) skip the delay entirely — they appear together as the page loads, no perceptible wipe. Wipe only kicks in for tiles entering via scroll.
- Reduced motion: skip animation, set entered=true immediately. (We already check `useReducedMotion`.)

This gives the "subtly addictive" feel — every scroll reveals a row that wipes in left-to-right like a curtain pull, never two rows at once, never bouncy.

### 2. `CategoryGalleryOverview.tsx` — same treatment, sized for 6-col

Replace the flat `idx * 0.02` (cap 0.2s) with the same column-modulo math: `(idx % 6) * 60ms` cap 300ms. First row staggers left→right like a card spread. Subsequent rows reveal as you scroll (which on a 5-row category landing means rows 2+ get the same wipe when they enter view).

To make rows 2+ actually wait for scroll instead of all firing together on mount, gate the animation on the same `useNearViewport` hook the product grid uses (the category overview currently animates everything on mount because there's no observer). Add a 600px-margin observer to each card so the wipe fires per-row as the user scrolls.

### 3. Don't touch image loading thresholds

EAGER_LOAD_COUNT (12), HIGH_FETCH_COUNT (12), rootMargin (600px) — all stay. Those are already tuned. We're adding **visual rhythm on top of**, not changing, the loading strategy.

## What we explicitly do NOT do

- No flat `index * 0.06` Local Love-style cascade. Wrong for 876 products.
- No motion.layout cascade. Existing layout reflow on filter change stays as-is — that's a different visual event.
- No new dependencies. framer-motion is already in use.
- No bounce, no scale, no playful elasticity. Cubic-bezier `[0.22, 1, 0.36, 1]` only.
- No change to LCP — first 12 tiles still arrive with no delay.

## Files touched

- `src/components/collection/ProductTile.tsx` — add `entered` state + motion enter animation with column-modulo delay.
- `src/components/collection/CategoryGalleryOverview.tsx` — swap flat stagger for column-modulo, add `useNearViewport` gate so rows 2+ wipe on scroll.

## Open question (one)

Column count for the modulo is hard-coded to 6 (the widest breakpoint). The cheap alternative is: pass the live column count down via a CSS var or a small `useGridCols` hook reading from a ResizeObserver. **Default plan uses the hard-coded 6** — it's good enough on every breakpoint because column 1 always gets 0ms and the wipe just feels slightly faster on narrow screens. If you want true per-breakpoint accuracy, say so and I'll add the resize-observer hook (one extra render on resize, negligible cost).

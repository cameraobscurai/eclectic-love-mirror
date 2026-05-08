
## Goal
Cut scroll-time CPU and React work on `/` without changing the visible motion. Same timing, same easing, same arrival — fewer re-renders, fewer subscriptions, lighter GPU layers.

## What's expensive today (measured by reading the code)

1. **`EvolutionNarrative.tsx`** — the biggest offender.
   - A scroll handler calls `setProgress(p)` every animation frame.
   - That re-renders the whole section, which maps over `LINES` (11 paragraphs) and recomputes inline opacity + letter-spacing for each — every frame, the entire React subtree reconciles.
   - The resize listener is registered with an inline arrow, so the cleanup `removeEventListener("resize", handler)` never matches it → leaks across navigations.
   - Scrim opacity is also a per-frame React style update.

2. **`HeroFilmstrip.tsx`** — minor but fixable.
   - 5 frames each subscribe to `scrollYProgress` via `useTransform` and render a `motion.div` with `will-change: transform` permanently set. That keeps 5 GPU layers promoted forever, even when the strip is offscreen.
   - Frames also re-render whenever `hoverId`/`audioId` change because the parent passes new closures to every child.

3. **`DestinationStack.tsx`** — already uses motion values (good), but:
   - Each card subscribes 7 motion values; `willChange: transform, opacity` is set permanently.
   - The `[perspective:1400px]` wrapper stays mounted with perspective even after resolution → keeps a stacking context active for nothing.

4. **`SmoothScroll`** — fine; no change.

## Optimizations (no visible change in motion)

### A. EvolutionNarrative — drive the reveal with CSS variables, not React state

Replace per-frame `setState` with a single `MotionValue<number>` from `useScroll({ target: sectionRef, offset: ["start start", "end end"] })`, then write progress into a CSS custom property on the section root via `useMotionValueEvent` → `el.style.setProperty('--p', value)`.

Each manifesto line gets its opacity from CSS using its own per-line variable computed once at mount:

```css
/* per <p> */
opacity: calc(var(--dim) + (1 - var(--dim)) *
  clamp(0, (var(--p) - var(--lead)) * var(--span) - var(--idx), 1));
```

- React renders the section ONCE. All 11 lines update via CSS only.
- Closer line letter-spacing also derives from `--p` via `calc()`.
- Scrim opacity → same pattern, one CSS var.
- `showFooter` stays a boolean React state, but only flips at one threshold (rare → cheap). Use `useMotionValueEvent` with a guard so it only `setShowFooter` when the boolean actually changes.
- Fix the resize listener bug (named handler so cleanup works).

Net: from O(lines) reconciliations per frame to zero React work per frame.

### B. HeroFilmstrip — share one parallax MotionValue, retire `will-change` when out of view

- Keep the existing `useScroll` and `useTransform` per frame (alternating direction is real motion, can't be collapsed).
- Replace the permanent `willChange: 'transform'` with a class that toggles `will-change-transform` only while the strip is in view (we already track `inView` via IntersectionObserver). When the strip leaves the viewport, drop `will-change` so the browser can release the layer.
- Memoize `setHoverId` / `toggleAudio` / `handleManualPlay` (already useCallback — keep). Wrap `FilmstripFrame` in `React.memo` so hover changes only re-render the entered/left frame, not all 5.
- Move `parallaxDir` derivation out of the render loop into a memoized array (cheap, but eliminates an allocation per render).

### C. DestinationStack — same `will-change` discipline, fewer always-on transforms

- Add an `IntersectionObserver` on the container; only set `willChange: 'transform, opacity'` and the `[perspective:…]` wrapper class while the stack is within `rootMargin: 200px`. Once resolved + offscreen, drop both.
- After `scrollYProgress` reaches 1, snap motion values to their resting state and stop subscribing (use `useMotionValueEvent` to set a `resolved` flag → render plain `<div>` instead of `motion.div`). Visual result identical; motion subscriptions released for the rest of the page.
- Wrap `DestinationCard` in `React.memo`.

### D. Cross-cutting

- Add `content-visibility: auto` + `contain-intrinsic-size` to the manifesto section's offscreen tail and to the destination footer block. Lets the browser skip layout/paint when not visible. Zero visual change.
- Confirm `transform-style: preserve-3d` is only applied while animating (handled in C).

## Files to touch

- `src/components/home/EvolutionNarrative.tsx` — biggest rewrite (state → motion value + CSS vars). No prop changes.
- `src/components/home/HeroFilmstrip.tsx` — `React.memo(FilmstripFrame)`, conditional `will-change`, memoized dirs array.
- `src/components/home/DestinationStack.tsx` — `React.memo(DestinationCard)`, IO-gated `will-change`/perspective, post-resolve "freeze to plain div" path.
- No new dependencies. No route or layout changes.

## Acceptance

- Visual diff on `/` scroll arc: identical pacing, identical brightness ramp on each manifesto line, identical 3D card resolution, identical filmstrip drift, identical pre-warm scrim and footer reveal.
- React DevTools Profiler while scrolling: `EvolutionNarrative` commits drop from one-per-frame to one (mount) + one (footer reveal). `HeroFilmstrip` commits only on hover of a frame, not on scroll.
- `will-change` audit: no element keeps `will-change` set while the section is offscreen.

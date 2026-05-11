# Gallery filmstrip — desktop mouse navigation

Right now `GalleryFilmstrip` is a horizontal `overflow-x-auto` snap scroller. On a trackpad it scrolls fine, but with a plain mouse there's no affordance — no scrollbar styling that invites drag, no arrows, no clickable progress. This plan adds proper desktop controls without touching mobile behavior or the lightbox.

## What to add

1. **Prev / Next arrow buttons** (desktop only, `hidden lg:flex`)
   - Two circular icon buttons floating over the filmstrip's left and right edges, vertically centered on the cards.
   - Cream stroke on charcoal, frosted/glass background to match the brand register (LiquidGlass-adjacent, not a hard pill).
   - Click → scroll the `<ul>` by exactly one card width (`itemRefs.current[activeIndex ± 1].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })`).
   - Disabled state at first/last card (reduced opacity, `aria-disabled`, no pointer events).
   - Hidden when `projects.length <= 1`.

2. **Clickable progress segments** (the existing thin bar under the strip)
   - Convert the single filled bar into N equal segment buttons (one per project).
   - Click a segment → same `scrollIntoView` call to jump to that index.
   - Active segment fills cream/55, others cream/10 — matches current visual.
   - Keyboard: each segment is a real `<button>` with `aria-label="Go to project N of M"`.

3. **Keyboard arrows on the strip itself**
   - When the filmstrip `<ul>` (or any card inside it) has focus, ArrowLeft / ArrowRight advance one card. Already partly free via native scroll, but we'll wire it explicitly so it animates smoothly to the next snap point instead of nudging pixels.

4. **Update the scroll hint copy**
   - Replace `"↔ Scroll"` with `"← →"` on desktop (the arrows now exist, so the hint becomes a legend, not an instruction). Keep the `Scroll` label on touch.

## What stays untouched

- Mobile layout, swipe behavior, snap scrolling, IntersectionObserver active-card detection.
- `GalleryProjectCard`, `GalleryIndex`, `GalleryLightbox`, filters, hero, CTA — all unchanged.
- No new dependencies. Uses existing `lucide-react` `ChevronLeft` / `ChevronRight` icons already in the bundle.
- No route, loader, or data changes.

## Files touched

- `src/components/gallery/GalleryFilmstrip.tsx` — only file modified. ~60 lines added (two buttons, segment map, scroll helper, keydown handler).

## Risk

Zero functional risk: the underlying scroller is unchanged, we're only adding controls that drive the same `scrollIntoView` API the browser already supports. If JS fails, the strip still scrolls natively.

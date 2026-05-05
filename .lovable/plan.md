# Gallery — restyle to spec

Rebuild the Gallery page to match the supplied style reference exactly. Replace the current embedded "masthead board" (gallery bar + thumbnail strip + depth card + decorative map) with a clean editorial five-section layout. Existing data (`galleryProjects`, real imagery from storage) is reused. The existing press image (`src/assets/press-glass-bar.png`) and `GalleryLightbox` are kept as-is.

## Final structure (top → bottom)

```text
1. Hero            — pt-32/40, max-w-7xl
   ├ Left:  eyebrow ("Selected Work — NN Environments")
   │        h1 "The Gallery" (font-display, light)
   └ Right: descriptor paragraph (cream/50)

2. Filter pills    — px-6/12, max-w-7xl, flex flex-wrap gap-2
   └ Active = bg-cream text-charcoal; Inactive = border-cream/20

3. Horizontal filmstrip
   ├ flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide
   ├ ProjectCard ×N (≈45vw cards, scale + opacity by active state)
   └ Progress row: 03 ─────●──────────  18  ↔ scroll
                            (sand fill)

4. Project Index   — bg-cream/5 py-16/24
   └ NN · Title · Type · Year · → arrow rows

5. CTA             — py-24/32, eyebrow + display H2 + cream button (hover bg-sand)

6. Press logos     — bg-cream py-20/28, existing press-glass-bar.png inverted
```

Lightbox open trigger: clicking any filmstrip card or any index row opens existing `GalleryLightbox`.

## Files

**New** (`src/components/gallery/`)
- `GalleryHero.tsx` — section 1, takes `{ total, descriptor }`.
- `GalleryFilters.tsx` — section 2 pills, takes `{ filters, active, counts, onChange }`.
- `GalleryFilmstrip.tsx` — section 3. Owns the horizontal scroller, IntersectionObserver-driven `activeIndex`, padded counter ("03 / 18"), sand progress bar, "↔ Scroll" hint. Renders `GalleryProjectCard` children.
- `GalleryProjectCard.tsx` — single card per spec (4/5 aspect, gradient overlay, region eyebrow, display title, meta row with dot separators, hover circle with arrow).
- `GalleryIndex.tsx` — section 4 (NN / Title / Type hidden lg / Year / arrow). Hover title goes sand.
- `GalleryCta.tsx` — section 5, links to `/contact`.

**Edited**
- `src/routes/gallery.tsx` — replace `<GalleryMasthead>` + `<GalleryCardsTrack>` block with the new section sequence; keep press bar block and `<GalleryLightbox>`. Wire `onOpen(index)` from filmstrip and index.
- `src/styles.css` — add one-time `.scrollbar-hide` rule (hide WebKit + FF scrollbars).

**Removed (no longer used)**
- `src/components/gallery/GalleryMasthead.tsx`
- `src/components/gallery/GalleryCardsTrack.tsx`
- `src/components/gallery/GalleryEnvironmentCard.tsx`
- `src/components/gallery/GalleryMap.tsx`
- `src/components/gallery/GalleryProjectIndex.tsx` (replaced by `GalleryIndex.tsx`)

## Tokens (verified vs `src/styles.css`)
- `cream`, `charcoal`, `sand` are already exposed as Tailwind colors via `--color-*` mappings (L63–66). Spec's `bg-cream / text-charcoal / bg-sand / border-cream/N` classes resolve directly. `font-display` already maps to Cormorant Garamond. No tailwind-config changes needed.

## Behavior notes
- Filmstrip `activeIndex` owned by `GalleryFilmstrip` (IntersectionObserver, threshold ~0.6 on snap-center cards) and surfaced for the progress counter/bar.
- Filter change resets scroll to start and `activeIndex` to 0.
- Mobile: cards `w-[85vw]`; progress row stays on one line.
- All new copy/labels follow the project-wide ALL CAPS rule (eyebrows, pills, CTA, index headers). Project titles stay mixed-case (proper names).
- Press image: continues to use `@/assets/press-glass-bar.png` exactly as today, in the cream-bg section.

## Out of scope
- The SVG distortion / scroll-velocity effect in the spec — defer to a follow-up after base layout is approved.
- Interactive map (decorative map removed entirely).
- Changes to `gallery-projects.ts` data shape.
- Any changes to home, collection, atelier, or contact pages.

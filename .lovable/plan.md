
# Gallery — Compact map into the fold

Right now the map sits in its own full-width section *below* the masthead, ~520px tall and styled on Mapbox's heaviest dark base. That's why it pushes everything off the fold and reads as a black slab. Fix is to move it up beside the headline (where the lead paragraph lives now), shrink it, and lighten the canvas.

## What changes on screen

```text
BEFORE                                    AFTER
─────────────────────────────────────     ─────────────────────────────────────
THE GALLERY                                THE GALLERY
6 Environments      Each project ...       6 Environments    ┌──────────────┐
                                           Each project ...  │   MAP with   │
[ALL][LUXURY][...]                                           │   pins       │
                                           [ALL][LUXURY][..] └──────────────┘
─── full-width MAP ──────────────────
│                                    │     ─── horizontal cards track ──────
│        big dark slab               │     [card][card][card] →
│                                    │
─────────────────────────────────────
─── horizontal cards track ──────
[card][card][card] →
```

Net effect: the headline, the lead, the filter pills, the map, and the first card all sit on a 1440-tall fold without scrolling.

## File-by-file

**`src/components/gallery/GalleryMasthead.tsx`**
- Add an optional `mapSlot?: ReactNode` prop.
- Right column (`lg:col-span-6`) renders `mapSlot` when provided. The lead paragraph moves under the headline in the left column at `text-[14px] text-cream/60`.
- Trim top padding from `clamp(96px, 9vw, 144px)` → `clamp(72px, 6vw, 104px)`. Headline scale from `clamp(2.75rem, 7vw, 5.5rem)` → `clamp(2.25rem, 5.5vw, 4.25rem)`.

**`src/components/gallery/GalleryMap.tsx`**
- Switch base style from `mapbox/dark-v11` to `mapbox/light-v11` and dial the canvas back toward charcoal with a single layer paint override on load: lower land/water saturation, lift `background` lightness ~10pt — so it reads as warm grey, not pitch black.
- Drop the internal "Where We've Built / Every pin, a project" caption + `06 LOCATIONS` line and the surrounding container chrome (no eyebrow row, no border). Just the map canvas — the masthead provides context.
- Container height: `clamp(220px, 22vw, 320px)` (down from `clamp(320px, 42vw, 520px)`).
- Lighten the `mapboxgl-ctrl-attrib` and zoom controls so they don't read as black chips on the new lighter canvas.
- Pin dots: smaller (10px), softer halo, label tooltip stays cream-on-charcoal but only shows on hover/active.
- Re-fit bounds to the smaller box.

**`src/routes/gallery.tsx`**
- Remove the standalone `<section>` that wraps `<GalleryMap>`.
- Pass `<GalleryMap … />` into `<GalleryMasthead mapSlot={…} />`.
- Below-fold cards-track section is unchanged.

**`src/styles.css`**
- Lighten map control chrome: `mapboxgl-ctrl-attrib` background to `rgba(245,242,237,0.55)` text on transparent; zoom buttons get a cream/15 border, no dark fill, icons un-inverted.
- Pin dot: 10px, halo `rgba(26,26,26,0.18)` outer ring, drop the heavy box-shadow stack.

## Mobile

On `<lg` the masthead grid collapses to one column, so the map stacks below the headline at full width but still bound to the same `clamp(220px, 22vw, 320px)` height — no regression, just no longer side-by-side.

## What I'm NOT changing

- Cards track, lightbox, project index, scrubber, keyboard nav, paddle buttons — all stay.
- Pin coordinates and project data — unchanged.
- Mapbox token — already wired and inlined.

Approve and I'll apply.

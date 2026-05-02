# Home — Use the reference image as the actual backdrop

Pivot. We're done iterating on multi-pane glass compositions. The uploaded image already contains the full composition (triptych glass panes, sketch + swatch moodboard behind, etched ECLECTIC HIVE wordmark in a center frosted plate). We use it as a single full-bleed backdrop and layer the live CTA bar on top.

## What stays from current home

- `100dvh`, no scroll, `lg:overflow-hidden`
- Three LiquidGlass CTAs (Atelier · Collection · Gallery) bottom-anchored
- Loaded-state stagger animation on the CTAs
- All existing route metadata in `Route.head()`

## What changes

1. Save the uploaded reference image as the hero backdrop:
   - Copy `user-uploads://omni-ea6d508c-93d0-4077-9e76-c9978b97dc3c.png` → `src/assets/home-hero.png`
   - Import it as an ES6 module: `import homeHero from "@/assets/home-hero.png"`

2. Remove the 4-aperture grid and `HomeAperture` component entirely from `src/routes/index.tsx`.

3. Remove the duplicate live `<h1>ECLECTIC HIVE</h1>` wordmark — the wordmark is already baked into the image. Rendering a second one would double-stamp it. We keep the h1 in the DOM for SEO/accessibility but make it `sr-only` (screen-reader only).

4. Render the image as a full-bleed `<img>` with `object-cover, object-center` filling the section. On wide screens this crops the edges; on narrow screens it focuses on the center plate. Add a soft bottom gradient (charcoal → transparent over the bottom 25%) so the LiquidGlass CTAs read cleanly without competing with the moodboard texture.

5. Mobile (<md): same image, `object-cover` with `object-position: 50% 35%` to keep the center plate (where the wordmark lives) above the CTAs.

## Layer stack

```text
[ <img src=homeHero> full-bleed object-cover ]   ← backdrop (the whole composition)
[ bottom gradient: transparent → charcoal/55% ]  ← legibility wash for CTAs
[ <h1 class="sr-only">ECLECTIC HIVE</h1> ]       ← invisible, for SEO/a11y
[ LiquidGlass CTA row, bottom-pinned ]           ← unchanged
```

## Files touched

- **Edit** `src/routes/index.tsx` — remove `HomeAperture` + grid, remove visible h1 stagger, add full-bleed `<img>`, keep CTA section.
- **Add** `src/assets/home-hero.png` — copied from the upload.

No data, no routes, no DB, no storage, no migrations. Only a static asset and a markup simplification.

## Honest tradeoffs

- The image is a fixed composition. We won't be able to swap individual panes or rotate moods without re-shooting. That's fine — you've now seen the multi-mood version idea and chose this. Locking it as one image is faster to ship, lighter to load (one PNG vs N glass layers + sketches), and matches the reference exactly.
- If the page is viewed on an ultrawide monitor, `object-cover` will crop the left/right edges of the moodboard. The wordmark stays centered and intact because it lives in the middle of the image.
- We keep the file at PNG to preserve the sharp etched typography on the center glass plate. If file size becomes an issue we can re-export as a high-quality WebP, but I'd ship PNG first and only optimize if there's an actual perf hit.

## QA after build

1. No scrollbar at 1303×900.
2. Wordmark renders sharp inside the center plate (no double-wordmark from the old h1).
3. CTAs remain readable against the bottom of the image.
4. Mobile view keeps the wordmark visible above the CTA stack.
5. Image actually loads (correct asset import path).
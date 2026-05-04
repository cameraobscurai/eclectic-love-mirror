## What we're doing

The Gallery page masthead currently has the mapbox + ghost card hidden via `.hide-flourishes`, which leaves a flat dark band where a hero used to live. You want to bring it back as **one full-bleed photograph** with the original frosted glass overlays floating on top (counter, "{n} Environments" headline, category pills) — so Gallery feels as cinematic as Home and Atelier instead of looking like a stripped-back placeholder.

This is a visual restoration, not a data change. No catalog, taxonomy, routing, or storage logic is touched.

## Which images work best for a full-bleed Gallery hero

Criteria for a Gallery masthead hero (different from the Home hero, which is the brand moodboard):
1. **Lands the brand promise in one frame** — sculptural, atmospheric, unmistakably an Eclectic Hive environment, not just a pretty wedding photo.
2. **Wide / horizon-anchored composition** — fills 100vw × ~85vh without losing its subject when cropped.
3. **Carries text** — has a quieter zone (sky, shadow, sand) where the white "Environments" headline + pills can sit legibly with a soft scrim.
4. **Already vetted** — pulled from a real project manifest, not invented.

### Recommended top 3 (all already in storage, already wired to gallery projects)

| # | Image | Why it works |
|---|---|---|
| **A** | `AMANGIRI/ADD ON Lounge + floral.jpg` *(Project 01 — Amangiri, Utah)* | Sandstone canyon backdrop, sculptural lounge in foreground. Horizontal landscape, warm tonality, plenty of sky/canyon negative space at top for the headline. Reads as "environment" instantly. |
| **B** | `AMANGIRI/ADD ON Welcome.jpg` *(Project 01)* | Wider vista, cinematic depth. Best "exhibition opener" feel — looks like the cover of a book. |
| **C** | `ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH/Nighttime Tablescape.jpg` *(Project 02)* | Moody, candlelit, charcoal-friendly palette — would tonally rhyme with the dark masthead and the existing site palette better than the bright Amangiri shots. Strong bottom-anchored subject leaves clean upper space for type. |

**My pick as default: A (Amangiri ADD ON Lounge + floral).** It is the single most "Eclectic Hive" frame in the entire library — sculptural furniture, atmospheric light, distinct sense of place — and Amangiri is already Project 01, so it doubles as a thesis statement for the page. B is a strong alternate if you want vista over object. C if Jill prefers a darker, moodier register that matches the rest of the dark masthead.

## How it gets built

1. **Remove `.hide-flourishes`** from `GalleryMasthead.tsx` (the temporary class added last turn) so the stage returns to full height.
2. **Replace the map slot + ghost panel** with a single `<picture>` element rendering the chosen Amangiri image full-bleed (`absolute inset-0`, `object-cover`, focal point tuned per image), the same pattern used on Home.
3. **Reapply the frosted glass overlay band** behind the heading — reuse `glassBand.dark` from `src/lib/glass.ts` (already the codified version of the Home hero's recipe), so the headline + counter sit on a tracked frosted strip rather than floating naked over the photo.
4. **Add a bottom scrim** (`linear-gradient` charcoal 0 → 55%) so the category pills stay readable regardless of image brightness.
5. **Preload the AVIF** in `head().links` (Gallery route) for LCP, mirroring Home's preload pattern.
6. **Keep `mapSlot` as an optional prop** but pass `undefined` from the route — so we can re-enable the map later by flipping one prop without re-architecting.
7. **Convert the chosen JPEG to AVIF + WebP** at hero widths (1280 / 1920 / 2560) and place under `src/assets/gallery-hero.{avif,webp}` so we get the same crisp delivery as Home (no full-resolution storage hit on first paint).

## Technical notes

- Storage URL helper is `galleriesUrl()` in `src/lib/storage-image.ts` — usable directly, but for the hero we'll bake an optimized local AVIF/WebP into `src/assets/` to match Home's preload-LCP pattern. Storage URLs stay as-is for the lightbox / cards (lazy-loaded, no LCP cost).
- `src/lib/glass.ts` already exports `glassBand.dark` — the exact recipe we want, so the overlay is one spread, not a one-off restyle.
- The `mapSlot` prop on `GalleryMasthead` stays in the API — no breaking change to the route. We just stop passing the `<GalleryMap>` for now.
- No changes to `gallery-projects.ts`, `gallery-manifests.ts`, the catalog, or any data file.

## Out of scope

- Bringing the map back (deferred until post-launch per your direction).
- The ghost "next project" peek panel (deferred — same reason).
- Any change to the cards track, lightbox, project index, or press bar below the masthead.

Confirm the image pick (A / B / C, or name another from the project manifests) and I'll build it.

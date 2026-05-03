## What this plan does

Apply your Atelier notes as a copy + structure pass on `src/routes/atelier.tsx` and a small label/tagline change in `src/components/atelier/team.tsx`. Adopt the new owner-canonical triplet **IMAGINED · DESIGNED · REALIZED** across the page (hero stack + triptych). Wire the uploaded moodboard image as the section-1 hero through the `vite-imagetools` + `HeroImage` pipeline already in place — first real test of the new container.

## Brand-language update (cross-page implication)

The Core memory currently locks Atelier as `Imagined · Refined · Crafted`. Per owner direction in this turn, the new canonical triplet for Atelier is **Imagined · Designed · Realized**. After implementation I'll update `mem://index.md` to reflect this so future passes don't drift back. No other pages are touched in this plan.

## Section-by-section changes

1. **HERO**
   - Eyebrow: `ATELIER BY THE HIVE` (unchanged)
   - New stacked headline: `IMAGINED.` / `DESIGNED.` / `REALIZED.`
   - New supporting line: "We are designers, producers, and a fabrication house. The atelier is where design authorship, material exploration, and fabrication converge — through process and intention."
   - **Right column aperture → real hero image.** Copy the uploaded moodboard to `src/assets/atelier-hero.jpg`, import via `?preset=hero`, render with `<HeroImage>` inside a 4/5 ratio wrapper, scrim `none` (the image is already low-contrast/neutral and the layout has no overlaid text), `priority` flag set, focal point `{ x: 50, y: 45 }` to keep the figure + swatches centered. Add `heroPreloadLink(atelierHeroSource)` to the route's `head().links`.

2. **THE HIVE** (was "The Humans")
   - Section eyebrow: `02 — The Hive`
   - In `team.tsx`: display title `The Humans` → `The Hive`; right-column tagline replaced with: "Our team moves across disciplines with intention and a shared approach. We are artists, designers, craftsmen. We are the atelier."
   - Roster unchanged (already matches your list 1:1; Regina stays commented out pending portrait).

3. **THE ARTIST'S STUDIO** (was "The Creative Space")
   - Eyebrow: `The Artist's Studio`
   - Display line: "Studio. Workbench. Warehouse."
   - Body copy: minor tighten, keep meaning.
   - Aperture grid (16/9 STUDIO + 4/5 WORKBENCH + 4/5 WAREHOUSE) unchanged — still owner-approved waiting state until real space photos land.

4. **THE FABRICATION** (was "Scope + Fabrication")
   - Eyebrow: `The Fabrication`
   - Capabilities list + 3× 1/1 material-board apertures unchanged.
   - Body copy unchanged.

5. **ATELIER APPROACH triptych**
   - `01 IMAGINED` — keep current body
   - `02 DESIGNED` — body: "Material exploration, scale studies, and revisions. The proposal tightens until every detail earns its place."
   - `03 REALIZED` — body: "Fabrication, finishing, and on-site install. The atelier stays with the project from first sketch to final strike."

6. **CTA** — unchanged. Headline "Bring a project to the Atelier." / button "START A CONVERSATION".

## Files touched

- `src/assets/atelier-hero.jpg` — new (copy of uploaded moodboard).
- `src/routes/atelier.tsx` — copy + label edits across all six sections; hero aperture replaced with `<HeroImage>`; preload link added.
- `src/components/atelier/team.tsx` — title + tagline change.
- `mem://index.md` — update Core line to reflect `Imagined · Designed · Realized`.

## Out of scope

- No portrait swaps; Regina still hidden.
- No new images beyond the uploaded hero.
- No structural/grid rewrite.
- No FAQ on Atelier.
- Other pages untouched (any cross-page wording sweep is a separate pass if you want it).

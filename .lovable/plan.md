## What this plan does

Two clean passes on the Atelier page:

1. **All section display titles → ALL CAPS** (per brand typography rule — display headings, eyebrows, and labels read as caps; only body/quiet italic lines stay sentence case).
2. **Strip mock/filler copy** that was never sourced from the owner's published material. Better to have an empty, designed waiting state than invented voice. We can re-add real copy later when the owner provides it.

## Section-by-section changes

### `src/routes/atelier.tsx`

1. **HERO**
   - Stacked headline already ALL CAPS (`IMAGINED. / DESIGNED. / REALIZED.`) — no change.
   - **REMOVE** the supporting paragraph: *"We are designers, producers, and a fabrication house. The atelier is where design authorship, material exploration, and fabrication converge — through process and intention."* This was synthesized from your notes, not pulled from a published source. Hero stays as eyebrow + headline + image. (If you want the one-liner back, ship it from your own words and we drop it in.)

2. **02 — THE HIVE**
   - Eyebrow already caps. The display title lives in `team.tsx` (handled below).

3. **THE ARTIST'S STUDIO**
   - Eyebrow already caps.
   - **REMOVE** the italic display line *"Studio. Workbench. Warehouse."* — invented framing.
   - **REMOVE** both body paragraphs ("The studio is a creative work hub…" and "Material exploration happens at the table…") — invented copy.
   - Section becomes: eyebrow + the existing 16/9 STUDIO + 4/5 WORKBENCH + 4/5 WAREHOUSE apertures (labels already caps). Quiet, honest, waiting for real photography + real words.

4. **THE FABRICATION**
   - Eyebrow already caps.
   - **REMOVE** the two left-column paragraphs ("Eclectic Hive is a full-service design and production house…" and "Custom pieces are designed in-house…") — invented copy.
   - Capabilities list stays (already ALL CAPS, owner-sourced from your notes / existing site language). Promote the list to span the full width on md+ now that the left column is empty, so it doesn't read as a hanging half-grid.
   - 3× 1/1 material-board apertures stay.

5. **ATELIER APPROACH**
   - Eyebrow already caps. Numbered labels (`01 IMAGINED`, `02 DESIGNED`, `03 REALIZED`) already caps.
   - **REMOVE** the three body paragraphs under each step — all three were AI-drafted. The triptych becomes: aperture + number + ALL-CAPS label only. Strong and quiet; honest until owner copy arrives.

6. **CTA**
   - "BEGIN" eyebrow already caps. Button "START A CONVERSATION" already caps.
   - Headline *"Bring a project to the Atelier."* — this one is short, on-brand, and matches the "START A CONVERSATION" CTA you explicitly listed in your notes. **Convert to ALL CAPS** display: `BRING A PROJECT TO THE ATELIER.` Keeps the closing moment loud and intentional.

### `src/components/atelier/team.tsx`

- **Display title**: `The Hive` → `THE HIVE` (uppercase via class, font-display + tracking tightened slightly to suit caps at that scale, e.g. `tracking-[0.02em]`).
- **REMOVE** the right-column tagline *"Our team moves across disciplines with intention and a shared approach. We are artists, designers, craftsmen. We are the atelier."* — this was lifted from your loose notes but never appeared on a published source you showed me. Cleaner to ship the title alone over the portrait grid. Layout collapses gracefully (the col-span-7 title just sits over the grid; right column empty).
- Roster, gating, and aperture behavior unchanged.

## What stays

- All structure, ordering, grid, apertures, and the new `<HeroImage>` pipeline.
- All eyebrows (already ALL CAPS).
- Capabilities list (sourced from your notes).
- Team roster (owner-curated).
- CTA button + route.

## Files touched

- `src/routes/atelier.tsx` — copy deletions across hero + sections 3, 4, 5; CTA headline to caps; minor grid adjustment in section 4 once left column is empty.
- `src/components/atelier/team.tsx` — title to caps, right-column tagline removed.

## Out of scope

- No new copy. We are only deleting unsourced text and uppercasing display titles.
- No image changes.
- Other pages untouched (cross-page caps audit can be a separate pass if you want one).
- Memory not updated — the existing `mem://design/typography-caps.md` already covers this rule; today's work is just enforcing it on Atelier.

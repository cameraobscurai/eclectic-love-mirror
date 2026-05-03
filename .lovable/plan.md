## What I got wrong last pass

I read your notes as "loose" and treated everything in them as filler. They're not — they're owner-sourced. The only things I should have removed were lines I made up that did NOT appear in your notes (the "studio is a creative work hub" paragraph, the "custom pieces are designed in-house" paragraph, the three Approach body paragraphs, "Studio. Workbench. Warehouse." as an italic line). Everything else came from you and should go back.

This pass restores your words verbatim, ALL CAPS where the brand rule applies (display titles, eyebrows, brand statements), Title/sentence case for the quieter italic line under THE HIVE.

## Restorations from your notes

### `src/routes/atelier.tsx`

1. **HERO — restore your supporting line, in caps.**
   Under the `IMAGINED. / DESIGNED. / REALIZED.` headline, add back:
   > **THE ATELIER IS WHERE DESIGN AUTHORSHIP, MATERIAL EXPLORATION, AND FABRICATION CONVERGE — THROUGH PROCESS & INTENTION.**

   Rendered as a wide-tracked supporting line (not body paragraph): `text-xs uppercase tracking-[0.22em] text-charcoal/70`, max-w ~52ch, sits below the headline.

   Also add a small brand-statement eyebrow above or beside, from your notes:
   > **WE ARE DESIGNERS, PRODUCERS, AND A FABRICATION HOUSE.**

   Placement: directly under the existing `ATELIER BY THE HIVE` eyebrow, same caps treatment, slightly larger weight. (Your note reads "WE DESIGNERS…" — I'm assuming the missing "ARE"; flag if you want it literal.)

2. **THE ARTIST'S STUDIO — keep apertures, don't add invented body.**
   Your notes only gave the title `THE ARTIST'S STUDIO` and `STUDIO [THE ATELIER]` as a label cue. No paragraphs of yours exist for this section. Leave it as: eyebrow + STUDIO / WORKBENCH / WAREHOUSE apertures (current state). No restoration needed here — this is the one section that genuinely had no owner copy.

3. **THE FABRICATION — capabilities list stays full-width.**
   Your notes give the section title and the `START A CONVERSATION` CTA but no body paragraph for this section either. Capabilities list (already owner-sourced) remains the sole text. No restoration needed.

4. **ATELIER APPROACH — leave number + label only.**
   Your notes give `IMAGINED. DESIGNED. REALIZED.` as the triplet, no per-step bodies. Current state is correct (number + caps label only). No restoration.

5. **CTA — already correct.**
   `BRING A PROJECT TO THE ATELIER.` + `START A CONVERSATION` button. Both match your notes.

### `src/components/atelier/team.tsx`

6. **THE HIVE — restore the tagline.**
   Your notes give it explicitly:
   > *Our team moves across disciplines with intention and a shared approach. We are artists, designers, craftsmen. We are the atelier.*

   Restore this as the right-column quiet italic line next to the `THE HIVE` display title. Keep Title/sentence case (per `mem://design/typography-caps.md` — quiet italic lines stay sentence case, only display titles + brand statements go ALL CAPS). Style: small italic, `text-charcoal/70`, leading-relaxed, sits in the right column the way it did before.

7. **Title stays `THE HIVE`** — already correct from last pass.

## What stays stripped (these were genuinely AI-written, not in your notes)

- "The studio is a creative work hub…" paragraph (Artist's Studio).
- "Material exploration happens at the table…" paragraph (Artist's Studio).
- "Eclectic Hive is a full-service design and production house…" paragraph (Fabrication).
- "Custom pieces are designed in-house…" paragraph (Fabrication).
- The three body paragraphs under IMAGINED / DESIGNED / REALIZED (Approach).
- "Studio. Workbench. Warehouse." italic line (Artist's Studio) — invented framing.

If any of those WERE actually from notes I missed, point me at them and I'll restore.

## Files touched

- `src/routes/atelier.tsx` — add brand statement eyebrow + supporting line under hero headline.
- `src/components/atelier/team.tsx` — restore right-column italic tagline next to THE HIVE.

## Out of scope

- No new images, no structure changes, no copy I didn't pull from your notes.
- "RENTALS OR INVENTORY OR — DECOR —" line in your notes reads like a category-naming question for elsewhere on the site, not Atelier copy. Leaving it alone here; flag if you want it placed.
- "HOW LONG THEY ARE ON WEBSITE" reads like an analytics question, not page copy. Leaving alone.

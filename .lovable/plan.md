## Atelier image placements

Walked the page top-to-bottom. Only filling slots where the image is the *real subject* of that slot — not decoration. Two uploads get rejected.

### Section 5 — ATELIER APPROACH triptych (the strongest fit)

This triptych is literally `IMAGINED · DESIGNED · REALIZED`. Three uploads map cleanly, one per step:

- **IMAGINED** → `omni-35789c3d` (pencil tent interior sketch, single panel)
  Hand-drawn, loose, conceptual — exactly what "Imagined" should look like.
- **DESIGNED** → `image_21.png` (sofa wireframe / technical drawing)
  CAD-style line drawing of an actual furniture piece — the "Designed" stage made literal.
- **REALIZED** → `Ceremony.webp` (Aspen aisle, fall mountains)
  A finished install standing in the world. Real, owner-produced, shareable.

Net effect: the triptych stops being three empty frames and becomes a single sentence in three pictures. This is the change that matters most.

> Note on the composite triptych upload (`omni-93d6fc71...`, sketch→render→photo): tempting because it *is* the same story, but it's a stacked composite of someone else's reference workflow, not Hive-authored work. Using the three separate uploads above keeps the triptych authentically ours.

### Section 4 — THE FABRICATION (3-up material board, currently three empty 1/1 frames)

Plan calls these "fabric swatch · sketch · material detail." Map to:

- **Slot 1 (sketch)** → `omni-9bf259f1` (charcoal still-life: glassware + florals)
  Reads as a real fabrication-room sketch. Tonal, archival.
- **Slot 2 (swatch / pattern study)** → `omni-35d37f34` (watercolor foliage + birds)
  Pattern/textile language — a material study, not decor.
- **Slot 3 (material detail)** → `Stone_Plates.webp` (stacked stone plates, real photo)
  Actual product, actual texture. Closes the row with a real material.

This row goes from "three empty squares" to a real material board: hand → study → object.

### Section 3 — THE ARTIST'S STUDIO (WORKBENCH + WAREHOUSE apertures)

**Leaving both empty.** None of the uploads are workbench or warehouse photography. Forcing the stone plates or a sketch in here would lie about what those frames are. The aperture frame already reads as intentional restraint — better than a wrong image.

### Rejected uploads (and why)

- **`omni-53094936` (glass moodboard collage)** — Beautiful, but it's a moodboard *of someone else's references*. Doesn't represent Hive work. Belonged briefly to the Home page concept; doesn't earn an Atelier slot.
- **`omni-93d6fc71` (sketch→render→photo composite)** — See note above. The story is right; the artifact isn't ours. Replaced by the three separate uploads in the triptych.

### Files I'd touch

- `src/routes/atelier.tsx` — pass real `src` + `alt` into the 3 `ApproachStep` apertures and the 3 fabrication-board apertures. No layout changes.
- `src/assets/atelier/` — copy in the 6 chosen uploads (renamed semantically, e.g. `imagined-tent-sketch.png`, `designed-sofa-wireframe.png`, `realized-aspen-ceremony.webp`, `fabrication-still-life.png`, `fabrication-foliage-study.png`, `fabrication-stone-plates.webp`).
- `MediaAperture` already supports `src`/`alt`/`sizes`/`lazy` — no component changes needed.

### What does *not* change

- Hero section (already has `atelierHero`).
- Studio wide aperture (already has `atelierStudioWide`).
- Section labels, copy, ordering, capabilities list, CTA.
- No fake captions added under any image.

Approve and I'll wire it up.
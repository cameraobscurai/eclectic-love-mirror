# Stop the untouchable cover photo

## What the glitch actually is

The public tile does not show the image you picked in the editor. Four separate layers can override slot 0, and none of them are visible or editable in admin:

1. **Normalized derivative swap** — `src/lib/normalized-cover.ts` + `src/data/inventory/normalized-covers.json`. If a product's hero matches a baked entry, the site silently renders a different file (a trimmed, re-centered 1536x1536 build artifact) instead of the photo. Admin shows the original; the site shows the derivative.
2. **Family cover locks** — `src/data/inventory/family-cover-locks.json`. A hardcoded filename substring is force-promoted to slot 0 for certain products, overriding whatever order the editor saved.
3. **"Detail shot" demotion heuristic** — `coverFirst()` in `src/lib/phase3-catalog.ts` reorders images when the filename matches detail/closeup/macro/hardware. Staff drag order gets silently rearranged by filename text.
4. **Legacy upscaled covers** — `upscaled_cover_url` still exists on the table and in scripts, though the catalog no longer reads it. It is dead weight that keeps re-entering the conversation.

Net effect: the editor is not the source of truth. That is the whole bug.

## The rule going forward

Slot 0 in the editor is the cover. Full stop. Anything the render layer does to that image must be a *derivative of the chosen image*, generated on demand, never a substitute chosen from a static file.

## Changes

**1. Retire the static normalized manifest as an override**
- Normalization stops being a lookup keyed by slug. It becomes a property of the image the admin selected.
- If a normalized derivative exists for the exact chosen hero, it is used purely as a rendering optimization (known geometry, no canvas probe). If the admin swaps the cover, the site uses the new photo immediately, and normalization is computed at upload time for it.

**2. Normalize at upload, not in a batch script**
- When an image is uploaded in the product editor, generate the normalized square derivative right then and store it alongside the original, with its silhouette box.
- Irregular uploads (odd whitespace, off-center, dark background, close crop) get normalized into the same canvas geometry as everything else, so one bad photo cannot change how neighbours are sized.

**3. Remove the hidden reorder rules**
- Delete `family-cover-locks.json` and the `coverFirst()` detail-shot heuristic.
- Any product that currently depends on a lock gets its correct cover written into the actual image order once, in the database, so the editor shows the truth.

**4. Surface it in the editor**
- The product edit drawer shows the cover exactly as the public grid will render it (normalized frame + measured silhouette), so what staff see is what ships.
- If a derivative is missing or failed validation, the drawer says so instead of silently falling back.

**5. Drop the dead upscale path**
- Remove `upscaled_cover_url` reads/writes from scripts and admin code so nobody can reintroduce a baked AI cover.

## Rollout

1. Build upload-time normalization and store geometry.
2. Backfill every current product through the same code path once; produce a report of failures rather than guessing.
3. Fold locks into real image order in the database.
4. Switch the render layer to derivative-of-chosen-hero and remove the manifest lookup, locks, and heuristic in the same release.
5. Verify with grid screenshots per category against current baselines before and after.

## Technical notes

- Touched: `src/lib/normalized-cover.ts`, `src/lib/phase3-catalog.ts`, `src/components/collection/NormalizedProductImage.tsx`, `src/components/admin/ProductEditDrawer.tsx`, `src/lib/products-admin.functions.ts`, `scripts/normalize-covers.mjs` (becomes the backfill runner for the shared function).
- No change to the physical-scale/fit math in this pass. This pass only fixes *which file* renders and *who controls it*.
- Data written: normalized derivative URL + silhouette box per image, stored with the product row so no static JSON is in the path.

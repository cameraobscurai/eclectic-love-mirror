# Grid consistency — resequenced

Your corrections hold against the code. Confirmed before planning:

- `frame-engine.ts`: every seating/table/bar/storage/large-decor rule is `anchorY: 0.9`. Only lighting (0.92) and candlelight (0.85) deviate. No intra-seating floor drift to collapse.
- `R_SEATING.aspectBlend: 0.65` → rendered bbox area ∝ aspect^(blend−1) = aspect^−0.35. That is the size gradient in the screenshot.
- `NormalizedProductImage.tsx:247` still clamps (`rule.clampMin, rule.clampMax`); the engine has no clamp band. The 281 CLAMP_MASSIVE rows are a legacy-path measurement, not a photography verdict.
- Bake coverage today: 39 of 634 rows carry `cover_framed_url` (lighting 38/45, lounge-seating 1/88, everything else 0).
- `bboxFrom` returns `hits` and `measureSilhouette` discards it.
- `PRODUCT_TILE_OVERRIDES` has one entry.

## Order of work

### 1. Finish the bake, collection by collection
Run `bake-frames.ts` per collection in the measured order (textiles → rugs → tableware → lounge-tables/dining → cocktail-bar → styling → lounge-seating → large-decor), dry run → review contact sheet → `--apply` → Publish. One collection per pass, receipts in `docs/receipts/`. This is what clears the 281 clamp defects; nothing else does.

### 2. Persist ink in that same pass
Add `hits`, centroid, and floor line to `Measurement`, thread them through `renderCover` into `cover_framed_meta`. No render change, no new URL — same bytes, richer row. Doing it during the bake avoids a second full pass.

### 3. Delete the runtime prober
Once a collection is fully framed, tiles read placement from baked meta. Then remove the 4-corner/`sort()[2]`/210 path in `NormalizedProductImage.tsx` along with `clampMin/clampMax`. Three divergence sources (sample geometry, statistic, threshold) go with it. Gate: no unframed row may fall back to the old solver — unframed products keep the current path until their collection is baked.

### 4. Fit `aspectBlend` per category against real ink
With `hits` persisted, compute per-category ink-fill ratios and solve the blend exponent that equalises *ink* mass, not bbox mass. Expect a value between 0.65 and 1.0 for seating; publish the fitted table with the harness numbers beside it. Not a guess, not a global 1.0.

### 5. Two-rule anchorY cleanup
Bring lighting (0.92) and candlelight (0.85) onto the shared 0.9 floor line, or justify each deviation in the docblock. Small, isolated, last.

## Held, not scheduled

- **Category seams / divider rows.** Browse-model decision, and at 3-up (`styles.css:225`) a divider row is proportionally heavy. Not a fix for the gradient.
- **`PRODUCT_TILE_OVERRIDES` retirement.** One entry, and its cause (angled cover out-massing elevations) is an argument for a row-mass verifier spanning the 3 tiles of a row — a later item, not a cleanup.
- **Rephotography.** ~28 covers, after the bake reveals which failures survive it.

## Rules this carries

R1 (no new bytes at a published URL), R7 (dry run → review → apply), R8 (derivatives go live only on a human Publish). Steps 3 and 4 change render output for already-baked rows and therefore require a fresh bake at a new hash, never an overwrite.

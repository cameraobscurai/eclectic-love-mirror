
## What the specialist flagged vs. what the catalog actually shows

After auditing every product in the PDF against `current_catalog.json`, most "double set image" complaints are already fixed in code from the prior pass — the live site just needs a republish. But a real list of issues remains. Splitting into three buckets:

### Bucket A — Cross-cutting feedback (already shipped, needs republish)

1. **All caps for inventory names** — done site-wide via `uppercase tracking-[0.06em]` on titles.
2. **Scrolling images that bleed off page** — added "MORE →" affordance + counter in QuickView thumbnails.
3. **"Show Scale" doesn't update with image** — fixed via `matchVariant()`; rule now follows the active image.
4. **Variant titling on listings (Vintage Silver Goblets etc.)** — variant list is now clickable and the title swaps per-image.

→ Action: confirm preview, then publish so the specialist sees these live.

### Bucket B — Real catalog cleanup still needed

| Product | Issue | Fix |
|---|---|---|
| LARIQUE | 10 images = 5 unique duplicated as `.png` and `.PNG` | Dedupe by lowercased filename, keep first |
| TABITHA | 2 set images at [0]+[1] (`image-asset.png` + `TABATHIA_Tray_Set_0.png`) | Drop the generic `image-asset.png` |
| SHETANI | Set image + 2 singles, set is duplicated as a stray | Drop `SHETANI_Set.png`, keep the two trays |
| HAZEL | 3 images: Small, Bowls (set), Large — set in middle | Reorder: set first, then Small, Large |
| LAVANYA Stoneware Bowls | Squarespace `LAVANYA+Bowls.png` is the "image of dishes" the spec saw | Replace [0] with a proper bowl set image or drop and let Small/Medium stand |
| EVITA | 2 images (stray squarespace dup); spec wants Orla-style single SKU | Collapse to one image, no variants |
| SAGE Glassware | 3 images: `Sage All Set.png`, `SAGE Rocks.png`, `SAGE Set 1.png` — two sets | Drop `SAGE Set 1.png` |
| AKOYA, MIDORI, TILLERY | Variant images still inherit family `altText` ("Akoya", "Midori", etc.) | Regenerate per-image alt from filename → variant title (same heuristic that already worked on Anastasia/Quinn) |

### Bucket C — Missing singles (catalog gap, owner needs to upload)

These need owner-supplied photos before we can wire them in. Producing one consolidated upload-request file:

- **Flatware singles missing:** DEJA (1), MIDAS (4), ALTA (0–1 depending on variant count), NISHA (6), HESTON (6), ARIAN (6), MILLIE (5), FIONA (need to verify against variant list)
- **Glassware singles missing:** BRONSON (2), NARIN (3), CARLISLE (5), ADONIS (4)
- **Dishes:** TILLERY largest plate, LAVANYA smallest plate
- **Trays:** CALLUM large tray

Output: `/mnt/documents/tableware-missing-images-v2.md` listing per-product variant→missing-file map, ready to hand to the owner.

### Bucket D — Products spec named that don't exist in catalog

Need owner clarification before any action:

- **ALMINA** — spec says "Almina – Do not need two set images" but no product matches "Almina" in 616-item catalog. Possible misspelling of ALLIRA? Or different RMS export?
- **POWELL** — spec lists under Serveware but not in catalog
- **EAGEN** — listed under Serveware, not in catalog
- **DILANI** — referenced as a model for restructuring EVITA, not in catalog

→ Action: ask owner for the RMS IDs or confirm spelling.

## Proposed execution order

1. Run a single dedupe/reorder script over `current_catalog.json` for Bucket B items (LARIQUE, TABITHA, SHETANI, HAZEL, LAVANYA Bowls, EVITA, SAGE Glassware) — diff first, then apply.
2. Regenerate per-image `altText` for AKOYA, MIDORI, TILLERY, plus a sweep across all flatware/glassware to catch any other generic alts.
3. Generate `/mnt/documents/tableware-missing-images-v2.md` for Bucket C.
4. Return Bucket D as 4 questions for the owner.
5. After approval, publish so Bucket A goes live.

## Technical notes

- Catalog is `src/data/inventory/current_catalog.json` (616 items, Set images at `position: 0, isHero: true`).
- Variant→image matching uses the existing `matchVariant()` filename heuristic in `QuickViewModal.tsx` — same regex generates new alts.
- No schema changes, no component changes. Pure data pass + one new report file.

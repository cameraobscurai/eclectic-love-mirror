## Goal

For every product family that has a "Set" group photo in `incoming-photos`, that Set image becomes the **cover** (first image) on every variant in that family. Flatware first, then every other category that has Set files.

## What's there

52 Set files in storage covering 14 categories. Flatware has 15 sets (ALTA, ANASTASIA, ARIAN, ASTRID, DEJA, DONAVER, ESTELLA, FIONA, HESTON, MIDAS, MILLIE, NISHA, QUINN, WINSLOW + any I missed). Other categories with sets: glassware (12), dinnerware (13), serveware (4), candlelight (3), styling (2), tables/columns-pedestals (4), lighting/hanging (1).

Currently these Set files were **deferred** during the v3 match run — they're sitting in storage but not bound anywhere. That's why Quinn/Sage/etc. show the variant fork as the tile and never the family Set photo.

## Plan

### 1. Build Set → family mapping (`scripts-tmp/bind-sets.mjs`)

For each Set file:
- Parse family token = first ALL-CAPS word (e.g. `QUINN Set.png` → `QUINN`)
- Map storage folder → site category (`tablewear/flatware` → `flatware`, etc. — same map already used in v3)
- Find all `inventory_items` where `category_slug` matches AND `title` starts with the family token (case-insensitive, word-boundary)
- Pick ONE canonical Set file per family (prefer no-numeric-suffix; fall back to lowest-numbered)
- Output dry-run manifest: `{ family, setUrl, matchedProducts: [...] }` to `/tmp/set-cover-manifest.json`

### 2. Review

Print summary: families × matched product counts, plus any families that matched 0 products (so we know what's a true new SKU vs. naming mismatch). I show you the manifest before any write.

### 3. Apply (`scripts-tmp/apply-set-covers.mjs`)

For each matched product:
- Read current `images[]`
- Compute `newImages = [setUrl, ...images.filter(u => u !== setUrl)]` — Set goes to position 0, no duplication
- Skip if `images[0] === setUrl` already
- Update only the `images` column. **Do not** touch `images_archive` (already snapshotted in the designer drop), do not clear color tags.

### 4. Rebake catalog

Run `node scripts/bake-catalog.mjs` so the live tiles pick up the new cover.

### 5. Hand-verify

Open `/collection?cat=flatware`. Quinn, Sage (glassware), Bulan, etc. should now show the multi-utensil group photo as the tile, not a single fork.

## Skip / safety rules

- INOLA, IRAJA, EXCURSION families — left alone, same as before.
- Families with 0 matched products → logged, not written (likely truly new SKUs needing creation).
- Multi-Set families (BULAN Set + BULAN Set 2, FLORENCE Set + FLORENCE Exact Set, SAGE Set + SAGE Set 1, BARTOLO/TOSHIA/CARLISLE/DECO/TABATHIA *_0) → use the un-suffixed / "Exact" file as cover; the others stay in storage and we can wire them as secondary later.
- Dry-run manifest written first so you can sanity-check matches before any DB write.

## Open question

Should I auto-apply across all categories in one shot after the dry-run, or do you want to eyeball flatware live first, then I run the rest?

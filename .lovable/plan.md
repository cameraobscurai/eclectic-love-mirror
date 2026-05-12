## What the CSV gives us

The Squarespace export has **1,453 product rows × 26 categories**, but only one hero image per row (no galleries). SKU is Squarespace's, not the Current RMS ID, so direct join doesn't work. Title match against current inventory lands 350 of 833 items — useful but not a silver bullet.

The real find is in the image filenames. **53 rows in the `tableware`/`dining` categories carry a `*Set*.png` family photo** — each one is a parent listing (e.g. "Anastasia Antique Silver Flatware", "Akoya", "Tabitha Copper Rimmed Tray Set") whose hero image is the exact group/fan/stack photo the owner wants on every individual SKU under that family.

Of our 109 still-broken tableware/serveware items (the ones the 41-swap pass couldn't fix because no Set photo was already in their `images[]`), the majority belong to one of those 53 families. So the CSV closes the loop on most of the remaining problem without new photography.

## Plan

### 1. Build a family→Set-image map (script, dry-run)
- Parse the 53 Squarespace family-Set rows.
- Extract a `family_key` from each title (first word, normalized — `ANASTASIA`, `WINSLOW`, `TABITHA`/`TABATHIA`, `SHETANI`, etc.).
- Output `/tmp/family-set-map.json`: `{ family_key, sq_title, sq_image_url, sq_filename }`.

### 2. Match the 109 problem items to family keys (dry-run manifest)
- For each problem item, derive its family_key the same way.
- Join against the map.
- Print a manifest: item id, title, current hero, proposed Set image URL, mirror destination path.
- Flag items with no family match for owner/Darian queue (true new-photography items).

Expected outcome from the data above: roughly 80 of the 109 will match (every Anastasia/Winslow/Quinn/etc. SKU we couldn't fix earlier, plus families like Adonis, Allira, Bronson, Carlisle, Donaver, Estella, Heston, Honey, Isla, Lapis, Larome, Marina, Midas, Midori, Millie, Narin, Nisha, Odessa, Ophidia, Orson, Perdita, Rudy, Sage, Seraphina, Tillery, Yesenia, Zahavi, Zalena, Zeva). The remaining ~30 stay on the re-shoot queue.

### 3. Owner reviews the manifest
- You read the printed table and approve.
- This is the gate before any writes.

### 4. Mirror images + apply (after approval)
- Download each unique Set URL → upload to the `squarespace-mirror` storage bucket (same pattern used in the 2026-05-07 migration).
- Update each matched item's `images[]` to put the mirrored Set URL at position 0 (preserve existing detail shots behind it).
- Re-run `bake-catalog.mjs`.

### 5. Output the re-shoot queue
- Plain CSV of items with no Squarespace Set match: id, title, category, current hero. This is what Darian shoots.

## Technical notes

- Reuses existing infra: `squarespace-mirror` bucket, the bake script, the same hero-promotion pattern as the 41-swap pass. No new tables, no new edge functions.
- Family-key normalization needs a small alias map for the known spelling drift (`TABITHA`↔`TABATHIA`, possibly `POWEL`↔`POWELL`). The script will print unmatched keys so we catch any others.
- All four scripts are dry-run-by-default with `--apply`; nothing writes without your sign-off, per the destructive-ops rule.
- Squarespace CSV gives only one image per row, so this fixes hero photos only — gallery enrichment for these families still needs the JSON-feed harvest path documented in memory.

## What this does not solve

- Items not in the Squarespace export at all (newer SKUs added since the export). Re-shoot queue.
- Families where Squarespace itself never had a Set photo (e.g. some single-piece styling items). Re-shoot queue.
- The "single photos of glassware/flatware" the owner wants *removed* from category covers — that's a separate, smaller task once the heroes are correct.

# Taxonomy — open questions

## Workbook ids with no database row (15)

Generated 2026-08-11T21:11:56.089Z by `scripts/reseed-taxonomy.mjs`. Ruled: **skip, never create** — the workbook
came from the Aug 8 bake and these products have been retired since. A workbook must never
resurrect a product. One glance at the meeting to confirm each was intentionally retired.

- MANUAL-176e0cc8
- aya-16th-century-wooden-doors
- della-half-frosted-glass-bottle
- duru-antique-clear-glass-bottle-set
- elysanda-ceremony-path-platform
- libby-glass-hinged-top-box
- lynden-horseshoe-hat-stand
- merritt-post-and-beam-structure
- remy-stainless-steel-vintage-coupe
- runa-faux-book-collection
- tivoli-travertine-22-plinth
- tivoli-travertine-24-plinth
- tivoli-travertine-32-plinth
- tivoli-travertine-mini-plinth
- tivoli-travertine-small-plinth

## Deletion tracker — dated, or it becomes a permanent resident

Every legacy column gets a drop date the day it stops being read. Undated
deletions never happen.

| Column | Status | Drop date | Guard until then |
| --- | --- | --- | --- |
| `inventory_items.upscaled_cover_url` | nulled on all 34 rows 2026-08-12; nothing reads it; both producers moved to `scripts/retired/` | **2026-08-21** (after the trust slice ships) | rules-check R9 fails CI on any write; `ALLOW_R1_OVERWRITE` blocks the retired scripts at runtime |
| `inventory_items.category` | superseded by `collection_slug` / `category_slug`; legacy diagnostics only | **2026-08-21** | not written by the admin drawer |
| `inventory_items.subcategory_slug` | superseded by `category_slug` | **2026-08-21** | not written by the admin drawer |

The upscaled PNGs stay in `squarespace-mirror/upscaled-covers/` as an archive.
No image file is deleted — dropping the column removes the pointer, not the
history.

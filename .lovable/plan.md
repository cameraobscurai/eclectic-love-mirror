# Retire the upscaled covers, for real

## Where it actually stands

Verified just now, not from memory:

- 34 rows still carry `upscaled_cover_url`. All 34 are in **lighting**.
- **Nothing reads that column anymore.** The public catalog merge, the admin table, the frame baker's source resolver, and the published overlay snapshot all take `images[0]`. The column is already excluded from the staff/admin editable field lists.
- No `images[]` entry anywhere points at an `upscaled-covers/` file (0 rows).
- Two scripts can still write it: `scripts/nano-upscale-covers.mjs` and `scripts/reframe-covers.mjs`.

So: the upscales are inert on the live site, but the data and the machinery that produced it are still sitting there, and the column is still one careless script run away from coming back.

Note on the count: 29 was live lighting rows; 34 is every row still carrying the column. Verified now, not remembered.

Adrienne's photo complaint does not need a fresh suspicion. Its three producers were each convicted and fixed already: the bake-frozen cache buster (fixed via `updated_at` version plumbing, visible in live `?v=`), the overlay merge dropping fields (fixed 22:12, round-trip receipt), and the upscaler injection on Joseph Ottoman (retired). What's missing is a receipt for an **image** round trip — the existing one only proved text.

## What to do

**1. Null the 34 rows.** Set `upscaled_cover_url = NULL` on all of them. The PNGs stay in storage under `upscaled-covers/` as archive — no file is deleted, R1 is untouched.

**2. Retire the producers + CI guard.** Move `nano-upscale-covers.mjs` and `reframe-covers.mjs` to `scripts/retired/` with a header explaining why. Add `upscaled_cover_url` to the rules check so any new write to it fails CI. This stacks on the `ALLOW_R1_OVERWRITE` runtime gate both scripts already carry — retired directory, CI column guard, runtime block.

**3. Schedule the drop; do not drop now.** No schema churn during trust-slice week. Add `DROP COLUMN inventory_items.upscaled_cover_url` to the deletion tracker in `docs/taxonomy-open-questions.md` with a concrete date — **Friday 2026-08-21**, after the trust slice ships — alongside `category` and `subcategory_slug`. Dated, not "later." Step 2's guard is what makes the nulled column safe to keep exactly that long.

**4. Image round-trip receipt.** Same discipline as the text round trip: change a lighting cover in the admin, save, publish, load the live tile, confirm new bytes at a new `?v=`, timestamps recorded, before/after screenshots, written to `docs/round-trip-receipt-image.md`. Expected outcome is a pass — which makes her complaint historical, caused by three now-fixed mechanisms, with a timestamp to show for it. If it fails, diagnose fresh from that failure.

## Afternoon order

1. Null the 34
2. Retire producers + CI guard + dated tracker entry
3. Image round-trip receipt
4. `bake-frames --apply` on lighting

The receipt runs before the apply deliberately: any surprise left in the image path should surface on one hand-edited cover, not across 38 freshly framed tiles. Then tonight's contact sheet review, and tomorrow one Publish closes lighting.

## Technical notes

- Step 1 is a data update, not a migration. No bake or publish needed — the column never entered the catalog or the overlay.
- The three comment references in `phase3-catalog.ts`, `admin.products.tsx`, and `products-admin.functions.ts` stay as-is until the 08-21 drop, then collapse to one historical note.

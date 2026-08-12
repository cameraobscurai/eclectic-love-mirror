# Retire the upscaled covers, for real

## Where it actually stands

Verified just now, not from memory:

- 34 rows still carry `upscaled_cover_url`. All 34 are in **lighting**.
- **Nothing reads that column anymore.** The public catalog merge, the admin table, the frame baker's source resolver, and the published overlay snapshot all take `images[0]`. The column is already excluded from the staff/admin editable field lists.
- No `images[]` entry anywhere points at an `upscaled-covers/` file (0 rows).
- Two scripts can still write it: `scripts/nano-upscale-covers.mjs` and `scripts/reframe-covers.mjs`.

So: the upscales are inert on the live site, but the data and the machinery that produced it are still sitting there, and the column is still one careless script run away from coming back.

Important: because nothing reads the column, **nulling it will not by itself fix "Adrienne can't change a photo."** That symptom has a different cause and needs to be reproduced, not guessed at.

## What to do

**1. Null the 34 rows.** Set `upscaled_cover_url = NULL` on all of them. The PNGs stay in storage under `upscaled-covers/` as archive — no file is deleted, R1 is untouched.

**2. Retire the producers.** Move `nano-upscale-covers.mjs` and `reframe-covers.mjs` to `scripts/retired/` with a header explaining why, so nobody re-runs them and repopulates the column. Add the column to the rules check so a new write to it fails CI.

**3. Drop the column.** After steps 1–2, a migration drops `inventory_items.upscaled_cover_url` and regenerates types. This is the part that makes it impossible to come back. If you'd rather keep the column nulled for a release before dropping, say so and I'll stop after step 2.

**4. Then chase the real photo-edit bug — separately.** Reproduce Adrienne's case end to end in the admin: change a cover on a lighting item, save, publish, load the live tile, and record what each layer returns. My working suspicion is image cache-busting (`imagesVersion`) or the overlay publish step, not the upscaler. That gets its own diagnosis with receipts before any code change. Tell me which product she was editing and I'll start there.

## Technical notes

- Step 1 is a data update, not a migration.
- Step 3's migration is `ALTER TABLE public.inventory_items DROP COLUMN upscaled_cover_url;` plus type regeneration; the three comment references in `phase3-catalog.ts`, `admin.products.tsx`, and `products-admin.functions.ts` get trimmed to a one-line historical note.
- No bake and no publish is required for steps 1–3 — the column never entered the catalog or the overlay.

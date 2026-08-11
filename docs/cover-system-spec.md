# Collection Cover System — Rebuild Spec

Handoff for Lovable. Replaces client-side silhouette normalization with an
ingest-time pipeline. Written against the eclectichive repo as of 2026-08-11.

## Core principle

**Normalize at ingest, render dumb.** Every product gets one canonical,
pre-composed cover derivative, generated server-side exactly once, verified
PASS/FAIL, stored at a content-hashed URL, cached forever. The public tile is a
fixed-aspect box containing an `object-fit: contain` image. Zero measurement,
zero solving, zero canvas in the browser.

## Why the current system cannot converge (diagnosis, for the record)

1. **Wrong layer.** Squarespace looked fine because a human composed every
   photo to a consistent size-in-frame at edit time. The migration deleted that
   human step and replaced it with `NormalizedProductImage` — a per-visitor,
   in-browser solver that must reverse-engineer composition from pixels through
   a 180px canvas and a 4-corner background heuristic. Asset problems solved in
   the render layer are re-solved on every device, forever, and can't be
   verified.
2. **Clamp saturation.** Every category rule clamps scale to roughly
   [0.7, 1.2]. The solver can therefore correct at most ±40% of input variance.
   Covers currently come from 6 storage sources / photo eras with
   product-fill ratios spanning far more than that. When a cover needs 2×
   correction, the clamp binds and it renders tiny; loosen clamps and scale >1
   on a 600w render produces the soft, cropped-into-frame tiles. "Massive /
   tiny / cropped" are all the same failure: variance outside the feasible
   region of a render-time fix.
3. **Measurement fragility.** Alpha-less images (upscaler output, JPEG-era
   scans) fall to the color-threshold path; corner-median must clear 210/255 or
   background tolerance goes to zero, bbox becomes the whole frame, and the
   grid size-normalizes the *photograph*, not the product.
4. **No closed ops loop.** 635 products, 0 focal points set. Failures have no
   queue, so they persist publicly.

Receipt: *2026-08-11 — render-time normalization with clamped scale cannot span
multi-era input variance; normalization must move to ingest where scale is
unbounded (resampled from source) and output is verifiable.*

## Architecture

### 1. Data model (migration)

```sql
alter table inventory_items add column if not exists cover_framed_url text;
alter table inventory_items add column if not exists cover_framed_meta jsonb;
-- meta: { srcUrl, srcHash, bboxPx: [x,y,w,h], method: 'alpha'|'color'|'manual',
--         scale, canvas: [1200,1500], flags: [], generatedAt, ruleVersion }
```

`cover_framed_url` is the ONLY thing the public grid reads. `images[0]`
remains the source of truth for the *source* photo; the derivative is a cache
of composition, regenerable at any time.

### 2. Framing worker (Node script first, Edge Function later)

For each product (input = live cover per the overlay-merge precedence):

1. Fetch source at full resolution.
2. **Silhouette extraction:**
   - If ≥5% of pixels have alpha < 12 → alpha bbox (threshold 12). Method `alpha`.
   - Else → border-ring median background (sample the full 1px perimeter, not
     4 corners), tolerance `max(16, (255 − min(bg)) × 0.7)`, require
     `min(bg) > 198`. Method `color`.
   - Else → **no derivative**. Flag `NEEDS_SOURCE_FIX`, enqueue for review.
     Never guess.
3. **Compose** onto a fixed 1500×1200 (5:4 — must equal PRODUCT_TILE_FRAME_ASPECT exactly; see R5 in the Phase 1 plan) transparent canvas using the
   existing category rules (port `solveFit` + the `categoryFit.ts` table into
   the worker verbatim — the math is good; the runtime was the problem).
   Scale is applied by resampling the *source* crop, so there is no clamp:
   a 40%-fill photo and a 90%-fill photo both land exactly on target.
   Bottom-anchored categories share one baseline (anchorY per rule).
4. **Flatten** onto the site background (#ffffff) or keep alpha — keep alpha;
   WebP supports it and tiles stay theme-proof.
5. Encode WebP q82 at 1200 and 600 widths. Path:
   `framed-covers/{rms_id}/{hash16}-{w}.webp` where
   `hash16 = sha256(srcHash + ruleVersion + canonicalizedPlacement).slice(0,16)`
   (placement = {scale, offsetX, offsetY, bboxPx}, 4-decimal rounding, fixed
   key order — see Phase 1 Task 1.3; a path collision therefore means an
   identical composition, so storage 409 = dedup success),
   `upsert: false`, `cacheControl: 31536000`. New source or new rule = new
   hash = new URL. **A published URL never receives new bytes** (standing
   rule from the 2026-08-11 cache incident).
6. Write `cover_framed_url` + meta, bump nothing else.

### 3. Verifier (PASS/FAIL, runs inside the worker, blocks the write)

Assert on the *output* derivative, not the input:

- V1 Silhouette bbox coverage of canvas within `primaryTarget ± 6%` on the
  rule's primary axis.
- V2 Bottom-anchored categories: silhouette bottom edge within ±2% of
  `anchorY × canvasH`.
- V3 No clipping: bbox fully inside canvas with ≥1% margin on every edge.
- V4 Background residue: perimeter ring of the derivative is fully
  transparent (alpha method) or within tolerance of flat (color method).
- V5 Output dimensions exactly 1500×1200 / 600×480.
- V6 Encoded size < 400KB at 1200w.

Any FAIL → no write, product enters the review queue with the failing
assertion named. Emit `cover-framing-report.json` per run: PASS/FAIL/flags per
rms_id. This is the number that replaces "how many are fucked."

### 4. Review queue (admin)

Reuse the FocalEditor surface. For each `NEEDS_SOURCE_FIX` / verifier-FAIL
row, the admin either:
- drags a manual bbox → worker regenerates with method `manual` (this replaces
  focal points entirely — focal was a render-time patch for a problem that no
  longer exists at render time), or
- replaces the source photo (re-edit), which regenerates automatically.

Expect 10–20% of the catalog here on first run. That queue IS the honest
answer to the audit — every broken tile becomes a ticket instead of a public
embarrassment.

### 5. Render path (the deletion)

- `ProductTile` renders `cover_framed_url` (600w src, 1200w in srcset) in the
  existing 5:4 box with `object-fit: contain`. Delete the `NormalizedProductImage`
  measurement/solver path from the public grid — keep the component only as a
  legacy fallback for rows without a derivative during migration
  (`cover_framed_url == null`).
- QuickView and detail pages keep using original `images[]` — the derivative
  is a grid composition artifact, not a replacement photo.
- Publish overlay carries `cover_framed_url` (+ `updated_at`, already added
  for cache-busting) so admin regenerations go live on Publish like everything
  else.

### 6. Migration order

Per category, mirroring the count-book gating instinct:
1. Run `cover-audit.mjs` → baseline counts (before picture, keep the CSV).
2. Run the framing worker for the category, review-queue the FAILs.
3. Visual check: contact sheet of derivatives (worker emits one per run —
   same HTML format as the audit).
4. Publish. Next category.

Seating and tables first (bottom-anchored, highest tile density, worst
current variance); tableware/styling last (center-anchored area rules are the
most forgiving and currently closest to acceptable).

## Engineering rules (keep with the repo)

- R1 A published storage URL never receives new bytes. New content = new
  hashed path + DB pointer update. (2026-08-11: 1-year cacheControl + in-place
  overwrite = invisible replacement across browser/CDN/transform caches.)
- R2 Composition happens exactly once, at ingest, server-side, against
  full-resolution sources. The browser never measures pixels.
- R3 Every derivative is verifier-gated. No PASS, no publish. Failures are
  queued, named, and human-resolved — never silently approximated.
- R4 The category rule table lives in ONE module imported by the worker; the
  client imports nothing from it. Rule change → bump `ruleVersion` →
  regenerate → new hashed URLs → diff contact sheets → publish. Tuning is now
  an offline loop with receipts, not live-traffic iteration.
- R5 Input contract for photo editing going forward: transparent-background
  PNG cutouts auto-PASS; opaque backgrounds must be near-white and flat or
  they route to manual bbox. Document this for whoever edits photos — one
  sentence to them saves the queue.
- R6 Upscaled/AI-derived images are inputs to the framer like any other, but
  their invented shadows count as silhouette; if a shadow drags V2 out of
  band, fix the source, don't bend the rule. (Standing decision: upscaled
  derivatives lost hero-slot rights once already — `upscaled_cover_url`
  retirement note in phase3-catalog.ts.)

## Acceptance criteria (what "done" looks like)

- `cover-audit.mjs` re-run against the live site reports 0 BROKEN in migrated
  categories (MEASURE_FAIL / CLAMP_* / WOULD_CLIP all zero; AT_RISK flags may
  remain as advisories).
- Any two products in the same category, screenshotted side by side, have
  silhouette primary-axis sizes within 12% of each other unless a widthMax /
  heightMax cap legitimately binds.
- Grid renders identically on any device (byte-identical derivative — no
  per-session variance).
- Lighthouse: grid images ≤ 600w WebP, no multi-MB PNG fetches, no canvas
  work on the main thread during scroll.
- Deleting `measurementCache`, `measureImage`, and `solveFit` from the client
  bundle breaks nothing in migrated categories.

## Cost of being wrong, sorted

1. **R1 (URL immutability)** — violating it silently re-poisons every cache
   layer for a year. Highest cost, zero tolerance.
2. **Verifier gating (R3)** — skipping it turns the worker into a faster way
   to publish broken tiles.
3. **Rule-table single source (R4)** — a drifted copy in the client re-creates
   two solvers disagreeing, the exact "close then not close" oscillation.
4. **Baseline lock (V2)** — off by 3% reads as sloppy but not broken;
   tunable after ship.
5. **WebP quality / size caps** — cheapest to revisit.

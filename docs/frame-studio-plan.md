# Frame Studio — The Plan

Ends the render-time cover solver permanently. Composition becomes a saved,
human-approvable artifact per product. Written 2026-08-11 against the current
eclectichive repo. Companion docs: cover-system-spec.md (architecture
rationale), cover-audit.mjs (baseline measurement).

## The one-paragraph version

Build a small admin surface ("Frame Studio") that composes every product's
cover onto a fixed 1500×1200 (5:4, matching the tile frame — R5) canvas — auto-fit by category rule, manual drag
when auto fails — and saves the flattened result as a WebP derivative at a
content-hashed URL. The public grid renders that derivative with
`object-fit: contain` and nothing else. Auto-frame runs per category in
batch; a human approves a contact sheet and fixes the stragglers in the
editor. When all 11 categories are migrated, delete the client solver.

## Why this ends the 8 months

| Today | After |
|---|---|
| Composition computed per visitor, per device, per session | Computed once, saved as pixels |
| Failure = invisible math, wrong for everyone, fixed by Darian in code | Failure = a picture in a review queue, fixed by anyone in 30s |
| Tuning loop = edit constants → deploy → squint at live site | Tuning loop = none. Rules only feed the auto-framer's first guess |
| Input variance must fit inside clamp range or tiles break | Input variance absorbed at ingest; scale is unbounded (resampling source) |
| "Done" undefined | Done = every row has an approved derivative |

## Non-negotiables (carry-over rules)

- R1: A published storage URL never receives new bytes. New composition =
  new hashed path + pointer update. (2026-08-11 cache incident.)
- R2: The browser on the PUBLIC site never measures pixels. All measurement
  lives in the studio/worker.
- R3: Auto-framed derivatives are verifier-gated (bbox on target, baseline
  locked, no clip, clean edges). FAIL = review queue, never silent publish.
- R4: The studio never edits photos — only composition. Photo problems
  (bad cutout, baked shadow, wrong crop) route to "replace source photo."

---

## Phase 0 — Freeze + baseline (half a day, you, no Lovable)

1. Run `node scripts/cover-audit.mjs`. Keep the CSV and HTML. This is the
   before-picture and the honest count.
2. Declare a freeze: no more edits to categoryFit.ts, NormalizedProductImage,
   or per-product nudges. Every hour spent there is now waste.
3. Commit the two spec docs into the repo (`docs/`) so Lovable tasks can
   reference them.

## Phase 1 — Rails (Lovable, ~1 day)

**Task 1.1 — Schema.**
```sql
alter table inventory_items
  add column if not exists cover_framed_url text,
  add column if not exists cover_framed_meta jsonb;
```
meta shape: `{ srcUrl, srcHash, bboxPx:[x,y,w,h], method:'auto-alpha'|'auto-color'|'manual',
scale, offsetX, offsetY, canvas:[1500,1200], approved:boolean, ruleVersion, generatedAt }`
Done when: columns exist, types regenerated.

**Task 1.2 — Render path with fallback.**
ProductTile: if `cover_framed_url` present → render it (600w src, 1200w
srcSet) with `object-fit: contain`, NO NormalizedProductImage, no fit rule,
no transform. Else → current path unchanged. Publish overlay + baked catalog
carry the new field (add to publish select, LiveOverlayRow, bake script).
Done when: a hand-set `cover_framed_url` on one test row renders on
/collection as a plain contained image, and rows without it look exactly as
before. **This task is the keystone — everything after is content.**

**Task 1.3 — Storage.**
Bucket path `framed-covers/{rms_id}/{hash16}-{w}.webp`, upsert:false,
cacheControl 31536000. Server function `saveFramedCover(id, blob1200,
blob600, meta)` — uploads both, writes url+meta, audits. Rejects if either
path exists with different bytes (R1).
Done when: function callable from admin, files land, row updates.

## Phase 2 — The auto-framer (Lovable, ~1–2 days)

One pure module, `src/lib/frame-engine.ts`, no React:

- `measureSilhouette(imageBitmap): { bbox, method, confidence }`
  Alpha path (≥5% transparent pixels → alpha bbox, threshold 12) or
  border-ring-median color path (full perimeter, min(bg) > 198, tolerance
  `max(16,(255−min(bg))×0.7)`). Low confidence → method 'fail'.
- `placeSilhouette(bbox, categorySlug): { scale, dx, dy }`
  Port solveFit + the categoryFit table INTO this module (then the table's
  only consumer is the framer — the client import gets deleted in Phase 5).
  No clampMin/clampMax — resampling the source means any scale is sharp.
- `composeCover(source, placement): { canvas1200, canvas600 }`
  Draw source crop onto transparent 1500×1200, high-quality resample
  (createImageBitmap + drawImage with imageSmoothingQuality 'high'; two-step
  downscale if scale < 0.5).
- `verify(canvas, categorySlug): { pass, failures[] }`
  V1 bbox coverage on primary axis within target ±6%. V2 baseline ±2%
  (bottom-anchored cats). V3 no edge contact (≥1% margin). V4 perimeter
  ring transparent. V5 exact dims.

Done when: unit-testable against 3 known images (one alpha cutout, one
white-bg opaque, one dirty-bg opaque → expect pass / pass / method 'fail').

## Phase 3 — Frame Studio UI (Lovable, ~2 days)

Route `admin/framing`. Two views:

**Category view (the workhorse).**
- Category picker → grid of all products, each tile showing: framed
  derivative if approved (green edge), auto-preview if computed (amber),
  red if method 'fail' or verifier FAIL.
- Button "Auto-frame category": runs the engine client-side over every
  product without an approved manual frame, shows results in place. Nothing
  is saved yet.
- Button "Approve all green": saves every verifier-PASS derivative via
  saveFramedCover. Amber/red remain queued.
- Progress line: "seating — 78 approved / 9 queued / 94 total".

**Editor view (click any tile).**
- Left: source photo with the detected bbox drawn, draggable/resizable.
- Right: live 5:4 tile preview at actual grid size, with baseline guide and
  target-band guides from the category rule, plus the two grid neighbors
  rendered beside it for eyeball scale-matching.
- Controls: scale slider, nudge arrows, "re-detect", "reset to auto",
  "replace source photo" (routes to existing upload flow), Save.
- Save = compose + verify (manual frames may override V1 with a confirm —
  the human IS the verifier — but V3 no-clip stays hard) + saveFramedCover
  with method 'manual'.

Done when: you can auto-frame rugs, approve greens, hand-fix one red, and
see all of it on /collection after Publish.

## Phase 4 — Migration (you + Jill's team, ~1–2 weeks calendar, low effort)

Order (audit-derived, see `docs/cover-audit-baseline.md`):

```text
pillows-throws (136) → styling (63) → tableware (41) → serveware (36) →
rugs (25) → large-decor → furs-pelts → bars/candlelight/lighting →
chandiliers/seating/storage/tables (0 broken; migrate last, they only carry
resolution advisories)
```

STRUCK, kept visible as the receipt: the original order read *"rugs (cleanest,
validates the loop) → seating → tables → bars → lighting/chandeliers →
large-decor/storage → pillows-throws → styling → serveware → tableware →
furs-pelts/candlelight"*, on the day-one prediction that rugs were cleanest and
seating worst. The audit overturned both halves — seating has 0 broken covers,
pillows-throws has 136 — because seating was photographed with margin while the
flat, tight-cropped categories saturate the clamp. This ordering is derived from
measured defect counts, not from that prediction.

Per category: Auto-frame → Approve greens → work the queue (each is a 30-second
drag or a "replace photo" ticket) → Publish → screenshot for the record. The
review queue doubles as the punch list you show the team: not "the site is
broken," but "these 9 photos need a decision."


## Phase 5 — The deletion (Lovable, half a day)

When all 11 categories show 0 unframed rows:
- ProductTile drops the fallback branch.
- Delete NormalizedProductImage usage from public routes, delete
  measurementCache, delete the client categoryFit import (table now lives
  only in frame-engine), delete PRODUCT_TILE_OVERRIDES, delete focal-point
  consumption in the grid (FocalEditor's replacement is the studio).
- Run cover-audit.mjs one last time → attach to the repo as the
  after-picture next to the Phase 0 baseline.

Receipt to write that day: *render-time solver deleted; composition is now
an ingest artifact with human override; N covers migrated, M hand-framed.*

## How to run Lovable through this

One task per prompt, in order, each ending with its Done-when as the
acceptance test — never "build the studio," always "Task 1.2, done when X."
Paste the relevant section verbatim. If Lovable proposes re-adding any live
measurement to the public grid, that's the old disease; decline and point
at R2. Phase 2 is the only task with real algorithmic content, and the
algorithms are specified above to the constant — it's transcription, not
design.

## What this costs and what it buys

Cost: ~4–5 Lovable build days + a couple weeks of light human review spread
across categories. Buys: the grid problem becomes finite and then closed;
Jill's team gets a tool instead of a ticket queue pointed at you; and every
future photo — whatever era, whatever editor, whatever upscaler — enters
through a door that manufactures consistency instead of demanding it.

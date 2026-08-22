# Frame Studio — Phase 1 (the keystone) — v2, corrected

Composition becomes a saved artifact. This plan covers Phase 1 only: the
rails that let a framed derivative exist and render, with zero change to any
product that doesn't have one yet. Phases 2–5 follow as separate approved
tasks. Supersedes all prior Phase 1 drafts — if any earlier version of this
document exists in the plan context, discard it; this text is authoritative.

## Scope of this approval

- Task 1.1 — Schema
- Task 1.2 — Render path with fallback
- Task 1.3 — Storage + save function
- Commit this file as `docs/frame-studio-phase1.md`, plus
  `docs/frame-studio-plan.md`, `docs/cover-system-spec.md`, and
  `scripts/cover-audit.mjs` (files provided alongside this plan).

Not in scope: the auto-framer engine, the studio UI, migration, deletions.
Nothing in `categoryFit.ts`, `productFit.ts`, `productPhysicalScale.ts`, or
`NormalizedProductImage.tsx` gets touched — the freeze holds.

## Canvas geometry (load-bearing — read before Task 1.1)

The derivative canvas is **1500×1200 — 5:4 landscape** — matching
`PRODUCT_TILE_FRAME_ASPECT = 5 / 4` exactly.

- **R5 (new rule):** canvas aspect equals tile frame aspect, exactly. If the
  tile aspect ever changes, bump `ruleVersion` and regenerate all
  derivatives. The verifier's dimension check (Phase 2) enforces this.
- A portrait canvas (e.g. 1200×1500) inside the landscape tile would
  letterbox on the sides and render every framed cover ~36% undersized.
  "`contain` absorbs the difference" is false for sizing purposes and must
  not appear in any phase's plan.
- Source photo aspect (including current 800×600 exports) is irrelevant to
  canvas choice: the framer crops to the silhouette bbox and discards source
  margins.

## Task 1.1 — Schema

Migration adds to `inventory_items`:

- `cover_framed_url text` — stores the **1200w** derivative URL. The 600w
  URL is derived by suffix swap (`-1200.webp` → `-600.webp`); both sizes
  share the same hash. Never store the 600w URL in this column.
- `cover_framed_meta jsonb`

Meta shape (documented, not enforced):
`{ srcUrl, srcHash, bboxPx:[x,y,w,h], method:'auto-alpha'|'auto-color'|'manual',
scale, offsetX, offsetY, canvas:[1500,1200], approved, ruleVersion, generatedAt,
advisories:[] }`

`advisories` carries non-blocking flags — first defined one is
`SRC_UPSCALED` (Phase 2 sets it when composition upscales the source

> 1.25×; it never queues or blocks).

Existing grants and RLS on the table cover the new columns; types
regenerated.

**Done when:** columns exist and appear in generated types.

## Task 1.2 — Render path with fallback

`ProductTile` gains one branch at the top of the media frame:

- `cover_framed_url` present → plain `<img>`, `object-fit: contain`, 600w
  src (suffix-swapped) + 1200w srcSet, no `NormalizedProductImage`, no fit
  rule, no transform, no measurement.
- absent → today's path, byte-for-byte unchanged.

The field is carried end to end so it can actually arrive at the tile:

- `publishCatalogOverlay` select + overlay row
  (`src/lib/photos-admin.functions.ts`)
- `LiveOverlayRow`, the merge, and the baked-product type
  (`src/lib/phase3-catalog.ts`)
- `scripts/bake-catalog.mjs` output

Scope note, on the record: this task covers `ProductTile` only.
`CollectionRail`, `CategoryTonalGrid`, and the QuickView thumbnail keep the
legacy path until a later adoption task. During migration a framed product
may look different in a rail than in the grid — expected and temporary, not
a bug.

**Done when:** hand-setting `cover_framed_url` on one test row makes it
render on /collection as a plain contained image, and every other tile is
visually identical to before.

## Task 1.3 — Storage + save function

- Path: `framed-covers/{rms_id}/{hash16}-{w}.webp` in `squarespace-mirror`,
  `upsert: false`, `cacheControl: 31536000`.
- **Hash covers everything that determines the output pixels:**
  `hash16 = sha256(srcHash + ruleVersion + canonicalizedPlacement).slice(0,16)`
  where `canonicalizedPlacement` is the JSON of
  `{ scale, offsetX, offsetY, bboxPx }` with numbers rounded to 4 decimal
  places and keys in that fixed order. A manual re-frame changes placement →
  new hash → new path. Hashing source bytes alone is wrong: it would map two
  different compositions to one path.
- **R1 consequence:** because the hash covers all pixel-determining inputs,
  a path collision means an identical composition. Treat a storage
  "already exists" / 409 as dedup success — same pattern as
  `uploadItemImage`. Do not byte-compare, do not reject, do not upsert.
- Server function `saveFramedCover(id, base64_1200, base64_600, meta)`:
  base64 transport with the same ~10MB decoded guard as `uploadItemImage` —
  no new transport pattern. Uploads both sizes, writes `cover_framed_url`
  (the 1200w URL) + `cover_framed_meta`, audits the write with the hash and
  byte sizes in metadata.

**Done when:** the function is callable from admin, both files land in
storage, a repeat call with identical inputs succeeds as a dedup (no error,
no new files), and the row updates.

## Non-negotiables carried into every later phase

- R1: a published storage URL never receives new bytes. New composition =
  new hashed path + pointer update. (This is the exact failure behind the
  Ingram cache split.)
- R2: the public site never measures pixels. If a future task proposes
  putting measurement back into the grid, decline and point here.
- R3: auto-framed derivatives are verifier-gated; FAIL goes to a review
  queue, never a silent publish. Advisories (e.g. `SRC_UPSCALED`) inform but
  never block.
- R4: the studio composes, it never retouches. Photo problems route to
  "replace source photo."
- R5: canvas aspect equals tile frame aspect, exactly; aspect change =
  `ruleVersion` bump + full regeneration.

## Input contract (forward-looking, informational this phase)

New product photo exports: **≥1600px on the long edge.** Current 800×600
exports remain acceptable — they compose cleanly at grid size and merely
earn the `SRC_UPSCALED` advisory on the retina variant. No back-catalog
re-export required; individual soft covers route through "replace source
photo."

## Technical notes

- No image bytes are generated in this phase. Nothing on the live site
  changes until a derivative exists for a product.
- Canvas constant lives in one module (Phase 2's `frame-engine.ts` will own
  it); this phase only records it in meta.

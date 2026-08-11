# Frame Studio — Phase 1 (the keystone)

Composition becomes a saved artifact. This plan covers Phase 1 only: the rails that let a framed derivative exist and render, with zero change to any product that doesn't have one yet. Phases 2–5 follow as separate approved tasks.

## Scope of this approval

- Task 1.1 — Schema
- Task 1.2 — Render path with fallback
- Task 1.3 — Storage + save function
- Commit `frame-studio-plan.md` into `docs/` so later tasks reference it verbatim

Not in this scope: the auto-framer engine, the studio UI, migration, deletions. Nothing in `categoryFit.ts`, `productFit.ts`, `productPhysicalScale.ts`, or `NormalizedProductImage.tsx` gets touched — the freeze holds.

## Task 1.1 — Schema

Migration adds to `inventory_items`:

- `cover_framed_url text`
- `cover_framed_meta jsonb`

Meta shape (documented, not enforced): `{ srcUrl, srcHash, bboxPx:[x,y,w,h], method:'auto-alpha'|'auto-color'|'manual', scale, offsetX, offsetY, canvas:[1200,1500], approved, ruleVersion, generatedAt }`

Existing grants and RLS on the table cover the new columns; types regenerated.

**Done when:** columns exist and appear in generated types.

## Task 1.2 — Render path with fallback

`ProductTile` gains one branch at the top of the media frame:

- `cover_framed_url` present → plain `<img>`, `object-fit: contain`, 600w src + 1200w srcSet, no `NormalizedProductImage`, no fit rule, no transform, no measurement.
- absent → today's path, byte-for-byte unchanged.

The field is carried end to end so it can actually arrive at the tile:

- `publishCatalogOverlay` select + overlay row (`src/lib/photos-admin.functions.ts`)
- `LiveOverlayRow`, the merge, and the baked-product type (`src/lib/phase3-catalog.ts`)
- `scripts/bake-catalog.mjs` output

**Done when:** hand-setting `cover_framed_url` on one test row makes it render on /collection as a plain contained image, and every other tile is visually identical to before.

## Task 1.3 — Storage

- Path: `framed-covers/{rms_id}/{hash16}-{w}.webp` in `squarespace-mirror`, `upsert: false`, `cacheControl: 31536000`.
- Server function `saveFramedCover(id, blob1200, blob600, meta)`: uploads both sizes, writes `cover_framed_url` + `cover_framed_meta`, audits the write.
- Rule R1 enforced: if a path already exists with different bytes, reject. New composition always means a new hashed path, never new bytes at an old URL. This is the exact failure that caused the Ingram cache split.

**Done when:** the function is callable from admin, both files land in storage, and the row updates.

## Non-negotiables carried into every later phase

- R1: a published storage URL never receives new bytes.
- R2: the public site never measures pixels. If a future task proposes putting measurement back into the grid, decline and point here.
- R3: auto-framed derivatives are verifier-gated; FAIL goes to a review queue, never a silent publish.
- R4: the studio composes, it never retouches. Photo problems route to "replace source photo."

## Technical notes

- `docs/frame-studio-plan.md` is the reference text for Phases 2–5; `cover-audit.mjs` and `cover-system-spec.md` are not in the repo yet — send them when you want them committed.
- Canvas is 1200×1500 (4:5). The public tile aspect stays as-is; `contain` absorbs the difference.
- No image bytes are generated in this phase. Nothing on the live site changes until a derivative exists for a product.

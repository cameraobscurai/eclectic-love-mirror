# Frame Studio — Phase 1 (the keystone) + one cover resolver

Composition becomes a saved artifact. Phase 1 builds the rails and, before anything else, collapses cover resolution to a single function so there is exactly one answer to "which pixels are this product's cover."

## The actual problem: eight sources, no single answer

Verified in the repo today. Covers can come from any of these:

1. Baked catalog `src/data/inventory/current_catalog.json` → `products[].images[0]`
2. Live DB overlay — `inventory_items.images` read at runtime (`fetchLiveOverlay`)
3. Published overlay snapshot from `publishCatalogOverlay`
4. Family rollup — a variant member's photo promoted as the family hero, plus `LOCKED_REFERENCE_COVERS`
5. `card_background_url` — a separate editorial backdrop column
6. Three storage prefixes with different eras and conventions: `incoming-photos/*` (~1.4k files), `squarespace-mirror/*` (~230), `inventory/*` (~100)
7. Per-surface URL rewriting: `withCdnWidth` / `buildCdnSrcSet` with a raw-URL `onError` fallback, plus `?v=imagesVersion` busting
8. `upscaled_cover_url` — dead data still in the table, and `originals-backup/*` still in storage

Nine surfaces each pick a cover independently (`ProductTile`, `CollectionWallTile`, `CategoryTonalGrid`, `CategoryOverview`, `RelatedPieces`, `CollectionRail`, `QuickViewModal`, `ProductStage`, plus every admin list). That is why admin and public can disagree, and why a storage overwrite produced two different Ingrams.

Frame Studio only ends this if the resolver is single. So it goes first.

## Task 1.0 — One cover resolver

New pure module `src/lib/cover-source.ts`, one exported function `resolveCover(product)` returning `{ url, srcSet, sizes, origin }` where `origin` names which rule won. Fixed precedence, no exceptions:

1. `cover_framed_url` (once it exists)
2. published-overlay `images[0]`
3. live-overlay `images[0]`
4. baked catalog `images[0]`
5. family/locked hero
6. none → explicit placeholder, never a broken tile

`card_background_url` stays what it is — a backdrop, never a cover. `upscaled_cover_url` is not a source and the column gets dropped in this task. CDN width and `?v=` busting happen inside the resolver only, so no surface hand-rolls a URL again.

Every one of the nine surfaces above is converted to call it. Admin lists call the same function, which is what makes what Adrienne sees equal what a visitor sees, by construction.

**Done when:** `rg` finds zero direct `images[0]` cover picks outside `cover-source.ts`, the `origin` value is visible in `?debug=media`, and a screenshot diff of every category before/after shows no change.

## Task 1.1 — Schema

Adds to `inventory_items`: `cover_framed_url text`, `cover_framed_meta jsonb`. Drops `upscaled_cover_url`.

Meta shape: `{ srcUrl, srcHash, bboxPx:[x,y,w,h], method:'auto-alpha'|'auto-color'|'manual', scale, offsetX, offsetY, canvas:[1500,1200], approved, ruleVersion, generatedAt }`

**Done when:** columns exist and appear in generated types.

## Task 1.2 — Render path with fallback

Inside the resolver, `cover_framed_url` wins. In `ProductTile` only, that branch renders a plain `<img>` with `object-fit: contain`, 600w src + 1200w srcSet — no `NormalizedProductImage`, no fit rule, no transform, no measurement. Everything without a derivative renders exactly as today.

Scope note for the record: `CollectionRail`, `CategoryTonalGrid`, `CategoryOverview`, `RelatedPieces`, and QuickView thumbnails keep the legacy path until a later adoption task. During migration a framed product looking different in a rail than in the grid is expected, not a bug.

Field carried end to end: publish select and overlay (`src/lib/photos-admin.functions.ts`), `LiveOverlayRow` and merge (`src/lib/phase3-catalog.ts`), and `scripts/bake-catalog.mjs`.

**Done when:** hand-setting `cover_framed_url` on one test row renders it as a plain contained image on /collection, and every other tile is byte-identical to before.

## Task 1.3 — Storage

- Path `framed-covers/{rms_id}/{hash16}-{w}.webp` in `squarespace-mirror`, `cacheControl: 31536000`.
- Hash covers everything that determines output pixels: `hash16(srcHash + ruleVersion + canonicalized {scale, offsetX, offsetY, bboxPx})`. A path collision therefore means an identical composition — a storage 409 is dedup success, handled the same way `uploadItemImage` already handles it. No byte comparison, no rejection.
- `cover_framed_url` stores the **1200w** URL. The 600w variant is derived by suffix swap (`-1200.webp` → `-600.webp`); both sizes share the hash. Only one URL is stored.
- Transport: base64 through the server function, reusing `uploadItemImage`'s ~10MB guard. No new transport pattern.
- `saveFramedCover(id, base64_1200, base64_600, meta)` uploads both sizes, writes url + meta, audits.

**Done when:** callable from admin, both files land, the row updates, and re-saving an unchanged composition is a no-op rather than an error.

## Not in this scope

The auto-framer engine, the studio UI, migration, and the Phase 5 deletions. `categoryFit.ts`, `productFit.ts`, `productPhysicalScale.ts`, and `NormalizedProductImage.tsx` are frozen — Task 1.0 changes who calls them, never what they compute.

## Non-negotiables

- R1: a published storage URL never receives new bytes. Content-hashed paths make this structural — a new composition is a new path.
- R2: the public site never measures pixels. Any future task that reintroduces live measurement gets declined here.
- R3: auto-framed derivatives are verifier-gated; FAIL goes to a review queue, never a silent publish.
- R4: the studio composes, never retouches. Photo problems route to "replace source photo."
- R5: canvas aspect equals the tile frame aspect. `PRODUCT_TILE_FRAME_ASPECT` is `5 / 4`, so the canvas is 1500×1200 landscape. If the tile aspect ever changes, bump `ruleVersion` and regenerate every derivative.

## Noted now, built in Phase 2

- Verifier gains a non-blocking `SRC_UPSCALED` advisory when composition upscales the source more than 1.25×. Recorded in meta; never queued, never blocking.
- Input contract for new photography: exports ≥1600px on the long edge. The back catalog is not re-exported — today's 800×600 files are adequate at 600w and only slightly soft on the 1200w retina variant. Any individual cover that reads soft gets a one-off higher-res export through "replace source photo."
- Source aspect is irrelevant to canvas choice: the framer crops to the silhouette bbox and discards the source's margins.

## Technical notes

- `docs/frame-studio-plan.md` gets committed as the reference text for Phases 2–5. `cover-audit.mjs` and `cover-system-spec.md` aren't in the repo — send them if you want them alongside.
- Canvas is 1500×1200 (5:4 landscape), matching the tile frame exactly. A portrait canvas would letterbox inside the landscape tile and render every framed cover roughly 36% undersized.
- No image bytes are generated in Phase 1. Nothing visible changes until a derivative exists.

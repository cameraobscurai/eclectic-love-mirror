# Stop the untouchable cover photo — verified, with risk analysis

Every claim below was checked against current code. Line numbers are current.

## The four override layers (exact code)

### 1. Normalized derivative swap — the main culprit
`src/lib/normalized-cover.ts` loads a static build artifact, `src/data/inventory/normalized-covers.json` (635 covers, generated 2026-08-08), keyed by **slug**:

```ts
export function normalizedCoverFor(slug, currentHeroUrl) {
  const entry = manifest.covers[slug];
  if (!entry) return null;
  if (currentHeroUrl && baseUrl(currentHeroUrl) !== baseUrl(entry.src)) return null;
  return { ...entry, url: `${entry.url}?v=${VERSION}` };
}
```

`src/lib/phase3-catalog.ts:189-208`:

```ts
function withNormalizedCover(p) {
  const hero = p.images[0];
  const norm = normalizedCoverFor(p.slug, hero.url);
  if (!norm) return p;
  const cover = { ...hero, url: norm.url };
  return { ...p, images: [cover, ...p.images.slice(1)],
           primaryImage: cover, coverOriginalUrl: hero.url,
           coverSubject: { w: norm.w, h: norm.h } };
}
```

So the site renders a file from the `normalized/` prefix that the editor never shows. It **is** guarded — the swap only fires when the hero URL still matches `entry.src` — but that guard is exactly why it feels haunted: swap the cover in admin and the tile silently changes sizing behaviour (loses `coverSubject`, falls back to browser measurement), with no indication anywhere in the UI.

### 2. Family cover locks
`src/data/inventory/family-cover-locks.json` — two hardcoded entries:

```json
{ "inola-12-black-wood-square-bar": "inventory/3674/30ff4e6b5d706b2b.png",
  "luna-arcing-dining-chairs": "seating/chair-dining/LUNA%200.png" }
```

`phase3-catalog.ts:390-405` force-promotes that filename to slot 0 regardless of saved order. For these two products, drag-reordering the cover in admin does nothing.

### 3. Detail-shot demotion heuristic
`phase3-catalog.ts:284-292` reorders images by filename text:

```ts
const isDetailShot = (url) => /(detail|close[\s._-]?up|closeup|macro|hardware)/i.test(imgKey(url));
const coverFirst = (imgs) => { if (imgs.length < 2 || !isDetailShot(imgs[0].url)) return imgs; ... }
```

Name a file `..._detail.png`, drag it to slot 0, save — the site puts a different photo first.

### 4. Legacy upscale column
`upscaled_cover_url` is already **not** read by the catalog. It still exists in the table, in `types.ts`, and in `scripts/nano-upscale-covers.mjs` / `scripts/reframe-covers.mjs` which still write it. Nothing renders it today.

## Correction to my earlier plan

I proposed generating normalized derivatives on the server at upload time. **That cannot work here** — normalization uses `sharp`, which needs a native binary; server functions run in a Worker runtime with no `sharp`. The normalization must happen **in the browser** at upload time (canvas: alpha/background-key bounding box, crop, re-center on a 1536 square), which is a straight port of the script's math and has the side benefit of showing staff the exact result before saving.

## Proposed fix

1. **Normalize on upload, client side.** Port `scripts/normalize-covers.mjs` trim/center math to a browser module. The admin uploader writes both the original and the normalized derivative, plus the silhouette box `{w,h}` — stored per image on the product row, not in a static JSON.
2. **Render layer reads geometry from the product, not the manifest.** `withNormalizedCover` becomes a per-image lookup on data the admin owns. Static manifest is used only as a fallback for products not yet re-uploaded, and only during migration.
3. **Delete the two hidden reorder rules** (`family-cover-locks.json`, `coverFirst`). Before deleting, write INOLA's and LUNA's correct cover into their actual saved image order in the database so the editor shows the truth.
4. **Editor shows the shipped cover.** The drawer renders the tile exactly as the grid will, with a "normalized" badge, and warns when a derivative is missing.
5. **Retire the upscale writers.** Remove the two scripts' write paths so nothing can repopulate `upscaled_cover_url`.

## Risk analysis

| # | Change | Risk | Blast radius | Mitigation |
|---|---|---|---|---|
| 1 | Client-side normalization | **Medium.** Browser canvas bg-keying will not match `sharp` exactly on edge cases (soft shadows, off-white studio backdrops). A wrong bbox = wrong tile scale for that one product. | One product per bad upload — never neighbours, since scale is derived per-item from its own box plus catalog medians. | Validate the computed box before save (reject <5% or >99% coverage), show the result in the drawer, allow manual re-crop. |
| 2 | Geometry moves to product row | **Medium-high.** This is the path that feeds `productFit` / `productPhysicalScale`. A mismatch between manifest and row data during migration could shift many tiles. | Whole Collection grid. | Ship behind a per-product flag: rows with stored geometry use it, everything else keeps the manifest. Run the fit harness before/after; require byte-identical output on untouched products. |
| 3 | Delete locks + heuristic | **Low.** Two known products plus any file literally named `*detail*`. | INOLA, LUNA, plus whatever the regex currently catches. | Enumerate every product the regex currently reorders, fix their saved order first, then remove. Verify with grid screenshots. |
| 4 | Editor preview | **Low.** Read-only UI. | Admin only. | None needed. |
| 5 | Retire upscale writers | **Very low.** Nothing reads the column. | None. | Leave the column in place; only remove the writers. |

**The one thing that must not happen:** a mid-migration state where some products get geometry from the row and others from a stale manifest keyed on a hero URL that changed. That is the current bug class, repeated. So step 2 ships only after step 1 backfills every product through the same code path, with a failure report — not a guess.

**Not in scope:** the physical-scale / fit math. This pass changes *which file renders* and *who controls it*, nothing about how size is solved.

## Sequencing

1. Browser normalization module + drawer preview (no render change).
2. Backfill all 630 products through it; produce a pass/fail report.
3. Fix INOLA/LUNA saved order; enumerate and fix detail-shot products.
4. Flip the render layer to row geometry; remove manifest lookup, locks, heuristic in one release.
5. Fit harness + per-category screenshots against current baselines as the gate.

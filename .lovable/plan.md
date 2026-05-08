
# AAA Performance Lift — Zero-Regression Plan

Goal: ship the highest-ROI loading wins from the previous discussion **without touching business logic, RLS, the bake pipeline, or the inventory contract**. Every change is additive and behind the existing `vr:check` visual-regression harness — if a pixel moves, we don't ship.

Note on omissions:
- **Service Worker / PWA is dropped.** Lovable's preview iframe + SW is a footgun (stale shells, install-time pinning). Not worth the risk on a luxury site.
- **Web Workers for the color sort is deferred.** Working code, low daily traffic on that toggle. Revisit only after we measure INP.
- **Partytown is deferred** until the first 3rd-party script lands. No GA, no Hotjar today → nothing to move off-thread.

---

## Pass 1 — Slim & lazy-load the catalog (the big one)

Right now `src/lib/phase3-catalog.ts` does `import catalog from ".../current_catalog.json"` at module top-level. That 865 KB JSON is statically imported by `routes/collection.tsx`, `routes/admin.tsx`, and `routes/admin.image-health.tsx`, so it lands in the **main client bundle** and ships to the homepage too.

Two surgical moves, in order:

1. **Add a `catalog.lite.json` baker** alongside the existing `bake-catalog.mjs`. Same input row → strip to: `id, slug, title, categorySlug, liveCategory, liveSubcategories, primaryImage, imageCount, imagesVersion, ownerSiteRank, subcategory, colorTag, publicReady`. Drop description, gallery images, dimensions, variant rollups. Target: ≤120 KB (~30 KB gzipped).
2. **Split the accessor.** `getCollectionCatalogLite()` (sync, used by tile grid + category index) loads `catalog.lite.json`; `getCollectionProductFull(id)` is async and dynamic-imports a per-id chunk. Tiles render from lite; QuickView awaits full.
3. **Convert the imports to dynamic** at the route boundary so the catalog is no longer in the entry chunk:
   ```ts
   loader: () => import("@/lib/phase3-catalog-lite").then(m => m.getCollectionCatalogLite())
   ```

Expected: homepage TTI improves ~150–250 ms on 4G; `/collection` first paint unchanged (data still arrives before tiles render via the loader).

**Zero-regression gate:** before flipping any consumer, write a `scripts/audit/catalog-lite-parity.mjs` that asserts every field used by `ProductTile`, `CategoryIndex`, `CollectionWall`, and `SubcategoryRail` exists on the lite shape. Fail the build if a field is missing. Then `bun run vr:check` across all 12 baselines.

---

## Pass 2 — Speculation Rules + scroll containment (the free lunch)

Two changes, both additive, both gracefully ignored where unsupported.

1. **Speculation Rules** in `src/routes/__root.tsx` head:
   ```html
   <script type="speculationrules">
   { "prerender": [
       { "where": { "href_matches": "/collection" }, "eagerness": "moderate" },
       { "where": { "href_matches": "/atelier"   }, "eagerness": "moderate" },
       { "where": { "href_matches": "/gallery"   }, "eagerness": "conservative" }
   ]}
   </script>
   ```
   Hovering a nav link → next route prerenders in a hidden tab → click is 0 ms. Chrome/Edge only; Safari/Firefox no-op. Pair with a guard: skip on `prefers-reduced-data` and on `Save-Data` header.

2. **`content-visibility: auto`** on the long tile lists in `src/components/collection/ProductTile.tsx` *wrapper*:
   ```css
   .tile-cv { content-visibility: auto; contain-intrinsic-size: 1px 480px; }
   ```
   Browser skips layout/paint/decode for offscreen tiles. On the 161-pillow grid this is a 30–50% scroll-perf win for a one-line change. The `contain-intrinsic-size` placeholder height prevents scrollbar jitter.

**Zero-regression gate:** speculation rules cannot affect visual output (it only prerenders). `content-visibility` *can* (rare) affect scroll-anchored measurements — run `vr:check` and manually scroll the four longest categories on 1366 + 390. If anything jumps, drop `content-visibility` from that breakpoint only.

---

## Pass 3 — Font preload + `fetchpriority="low"` audit (the polish)

Cormorant Garamond is the brand display face. Today it almost certainly loads via stylesheet `@font-face` discovery, blocking FCP by ~150–250 ms.

1. **Audit + preload** the two weights actually used (regular + italic) with `<link rel="preload" as="font" type="font/woff2" crossorigin>` in `__root.tsx`. Self-host if not already.
2. **Demote** the HeroFilmstrip videos and below-fold tile rows from default priority to `fetchpriority="low"`. They're competing with the H-plate today.
3. **`font-display: optional`** for Cormorant — render in the system fallback for 100 ms, then swap *only if loaded*. Eliminates FOUT entirely. Requires checking that the system fallback metrics don't shift the H-plate composition; if they do, fall back to `swap` with `size-adjust` tuning.

**Zero-regression gate:** `vr:check` will catch any font-swap-induced layout shift instantly. If a baseline diffs purely because the font now arrives 200 ms earlier (no actual layout change), update baselines deliberately.

---

## Execution order, gated

```text
[Pass 1]  baker → parity audit → lite accessor → flip consumers   ──► vr:check
[Pass 2]  speculation rules     → content-visibility               ──► vr:check + scroll QA
[Pass 3]  font preload          → fetchpriority demotion           ──► vr:check
                                                                       │
                                                                       ▼
                                                          Lighthouse before/after capture
```

Each pass is independently revertable. None touch Supabase, RLS, the bake step, or product data. If any gate fails, the pass is reverted and the next is unblocked.

## Out of scope (intentional)

- Service Worker / offline shell
- Streaming SSR + `<Await>` for the collection (real win, but rewrites the loader contract — earn it later)
- Worker-ize the tonal sort
- View Transitions extension to QuickView (separate UX project)
- Mapbox / Lenis / Framer audit

## Acceptance criteria

- Lighthouse mobile **performance ≥ 95** on `/` and `/collection` (baseline today: estimated 78–85).
- `vr:check` passes 12/12 baselines unchanged.
- Bundle analyzer shows `current_catalog.json` no longer present in the entry chunk.
- Manual QA: nav prerender feels instant on Chrome desktop; pillow scroll feels glassy on a mid-tier Android.


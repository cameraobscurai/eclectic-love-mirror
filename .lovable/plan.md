# Collection / Category timing — surgical wins, zero risk

I read `src/routes/collection.tsx`, `src/components/collection/ProductTile.tsx`, `src/components/collection/CategoryGalleryOverview.tsx`, and `src/lib/category-covers.ts`. The page is mostly well-tuned — but there are **five clean wins** that are pure gain, no behavior change, no design change.

These are ordered by impact. Each one stands alone; you can ship any subset.

---

### 1. Run category covers through `?preset=editorial` (BIGGEST WIN)

**Today:** `src/lib/category-covers.ts` imports 14 raw PNGs as static assets:
```ts
import sofasCover from "@/assets/category-covers/sofas.png";
```
No vite-imagetools pipeline. No AVIF/WebP. No responsive widths. The browser downloads the **full original PNG** for every cover — even though each tile renders at ~180–250 CSS px. On the overview page that's 14 oversized PNGs on first paint.

**Fix:** add `?preset=editorial` to every import:
```ts
import sofasCover from "@/assets/category-covers/sofas.png?preset=editorial";
```
Type changes from `string` → `Picture` (the imagetools object). Update the consumer (`CategoryGalleryOverview`) to read `.img.src` and `.sources` via a `<picture>` element, OR pull the AVIF srcset string directly. The route already uses this pattern with `hiveSignatureHeroSquare`/`hiveSignatureHeroMobile`, so it's the same convention.

**Result:** AVIF served to ~95% of browsers, ~4–10× smaller per cover. First overview paint snaps in.

**Risk:** none — same pattern in use elsewhere on the route. Caveat: requires touching the consumer to render `<picture>` instead of `<img src>`, ~25 lines of focused change.

---

### 2. Kill the imperative preload-all-15-covers `useEffect`

**Today:** `CategoryGalleryOverview` runs a `useEffect` that injects `<link rel="preload" as="image" fetchpriority="high">` for every cover after mount. This was the same anti-pattern we just removed from Atelier — it:
- fires *after* hydration (so it loses to the natural `<img>` requests anyway),
- conflicts with rows 2–3's `loading="lazy"` (preload high + img lazy = browser warning + wasted bandwidth),
- competes with the H-plate hero (the actual LCP).

**Fix:** delete the `useEffect` entirely (lines 88–110 of `CategoryGalleryOverview.tsx`). First-row tiles already use `loading="eager" fetchpriority="high"` — that's the right signal, fired at the right time, by the actual DOM elements that need them.

**Result:** H-plate hero gets a clean lane to LCP. No more "preload not used" warnings. Lazy rows stay lazy until they're needed.

**Risk:** zero. This effect was working *against* the natural image priority hints.

---

### 3. Drop the 1500ms first-row reveal timeout to 800ms (and make it tighter via `decode()`)

**Today:** `FIRST_ROW_REVEAL_TIMEOUT_MS = 1500`. The five overview tiles in row 1 hold hidden until *every* image fires `onLoad` — or 1.5 s passes. Once #1 lands, the synchronized reveal is editorial; but a 1.5 s cap means a single slow image strands the whole row for an awkward 1.5 s before timeout kicks in.

**Fix:** lower the cap to **800 ms**. Combined with #1 (AVIF covers), the practical reveal will be ~250–400 ms; the cap is just insurance. Optionally, swap `onLoad` for `img.decode().then(report)` so reveal fires when the bitmap is *actually* decoded — eliminates the brief "loaded but not painted" gap.

**Result:** worst-case overview reveal drops from 1.5 s → 0.8 s. Best case stays the same.

**Risk:** very low. The cap is a safety net, not a feature.

---

### 4. Remove the `blur(2px)` filter from the ProductTile reveal cascade

**Today:** every tile in the product grid animates `opacity + transform + filter: blur(2px) → blur(0px)` over 380 ms (lines 122–125 of `ProductTile.tsx`). Filter blur forces the GPU to keep an offscreen compositing layer alive *for every animating tile* — and with `INITIAL_BATCH = 60` tiles, plus framer-motion's `layout` projection on each one, it's the heaviest part of the reveal.

**Fix:** drop `filter` from the cascade. Keep `opacity` + `translateY(4px → 0)`. The visual difference is barely perceptible (the eye reads opacity as the dominant signal); the GPU savings on Load More batches and on lower-end devices are real.

**Result:** smoother scroll-driven reveal as later batches appear. Less jank on Load More.

**Risk:** zero. Pure visual subtraction; nothing else depends on the blur.

---

### 5. Trim ProductTile srcSet widths from `[500, 750, 1100]` → `[400, 600, 900]`

**Today:** every product tile requests up to 1100 px wide via CDN. On the largest grid (4-col @ 1303 px viewport) tiles render at ~287 CSS px, which at 2× DPR needs ~574 device px. The 750 variant covers it; 1100 is wasted bytes on every desktop session.

**Fix:** change `buildCdnSrcSet(product.primaryImage.url, [500, 750, 1100])` → `[400, 600, 900]`. The 900 variant covers 3× DPR (uncommon); 600 covers the typical 2× case; 400 covers small-screen.

**Result:** ~25–40% byte savings per tile across the visible batch. Faster paint of the bottom half of the visible window, faster Load More.

**Risk:** zero — the 4-col layout never displays a tile larger than ~287 CSS px on standard viewports.

---

## What I'm explicitly NOT touching

- **framer-motion `layout` on tiles.** It looks expensive but the AAA polish memo notes it's required for filter-change reflow choreography, and the comment in `ProductTile` already says they removed `layoutId` (the actual cost). Touching this could break the reflow animation.
- **`getCollectionCatalog()` loader.** Sync JSON, already cached. Fine.
- **The `useScrollSpy` watch list, sticky utility bar, Quick View modal lazy-loading.** All already correct.
- **EAGER_LOAD_COUNT / HIGH_FETCH_COUNT for ProductTile.** Tuned; leave alone.
- **CategoryTonalGrid, SubcategoryRail, Wall view.** Out of the timing critical path.
- **No new caching, no SW, no LQIP/blurhash.** Same restraint as Atelier — these are polish, not fixes.

## Order of execution

All five edits are independent and small (~80 lines total across 3 files). I'd ship in this order: **#2 first** (one-line deletion, biggest unblock for hero LCP), then **#1** (cover preset, the actual byte win), then **#3 / #4 / #5** in one pass (small tunings).

Greenlight any subset and I'll execute.

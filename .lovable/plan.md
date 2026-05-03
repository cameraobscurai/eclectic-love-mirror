## What's slow right now

The home page looks great but ships heavy on mobile. The single biggest issue:

| Asset | Current | Target |
|---|---|---|
| `home-hero-mobile.png` | **1.3 MB PNG** | ~60–90 KB WebP (+ AVIF) |
| `home-hero.webp` (desktop) | 96 KB WebP | keep, possibly add AVIF |
| `Saol Display` font | `font-display: block` (blocks text paint) | `swap` |
| Hero image preload | none | `<link rel="preload" as="image">` with responsive `imagesrcset` |

The hero image is the LCP element. On a 390px viewport over 4G, a 1.3MB PNG can cost 2–4s before the wordmark paints — and `font-display: block` then holds the wordmark invisible until Saol Display loads. That's the felt slowness.

## Changes

**1. Convert the mobile hero to modern formats**
- Re-encode `src/assets/home-hero-mobile.png` (1.3MB) → `home-hero-mobile.webp` (~80KB) and `home-hero-mobile.avif` (~50KB) at native resolution sized for ≤768px viewports (cap at ~828px wide @ 2x).
- Same treatment for desktop: add `home-hero.avif` alongside the existing webp.
- Update the `<picture>` in `src/routes/index.tsx` to serve AVIF → WebP → PNG fallback, with proper `media` queries.

**2. Preload the hero (LCP)**
- In `src/routes/index.tsx` `head()`, add a responsive image preload:
  ```ts
  link: [
    { rel: "preload", as: "image",
      href: homeHero,
      imagesrcset: `${homeHeroMobileAvif} 768w, ${homeHeroAvif} 1920w`,
      imagesizes: "100vw",
      type: "image/avif" },
  ]
  ```
- Removes the wait between HTML parse → CSS parse → image discovery.

**3. Fix font-display blocking**
- `src/styles.css` lines 18/25/32: change `font-display: block` → `font-display: swap` for Saol Display @font-face declarations.
- The wordmark will paint instantly in the fallback serif, then swap to Saol Display when ready. With our 0.32em tracking the FOUT is barely visible and is far better than a blank hero.

**4. Decoding hints**
- Add `decoding="async"` and `fetchPriority="high"` to the hero `<motion.img>`, and `loading="eager"` (already implicit but make it explicit).
- Mark the wordmark `<motion.div>` as not needing layout invalidation: it already uses transforms, just confirm `will-change: transform` is set only while `parallaxOn` (already correct).

**5. Defer non-critical work below the fold**
- The `LiquidGlass` SVG filter (`liquid-glass.tsx`) injects on first mount. It's fine, but defer the framer-motion springs setup until after `loaded` flips true so the first frame isn't competing with spring init. Lightweight win.

## Expected result

- **Hero payload**: 1.3MB → ~50–80KB (≈ 95% smaller)
- **LCP on mobile 4G**: roughly 2.5–3.5s → under 1.2s
- **Wordmark visible**: instant (fallback serif) → swap to Saol when font arrives, instead of blank space for 200–800ms

## Files touched

- `src/assets/home-hero-mobile.{webp,avif}` — new (generated from existing PNG)
- `src/assets/home-hero.avif` — new
- `src/routes/index.tsx` — `<picture>` sources, `head()` preload, `fetchPriority`
- `src/styles.css` — three `font-display: block` → `swap`

## Out of scope (ask if you want them)

- Removing the parallax / breathing animation on mobile to save JS (already gated by `pointer: fine`, so it's already off on touch — no change needed)
- Caching headers / CDN tuning (Cloudflare-side, not in repo)
- Reducing the LiquidGlass SVG filter complexity (visual change, would need your sign-off)

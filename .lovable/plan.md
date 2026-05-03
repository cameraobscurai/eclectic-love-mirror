# Final Polish Plan — Optimization Only

Ground rule: **nothing is removed, nothing changes shape.** Every item below makes what already exists faster, smoother, or more resilient. If a change risks visible regression, it is not in this plan.

## What this plan does NOT do

- Does not delete features, routes, components, or content
- Does not redesign Collection, Gallery, Home, Atelier, or Contact
- Does not change the inventory contract, manifest flow, or admin surface
- Does not introduce new pages, embeddings, AI surfaces, or integrations

## The five polish passes

### 1. Speculation Rules — invisible prefetching

Add a single `<script type="speculationrules">` block in `__root.tsx` head that tells Chromium to prerender the next likely route on hover/touchstart with `eagerness: "moderate"`.

Routes opted in: `/collection`, `/gallery`, `/atelier`, `/contact`, `/faq`.
Routes opted out (heavy or interactive-on-arrival): individual `/collection/$slug` quick-view modals stay client-side as today.

Result: clicking nav after hovering it = the page is already painted. Zero code change to any route. Zero change for browsers that don't support it (Safari/Firefox just ignore the script).

### 2. Native View Transitions — additive, not replacing framer

Add `@view-transition { navigation: auto }` to `styles.css` plus `view-transition-name` on three anchored elements:
- `<Navigation />` brand mark
- Collection grid container (so filter reflows feel continuous across route revisits)
- Gallery masthead title

Framer-motion stays. View Transitions only activate on full-route navigations, where framer wasn't running anyway. Browsers without support: no change.

### 3. ProductTile + grid micro-tuning (no behavior change)

`src/components/collection/ProductTile.tsx` and `useNearViewport.ts`:
- Add `content-visibility: auto` + `contain-intrinsic-size` to the deferred shell. Lets the browser skip layout/paint for off-screen tiles entirely. Already gated by `near`, so this is purely additive.
- Promote the `fetchpriority` decision into the JSX attribute (currently set via ref callback after mount — moving it inline lets the preload scanner act on it earlier).
- Increase `EAGER_RENDER_COUNT` from 12 → 18 on `min-width: 1280px` only (current desktop shows ~2.5 rows above the fold; 18 covers three full rows with no scroll flicker on fast scroll).

No visual change, no removed cards, no layout shift.

### 4. Image pipeline — one cheap upgrade

`src/lib/image-url.ts` already builds CDN srcsets. Add an `AVIF`-preferred variant via a `<picture>` wrapper inside `ProductTile` and `GalleryEnvironmentCard`. Falls back to current JPEG/WebP automatically. Typical archive grid drops 30–50% in transfer with zero visual difference.

If the CDN can't serve AVIF for a given source, the `<picture>` falls through silently — no broken images, no contract change.

### 5. Quiet runtime hygiene

Three small things, each independent:
- Add `<link rel="modulepreload">` for the Collection chunk in `__root.tsx` head when the user is on `/` or `/gallery` (the two most common jumping-off points). Driven by `useLocation()`, no router rewrite.
- Wrap the InquiryTray subscription in `startTransition` so opening it on a populated collection page doesn't compete with grid layout work.
- Add `decoding="async"` audit pass — already on ProductTile, missing on GalleryEnvironmentCard and GalleryMasthead. One-attribute add.

## What stays exactly as it is

- Collection page (1,413 lines) — not refactored, not split, not touched structurally
- QuickViewModal — stays client-side
- DevEditOverlay — untouched
- Inventory / manifest / Supabase contracts — untouched
- All copy, all typography, all spacing, all colors, all components

## Files touched

```
src/routes/__root.tsx                          (+ speculation rules, conditional modulepreload)
src/styles.css                                 (+ @view-transition, 3 view-transition-name rules)
src/components/collection/ProductTile.tsx      (content-visibility, inline fetchpriority, AVIF picture)
src/components/collection/InquiryTray.tsx      (startTransition wrap)
src/components/gallery/GalleryEnvironmentCard.tsx  (decoding="async", AVIF picture)
src/components/gallery/GalleryMasthead.tsx     (decoding="async")
src/hooks/useNearViewport.ts                   (responsive EAGER_RENDER_COUNT bump — actually lives in ProductTile, no hook change needed)
```

Seven files. All additive edits. No deletions. No moved code.

## Expected outcome

- Nav-to-page feels instant on Chromium (Speculation Rules + View Transitions stack)
- Collection grid scroll stays at 60fps further down the list (content-visibility)
- Image bytes ↓ 30–50% on archive views (AVIF)
- No visible difference at rest. Same site. Just tighter.

## Risk

Near-zero. Every change has a graceful fallback path (older browsers, non-AVIF CDN responses, unsupported APIs). Nothing is replaced; everything is layered on top.

Approve and I'll ship it as one pass.
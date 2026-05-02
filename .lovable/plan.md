# Production alignment pass — scoped CSS + 4 fixes

The site shell, Collection IA, copy, sort options, footer, and visual restraint already match the Vercel benchmark from prior passes. This pass implements only the four concrete fixes called out at the bottom of the message, plus the new hard rule that the desktop homepage must not scroll.

No IA changes. No data changes. No new components. No new routes.

## 1. Desktop homepage = single viewport

The homepage hero (`src/routes/index.tsx`) already renders one `100svh` section with no content below it. The reason `/` scrolls today is that `__root.tsx` mounts a global `<Footer />` after the route outlet, which pushes a second screen below the fold.

Fix:

- Switch the hero from `h-[100svh]` to `h-[100dvh]` and clamp `min-h: 100dvh / max-h: 100dvh` so it cannot grow. Add `overflow-hidden` on the page container at `lg:` so very short viewports compress the entry-path grid instead of revealing scroll.
- Hide the global `<Footer />` on `/` at `lg:` and up only — mobile keeps the footer reachable by scroll, per the spec ("mobile can scroll if needed, but desktop homepage should not"). Done with a small `useLocation` check inside `RootComponent` and a `lg:hidden` wrap when on `/`.
- Add `overscroll-behavior: none` on the homepage hero so trackpad rubber-banding doesn't reveal anything below.

Acceptance: at any desktop viewport ≥1024px, scrolling on `/` produces zero vertical movement; the brand mark, three entry tiles, and corner nav all stay visible.

## 2. Design tokens for the archive

Add a small set of archive-scoped CSS variables to `src/styles.css` so the filter rail, utility row, and product tiles read from one source. This replaces the literal `text-charcoal/55`, `border-black/[0.08]`, `clamp(150px, 13vw, 210px)` etc. that are repeated across files.

New tokens (under `:root` in `styles.css`):

```text
--archive-text:            var(--charcoal)
--archive-text-quiet:      color-mix(in oklab, var(--charcoal) 55%, transparent)
--archive-text-muted:      color-mix(in oklab, var(--charcoal) 35%, transparent)
--archive-rule:            color-mix(in oklab, black 8%, transparent)
--archive-rule-strong:     color-mix(in oklab, black 14%, transparent)
--archive-tile-media-h:    clamp(150px, 13vw, 210px)
--archive-tile-caption-w:  190px
--archive-utility-h:       64px
--archive-rail-width:      17.5rem
--archive-grid-gap-x:      clamp(48px, 5vw, 72px)
--label-size-micro:        11px
--label-tracking-micro:    0.22em
```

Then update three files to consume the tokens (no visual change intended — these are the same values already in use):

- `CollectionFilterRail.tsx` — header label, row tone classes, divider.
- `ProductTile.tsx` — media-frame height, caption max-width.
- `routes/collection.tsx` — sticky utility row min-height, body grid `column-gap` and `lg:grid-cols-[var(--archive-rail-width)_minmax(0,1fr)]`.

Acceptance: changing any token in `styles.css` propagates to rail + tiles + utility row consistently. Build is clean. No visible diff vs. current screenshot.

## 3. Sticky rail top offset matches the new utility row

The desktop rail in `CollectionFilterRail.tsx` currently uses `sticky top-24 max-h-[calc(100vh-7rem)]`. That `top-24` was sized for the older padded utility row. With the hardened 64px utility row plus the 64px global nav, the correct offset is the actual sum, not a magic number.

Fix:

- Replace the literal with token math: `top: calc(var(--nav-h, 4rem) + var(--archive-utility-h))` and `max-height: calc(100dvh - (var(--nav-h, 4rem) + var(--archive-utility-h) + 1rem))`.
- Add `--nav-h: 4rem` to `:root` (matches the resting nav height; nav uses `py-2` at scrolled state so 64px is correct).
- Switch `100vh` to `100dvh` so iOS Safari doesn't clip the rail behind the bottom toolbar.

Acceptance: at any scroll position, the rail's top edge sits flush against the bottom of the sticky utility row with no gap and no overlap. The rail bottom never gets clipped — internal scroll appears only if rail content actually exceeds the available height.

## 4. Image skeleton timing — no flicker, no shift

In `ProductTile.tsx` today the skeleton overlay fades over 500ms and the image's blur/opacity transitions over 600ms. On fast connections the image's `onLoad` fires before the overlay has finished fading in, producing a brief double-state (overlay + crisp image) and a perceived flash. On the first 6 priority tiles `skipBlur` is set, but the overlay still mounts with `opacity: 1` and snaps to `0` only after `loaded`.

Fix (same file, no API change):

- Initialize the skeleton overlay's `opacity` with a `--archive-skel-min-show: 120ms` minimum-show clock: don't start the overlay opaque on tiles where `skipBlur` is true (priority tiles) — start it at `0` so cached/crisp first-paint images never flash an overlay.
- For non-priority tiles, shorten the overlay fade-out from `500ms` to `220ms` (it's just covering load, not the image transition) and key it off `loaded || skipBlur`.
- Decouple the image-blur transition: when `skipBlur` is true, set `filter: none` and `opacity: 1` from mount and disable the inline `transition` so there is no fade. When `skipBlur` is false, keep the existing 600ms blur-out but begin it with a 1-frame `requestAnimationFrame` after `onLoad` so the browser has committed paint before the transition starts (prevents the "shift" perception when blur resolves).
- Use `<img loading=...>` only — don't toggle `decoding` based on index. Already correct; just verify after the change.
- Keep the invisible media frame as the single source of layout — height is locked by `--archive-tile-media-h`, so no layout shift can occur regardless of image dimensions or load timing.

Acceptance: on a fast connection, the first-viewport tiles paint crisp with no skeleton flash. On a throttled connection, below-fold tiles fade up smoothly without a hard cut. No tile changes height during load.

## Files touched

- `src/styles.css` — add archive tokens + `--nav-h`.
- `src/routes/index.tsx` — `100dvh` clamp + `overflow-hidden` + `overscroll-behavior: none`.
- `src/routes/__root.tsx` — conditional `<Footer />` (hidden on `/` at `lg:` and up).
- `src/routes/collection.tsx` — utility row and body grid read from tokens.
- `src/components/collection/CollectionFilterRail.tsx` — sticky offset uses token math; row tones use tokens.
- `src/components/collection/ProductTile.tsx` — skeleton/blur timing fix; media frame uses token.

## Out of scope (already shipped or explicitly preserved)

- Site shell + nav (4 links, charcoal/cream switching, white background on `/collection`) — done.
- Collection copy ("The Collection", canonical intro) — done.
- Filter rail behavior (stable order, mute-not-disappear, quiet active state with left rule) — done.
- Sort options (By Type, A–Z only) — done.
- Footer copy ("Two parts luxe…") + structure — done.
- Quick View scroll preservation, mobile sheet focus trap, Load More — done.
- Inventory engine, 876 count, Broadway 32in exclusion — untouched.

The deliverable is a production-grade homepage constraint and a token spine the rest of the archive page reads from. No new visual systems, no fake content, no demo UI.

# Home — LCP & Paint Polish

Posters exist. Video logic stays untouched. Scope = paint timing + asset weight + first-frame discipline.

## What's actually broken

1. Mobile LCP is the poster of `SequentialHeroVideo`. It loads as `<video poster=…>` — browser fetches it lazily, no preload hint.
2. Desktop posters render as `<img loading="eager">` on **all 5** frames. The outer two are `hidden lg:block` — paying download cost on tablet for nothing.
3. `04-poster.jpg` 174 KB, `05-poster.jpg` 236 KB. Source JPGs, no AVIF/WebP siblings.
4. Heading + tagline + filmstrip wait on `loaded` flag = `requestAnimationFrame × 2`, then 650ms delay, 1200ms fade. Hero stays visually empty ~2s on warm load.
5. No `<link rel="preload">` for any poster anywhere.
6. No explicit width/height on poster `<img>` → small CLS.

## Plan

### 1. Asset weight
- Generate AVIF + WebP siblings for all 5 posters via vite-imagetools (`?format=avif&quality=55` and `?format=webp&quality=70`).
- Wrap poster `<img>` in `<picture>` with AVIF → WebP → JPG fallback.
- Target: 5 posters total ≤ 200 KB combined (down from ~570 KB).

### 2. Preload the LCP poster
- Desktop: preload `01-poster` (leftmost visible frame) in `index.tsx` `head().links` with `fetchpriority="high"`, `as="image"`, `imagesrcset` for AVIF.
- Mobile: same, but key off the random `index` is impossible at SSR — preload all-format `01-poster` since the random pick still benefits from a warm cache for any tile.

### 3. Loading discipline
- Desktop posters: `loading="eager"` only for indices 1–3 (the always-visible middle three). Indices 0 and 4 (hidden under `lg`) → `loading="lazy"`.
- Mobile poster strip already uses `loading="lazy"` — keep, but the active `SequentialHeroVideo` poster gets explicit `fetchpriority="high"`.
- Add `width={1080} height={1440}` to every poster `<img>` to lock CLS at 0.

### 4. Paint timing (no logic change)
- Drop the double-`requestAnimationFrame` gate in `HomePage` — replace with a single `useState(true)` initial value. The fade existed because filmstrip videos popped in; posters paint instantly so the gate is now hurting more than helping.
- Reduce filmstrip `transitionDuration` 1200ms → 600ms, `transitionDelay` 650ms → 0ms.
- Heading transition stays at 1100ms (it's a typography flourish, not a paint-blocker).

### 5. Don't touch
- `HeroFilmstrip` video lifecycle (idle-callback staggered loads, IntersectionObserver pause, lightbox).
- `SequentialHeroVideo` sequence/preload="metadata"/prefetch-next pattern.
- `EvolutionNarrative` and `DestinationStack`.
- Storage URLs in `clips.ts`.

## Files touched

```text
src/components/home/clips.ts            // add posterAvif/posterWebp imports
src/components/home/HeroFilmstrip.tsx   // <picture>, dimensions, loading per-index
src/components/home/SequentialHeroVideo.tsx  // <picture> overlay for LCP poster
src/routes/index.tsx                    // head().links preload, drop rAF gate, faster fade
public/media/home/                      // new .avif + .webp siblings (script-generated)
```

## Verification

- `browser--performance_profile` before/after: LCP, FCP, total transferred bytes for `/`.
- Visual diff: filmstrip should appear instantly with poster frames, video swap-in unchanged.
- Mobile: hero poster paints under 1s on cold load.
- No console errors. No layout shift.

## Not in scope

- Web Workers, route code-splitting, service worker, dead-code sweep. Separate passes per the locked perf rule (one isolated change at a time).

# Atelier — fix the whole page's timing, not just THE HIVE

I re-read the entire route (`src/routes/atelier.tsx` + `src/components/atelier/team.tsx` + `src/routes/atelier.images.ts`) and watched the live network. The page feels broken for **six** distinct reasons, and only one of them is THE HIVE. Here's the full picture.

## What's actually wrong

### 1. The hero column reserves 120svh of empty air
`xl:col-span-7 min-h-[calc(120svh-var(--nav-h))]` on the right column forces ~1120px of vertical space on a 934px viewport — taller than the hero image itself ever needs. Result: a huge void below the hero before THE HIVE section starts. This was added to give the sticky-left column "room to hold," but it's the single biggest reason the page feels slow and empty. Even after the hero decodes, the user scrolls through a half-screen of nothing.

**Fix:** drop to `min-h-[100svh]` (or remove entirely and let the 4:5 hero define column height). The sticky behavior still works because the left column is shorter than a single viewport.

### 2. Hero text fades in over 640ms — for content that was already SSR'd
The `atelier-hero-reveal` keyframes stage three fades (eyebrow, headline 80ms delay, body 160ms delay) at 640ms each. The text exists in the HTML — fading it in just makes the page look like it's hydrating slowly. The hero animation is the first thing the eye registers and it's announcing "I am loading."

**Fix:** cut the duration to 280ms with no stagger, or remove the animation entirely. The text should be there on first paint, full stop.

### 3. Fetch-priority collision on the first row of THE HIVE
`head().links` preloads the first 4 portraits at `fetchPriority="low"`, then `<MediaAperture>` re-fetches them at `fetchPriority="high"`. Browser warns "preloaded but not used at the same priority" and the head start is wasted. The 4 visible portraits arrive ~500–700ms after they could have.

**Fix:** drop the head-preloads. They're below the fold, the component eager-loads them anyway, and they were stealing bandwidth from the hero (the actual LCP).

### 4. Rows 2–3 of THE HIVE only fetch on scroll
The IntersectionObserver uses a 2000px prefetch margin. Row 3 of an 11-portrait grid sits past that on most viewports. When the user scrolls to THE HIVE they meet 7 empty apertures filling in over the network — that's the "blank grid."

**Fix:** for THE HIVE only, drop the IO gate. Eager-load all 11 portraits, with `fetchPriority="high"` on row 1 and `fetchPriority="low"` on rows 2–3. The cohort is finite (11 small portraits, ~30–60KB each on the render endpoint) and the user is going to see all of them anyway.

### 5. Three unused imagetools imports bloat the route chunk
`imaginedTent`, `designedSofa`, `realizedCeremony` are imported at the top of `atelier.tsx` and stored in `APPROACH_STEPS`, but the rendered `APPROACH_STEPS` JSX (lines 375–396) only shows `number` + `label` — the `image` field is never read. vite-imagetools still generates AVIF/WebP variants for all three at build time, and the `picture` objects get bundled into the route chunk JS. Pure dead weight.

**Fix:** remove the three imports and strip the `image` field from `APPROACH_STEPS`.

### 6. Hero quality on the team renders is overkill
Tiles render at ~287 CSS px (574 device px @ 2× DPR). `width: 720, quality: 70` is fine — but quality 60 is invisible at this scale and shaves ~25% bytes per portrait. Eleven portraits × ~25% = noticeable on slow connections.

**Fix:** drop team-photo quality 70 → 60 in the two `renderUrl`/`renderSrcSet` calls in `team.tsx`.

## Summary of edits (all surgical, frontend only)

| # | File | Change | Lines |
|---|------|--------|-------|
| 1 | `routes/atelier.tsx` | `min-h-[calc(120svh-...)]` → `min-h-[100svh-...]` (or remove) | 1 |
| 2 | `routes/atelier.tsx` | Shorten/remove `atelier-hero-reveal` animation | ~10 |
| 3 | `routes/atelier.tsx` | Remove the `TEAM.slice(0,4).map(...)` preload block in `head().links` | ~10 |
| 4 | `components/atelier/team.tsx` | `lazy={false}` for all members, `fetchPriority` low for index ≥ 4 | 3 |
| 5 | `routes/atelier.tsx` | Remove 3 dead imagetools imports + image field on `APPROACH_STEPS` | ~10 |
| 6 | `components/atelier/team.tsx` | quality 70 → 60 in both `renderUrl` calls | 2 |

## What I'm not doing

- Not touching the editorial trio (triptych / sketch / collage). They use `?preset=editorial` (AVIF/WebP), lazy-load with 1600px margin, and they sit far below the fold. They're fine.
- Not adding LQIP/blurhash. Once the IO gate is dropped and the head-preload conflict is resolved, the network is fast enough that LQIP becomes a polish move, not a fix. We can revisit if the page still feels weak after these six changes.
- Not changing the visual language, layout grid, or aperture frame.
- Not touching `MediaAperture` itself. The component is correct; the route was using it wrong.

## Order of execution

All six in one pass — they're independent and small (~40 lines total across two files). Greenlight and I'll ship it.

# Awwwards Push — Sequenced Plan

Order is deliberate: cheapest / lowest-risk fixes first so the site is stable before we touch the big visual moves. Every pass is independently shippable and independently revertable.

## Pass 0 — Regression walkbacks (30 min, tiny risk)

The fade-on-measure change I shipped last week overshot. Three surgical undos:

1. **ProductTile.tsx** — skip the opacity gate when `index < HIGH_FETCH_COUNT`. Above-fold tiles render immediately (LCP restored); below-fold keep the fade-in-on-measure guard.
2. **NormalizedProductImage.tsx:228** — drop `frameAspect` from `cacheKey`. Wall ↔ Grid toggle currently invalidates every measurement because frame aspect changes; that's the "everything goes big then snaps" pop. Measurement is a property of the image, not the frame.
3. **NormalizedProductImage.tsx** — wrap the 180ms transform transition in `@media (prefers-reduced-motion: no-preference)`.

**Risk:** low. All three are guarded conditionals on existing behavior.
**Regression guard:** re-run `console-health.spec.ts` + eyeball Wall↔Grid toggle on `/collection` at 3 viewports. Screenshot seating category before/after — floor line must not move.

## Pass 1 — GalleryIndex aside bug (15 min, zero risk)

`GalleryIndex.tsx:122-145` hardcodes the Dunton video. `hoverProject` is already computed. Swap the sticky aside to show `hoverProject.heroImage` (video if the manifest carries one, otherwise the poster). Fall back to Dunton when `hoverIdx === null`.

**Risk:** none — read-only variable swap.
**Regression guard:** hover each row, confirm aside updates; leave the page idle, confirm default state renders.

## Pass 2 — Mount the real PDP (half day, medium risk, highest visible ROI)

`collection_.$slug.tsx:366-380` is a `bg-muted/30` letterbox. `QuickViewModal.tsx` has stage math, variant rail, glass chrome — the best image treatment on the site.

- Extract QuickView's stage + rail into `src/components/pdp/ProductStage.tsx` (pure, no modal chrome).
- Mount it as the PDP hero. QuickViewModal keeps using it too.
- Keep the existing PDP metadata column intact.
- Reuse `categoryFit.resolveFit(slug)` so the stage math matches tiles.

**Risk:** medium. PDP is a shareable route with `og:image`, so hydration and SSR need to hold.
**Regression guard:**
- Screenshot 6 PDPs across categories before/after.
- Verify `head()` metadata unchanged (`view-source:` sanity on one route).
- Run `audit-pages.spec.ts` + `console-health.spec.ts`.
- Ship behind no flag but batch with Pass 3 morph so users see the payoff in one release.

## Pass 3 — Tile → PDP View Transition morph (2 hours, low risk)

`src/lib/view-transition.ts` already exports `morphOpen`. Currently spent on one gallery lightbox.

- On `ProductTile` click, call `morphOpen(tileImgEl, () => router.navigate({ to: '/collection/$slug', params }), () => document.querySelector('[data-pdp-hero-img]'))`.
- Tag the new `ProductStage` hero img with `data-pdp-hero-img`.
- API is already reduced-motion-safe and falls back to plain navigation on Firefox/older Safari.

**Risk:** low — the primitive is feature-gated. Worst case: no morph, plain navigation.
**Regression guard:** test with reduced motion on, test on Firefox (no VT support), test back-button (must not leave stale `view-transition-name` on the tile — `morphOpen` already handles this in `.finished.finally`).

## Pass 4 — Platform-native scroll reveal (half day, low risk, feature-gated)

Port `EvolutionNarrative` from rAF-driven JS to `@property` + `animation-timeline: view()`. Keep the JS path as fallback inside `@supports not (animation-timeline: view())`.

**Risk:** low — additive CSS behind `@supports`.
**Regression guard:** visual diff on Chromium (native path) and Firefox (JS path); both must land at the same resolved state.

## Pass 5 — "The Index That Grows" (1–1.5 days, needs prototype first)

Unify `DestinationStack`, `GalleryIndex` rows, and FAQ accordion into one component: numbered tabular-nums row → cursor-tethered thumbnail preview → click triggers the Pass 3 morph into the destination.

**This is the pass I want to prototype before coding**, alongside the QuickView/PDP stage in Pass 2. Same visual choice affects both. I'll come back with 2–3 HTML prototypes covering:
- Row density + tabular numbering style
- Preview thumbnail geometry (fixed vs aspect-adaptive)
- How the hairline / border reads in the paper palette

Once you pick a direction, one component (`<GrowingIndex>`) replaces three call sites.

**Risk:** medium — this touches home, collection overview, gallery, PDP related-products.
**Regression guard:**
- Ship as a new component; migrate one surface at a time (Gallery first — smallest blast radius).
- Keep `DestinationStack` alive until home is migrated last.
- Visual regression screenshots on all 4 surfaces before/after.

---

## Global regression discipline

Applies to every pass:

1. **One pass per commit / preview.** No batching. Every pass is independently revertable.
2. **Screenshot manifest before each pass**: home, /collection, one PDP, /gallery, /atelier, /contact — mobile + desktop. Store under `__visual__/baseline/` (dir already exists).
3. **After each pass**: same 12 screenshots, diff by eye. Anything unrelated moves → stop, don't ship.
4. **CI gate stays as-is**: `console-health.spec.ts`, `stylebrief-console.spec.ts`, `audit-pages.spec.ts` must pass.
5. **No memory rewrites mid-pass.** Only update `mem://` after a pass ships and holds for 24 hours.
6. **Prototype gate**: Pass 2 (PDP stage look) and Pass 5 (Index component) both go through `questions--ask_questions` with rendered HTML before any code lands. Everything else ships straight because the design decision is already made.

## Suggested cadence

- **Day 1 morning:** Pass 0 + 1 (regression cleanup + gallery bug). Ship.
- **Day 1 afternoon:** Prototype PDP stage + Growing Index → ask you to pick.
- **Day 2:** Pass 2 + 3 together (PDP + morph — they're one user-visible feature).
- **Day 3:** Pass 4 (scroll reveal port).
- **Day 4–5:** Pass 5 (Growing Index rollout, gallery → home → collection → PDP).

By end of week you have the SOTD submission: real PDP, morph, unified signature component, platform-native scroll — with a screenshot trail proving nothing regressed.

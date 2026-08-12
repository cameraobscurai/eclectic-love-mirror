# Frame Studio 2.1 — `src/lib/frame-engine.ts`

Go acknowledged on both tracks. Corrections to the ceilings writeup accepted:
overlay text fields already go live via Publish; the bake-only surface is base
structure; bake-as-server-function rides behind the mergeCatalog extraction,
post-meeting. Track B (product trash, then XLSX export) is approved and will be
planned separately — it shares no files with this.

The attached build order supersedes the Phase 2 section of
`docs/frame-studio-plan.md`. This plan is task 2.1 and nothing else.

## Confirmed before planning

- `src/lib/frame-engine.ts` does not exist. 2.1 is create, not adapt. The
  "keystone with zero tests" line referred to it as planned, not shipped.
- `solveFit` and the rule table live in `src/components/collection/categoryFit.ts`,
  keyed by legacy **category** slugs, with `clampMin`/`clampMax` on every rule.
  That file stays frozen and untouched; the engine gets its own table.
- `sharp` is a dependency. `vitest` is not — it enters in 2.3, as specified.
- `src/lib/cover-framed.ts` (Phase 1) already owns the 1200/600 URL pairing;
  the engine does not touch URLs.

## What gets built

One new file, pure: no React, no Supabase, no `sharp`, no fetch. It accepts
decoded pixels and returns plain data. That purity is what makes 2.3's fixtures
possible and it is the acceptance gate.

### `measureSilhouette(raw): { bbox, method, confidence }`

- Alpha path when ≥5% of pixels are transparent, alpha threshold 12.
- Otherwise border-ring-median color path: full perimeter sample, requires
  `min(bg) > 198`, tolerance `max(16, (255 − min) · 0.7)`.
- Otherwise `method: 'fail'` with a null bbox. Never guesses.

### `placeSilhouette(bbox, collectionSlug): recipe.placement`

- Port of `solveFit`, **no clamps**. Resampling from source is sharp at any
  scale, so the clamp band that produced the 281 CLAMP_MASSIVE defects has no
  reason to exist. Dropping it is the single property that clears them.
- Rule table keyed to the **declared collections** (the 10 that shipped
  yesterday), not the legacy category slugs. Rules are carried over by mapping
  each declared collection to the closest existing rule and recording the
  mapping inline; primary axis, anchor, and fallback semantics are preserved.
- Returns `{ scale, offsetX, offsetY }` — the `recipe.placement` sub-object,
  so 2.2 can hash it in its final shape.

### `verify(rendered, collectionSlug): { pass, failures[] }`

V1 primary-axis coverage ±6% · V2 baseline ±2% bottom-anchored · V3 no-clip
≥1% margin · V4 clean perimeter · V5 exact dims (1500×1200 / 600×480) ·
V6 <400KB. Advisories, non-failing: `SRC_UPSCALED` (>1.25× resample),
`TIGHT_CROP`.

### Recipe type, declared now

The exported `FrameRecipe` type carries `crop?`, `rotate?`, `bg?`, `shadow?`,
`normalize?`, `placement` from day one. 2.1 populates only `placement`. The
canonicalizer that 2.2 hashes is written here: 4-decimal rounding, fixed key
order, **absent keys omitted, never nulled** — so today's placement-only
derivatives hash identically to their future recipe-bearing selves and nothing
regenerates for schema reasons.

## Done when

Module compiles with zero React/Supabase/IO imports, exports the four surfaces
above, and every `clampMin`/`clampMax` is absent from the engine's rule table.
Behavioural proof is 2.3's fixtures — no test is written in this task.

## Not in this task

`renderCover`/sharp (2.2), fixtures and vitest (2.3), batch bake (2.4), the
trust slice (2.5). No edits to `categoryFit.ts`, `productFit.ts`,
`productPhysicalScale.ts`, or `NormalizedProductImage.tsx` — the freeze holds
until Phase 5.

## One decision to confirm

The legacy rule table is keyed by ~14 category slugs; the declared taxonomy has
10 collections. The mapping is mechanical for most, judgment for a few
(lighting in particular, which is exempt from true physical scale). I will
propose the full collection→rule table as part of the 2.1 diff and flag every
row where the mapping was a judgment call rather than a direct carry-over.

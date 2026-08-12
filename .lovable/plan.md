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

### `placeSilhouette(bbox, categorySlug, collectionSlug): recipe.placement`

- Port of `solveFit`, **no clamps**. Resampling from source is sharp at any
  scale, so the clamp band that produced the 281 CLAMP_MASSIVE defects has no
  reason to exist. Dropping it is the single property that clears them.
- Rule table is keyed by **category**, with a collection-level default as
  fallback for any future category lacking a row. Collections are too coarse
  for the physics: folding chandeliers (top-anchored, they hang) into lighting
  (bottom-anchored, sits on a surface) breaks one or the other, and the same
  collision hides in cocktail-bar, styling, and textiles.
- Returns `{ scale, offsetX, offsetY }` — the `recipe.placement` sub-object,
  so 2.2 can hash it in its final shape.

#### Category → rule mapping (resolved)

Mechanical carries:

| Categories | Rule |
|---|---|
| sofas-loveseats, lounge-chairs, benches, ottomans, dining-chairs, banquettes | seating |
| coffee-tables, side-tables, consoles, cocktail-tables, community-tables, dining-tables | tables |
| bars | bars |
| storage | storage |
| dinnerware, flatware, glassware | tableware |
| serveware | serveware |
| chandeliers | chandeliers (top anchor, anchorY 0.08 — load-bearing carve-out) |
| table-lamps, floor-lamps | lighting |
| pillows, throws | pillows-throws |
| furs-pelts | furs-pelts |
| rugs | rugs |
| accents, crates-baskets | styling |
| candlelighting | candlelight |
| structures, walls, other | large-decor |

Two judgment calls, ruled and flagged as such in the table comments:

- `bar-stools` → height-primary, target ~0.72, bottom-anchored. A stool is tall
  and narrow; the seating rule's width-primary math was built for sofas and
  renders stools squat.
- `specialty` → center-anchored area rule, ~0.34. Wall-mounted / strung / LED
  grab-bag; nothing in it rests on a floor, so center is the least-wrong anchor.

### `verify(rendered, categorySlug, collectionSlug): { pass, failures[] }`

V1 primary-axis coverage ±6% · V2 baseline ±2% · V3 no-clip ≥1% margin ·
V4 clean perimeter · V5 exact dims (1500×1200 / 600×480) · V6 <400KB.
Advisories, non-failing: `SRC_UPSCALED` (>1.25× resample), `TIGHT_CROP`.

**V2 keys the same way as the rule table.** Baseline-at-anchorY applies only to
bottom-anchored rules; chandeliers invert it to a top-edge check, and
center-anchored rules (specialty) skip it. Keyed by collection instead, every
chandelier fails V2 forever.


### Recipe type, declared now

The exported `FrameRecipe` type carries `crop?`, `rotate?`, `bg?`, `shadow?`,
`normalize?`, `placement` from day one. 2.1 populates only `placement`. The
canonicalizer that 2.2 hashes is written here: 4-decimal rounding, fixed key
order, **absent keys omitted, never nulled** — so today's placement-only
derivatives hash identically to their future recipe-bearing selves and nothing
regenerates for schema reasons.

## Done when

Module compiles with zero React/Supabase/IO imports, exports the four surfaces
above, every `clampMin`/`clampMax` is absent from the engine's rule table, and
the table is category-keyed with a collection default plus two judgment flags.
Behavioural proof is 2.3's fixtures — no test is written in this task.

## Nothing can break

2.1 adds one new file and is imported by nothing yet. No existing module, route,
render path, or database row changes. The live site behaves identically after
this task; the engine only becomes load-bearing at 2.2, behind the verifier.

## Not in this task

`renderCover`/sharp (2.2), fixtures and vitest (2.3), batch bake (2.4), the
trust slice (2.5). No edits to `categoryFit.ts`, `productFit.ts`,
`productPhysicalScale.ts`, or `NormalizedProductImage.tsx` — the freeze holds
until Phase 5.


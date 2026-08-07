# Image fit — finish the pass

Grid and wall are done and measurably correct. What remains is making the
detail surfaces agree with them, removing the dead code that keeps causing
regressions, and locking the result in so it cannot silently drift back.

## Where we actually are

The harness (`scripts/audit/tile-fit-harness.mjs`) measures the real silhouette
and all 10 category slices pass: mass ratio 0.65–0.90, floor spread 0–3px.
One known non-bug: dining-chairs contains 7ft banquettes next to single chairs.

Three things are still open.

## 1. Detail surfaces don't use the solver

QuickView (`src/components/collection/QuickViewModal.tsx`) and the PDP
(`src/routes/collection_.$slug.tsx`) both render a plain `object-contain`
image. A sofa and a candlestick fill the same frame edge to edge. Going from
a correctly-scaled grid into a detail view that ignores scale is the visible
inconsistency left in the flow.

Route both through the same `productFit` path the grid uses, with a
detail-context variant (larger target, same category rules and floor anchor).
One solver, four surfaces.

## 2. Dead code that has caused regressions before

- `src/lib/parse-dimensions.ts` — a second dimension parser with a conflicting
  500" cap. Nothing imports it. It is the exact kind of file that gets picked
  up by a future change and reintroduces two sources of truth.
- `physicalScale()` at `productPhysicalScale.ts:183` — legacy single-axis
  export, no callers.

Both get a ripgrep sweep across `src/`, `scripts/`, `supabase/` before removal,
per the standing dead-code rule.

## 3. Nothing stops this from regressing

Every past fix here has come undone. Wire the harness into CI alongside the
existing console-health gate so a scaling regression fails the build instead of
showing up in a screenshot from Jill.

## Order

1. Delete the dead parser and legacy export (isolated, zero-risk, unblocks
   reasoning about the rest).
2. Extend the solver to QuickView and PDP.
3. Re-run the harness across all 10 slices; confirm no grid regression.
4. Add the harness to CI with the current numbers as the baseline.

## Technical notes

- `productFit.ts` stays the single authority. The detail variant is a context
  argument to the existing solver, not a second code path.
- Baseline file is `scripts/audit/tile-fit-baseline.json` (`--baseline` writes
  it). CI compares against it rather than against absolute thresholds, so a
  category can be intentionally retuned without a hardcoded edit.
- The dining-chairs banquette miss is recorded as expected, not tuned away.

## Not in scope

Re-sourcing the low-resolution catalog assets, and the 14 products with
unencoded spaces in their URLs. Both are real, both are separate work.

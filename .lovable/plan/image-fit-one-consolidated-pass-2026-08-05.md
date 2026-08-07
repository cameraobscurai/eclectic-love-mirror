# Image fit — one consolidated pass

Everything below is one change set, not three separate fixes. The three findings share one root: the solver is correct but only half the surfaces use it, and its tuning has no measured target to hit.

## What we verified

- Build, types, routes: clean.
- Grid and wall run on one solver. Most rows now sit at 0.86–0.95 width ratio, floor line within 14px.
- Three rows still miss: Cosette 0.65 / 43px, Cicely row 0.68 / 58px, Rosalind row 0.71 / 29px.
- QuickView and PDP never call the solver.
- Two dead files can silently reintroduce old behaviour.

## The pass, in order

### 1. Define the target before touching tuning

Set the acceptance numbers first so we stop tuning by screenshot:

- width ratio within a row: min/max >= 0.80
- floor line spread within a row: <= 15px

These become a checked-in measurement script, run before and after every change.

### 2. Measurement harness

A script that loads each category, records per-tile rendered width, height and bottom edge, and prints per-row ratio and floor spread against the thresholds above. Output committed as a baseline so any future regression is one command away.

### 3. Tune once, against the harness

Adjust the compression band and floor anchoring in a single edit, then re-run the harness. Cosette is the test case in both directions: it must stop being the largest tile without becoming the smallest. No per-product exceptions.

### 4. Extend the solver to QuickView and PDP

Same call, same rules, so a product looks the same in grid, quickview and detail. Done after tuning lands, so both surfaces inherit the settled numbers rather than a moving target.

### 5. Remove the debris

Delete the orphaned duplicate parser and the legacy accessor, with the harness green on either side of the deletion to prove nothing was live.

## Order and why

Target, then harness, then tune, then extend, then delete. Each step is verified by the same measurement, so a regression is attributed to one change instead of discovered three changes later.

## Technical notes

- Files touched: `src/components/collection/productFit.ts`, `productPhysicalScale.ts`, `categoryFit.ts`, `QuickViewModal.tsx`, `ProductStage.tsx`.
- Files removed at step 5: `src/lib/parse-dimensions.ts`, the `physicalScale()` export at `productPhysicalScale.ts:183`. Both confirmed zero importers.
- Harness lives under `scripts/audit/`, uses the existing Playwright setup, writes a JSON baseline.
- No database, catalog or image-asset changes. Presentation layer only.

## Checkpoints

Stop and review with you after step 3 (tuning numbers) and after step 4 (detail surfaces), before the deletions.

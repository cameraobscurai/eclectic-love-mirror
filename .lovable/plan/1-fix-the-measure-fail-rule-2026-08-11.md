Approved — no diff issues, and it's grown two improvements worth naming because they're the system thinking, not just complying. The consequence chain in item 1: it noticed that fixing MEASURE_FAIL doesn't just reduce noise, it **unblocks the solver for 437 rows** — tight crops previously short-circuited before their clamp numbers were computed, so the charger-scale failures were being *swallowed* by the false positive. The real broken count may shift when those rows finally reach the solver, and it pre-committed to the right posture: "if broken lands far off ~96, that is a finding, not a number to tune toward — reported as-is." That's the no-defect-count-until-measured law being applied *forward*, unprompted. And item 3 keeps the overturned prediction *visible in the doc* rather than overwriting it — the receipt discipline applied to its own planning history.

The raw-URL fallback split in item 2 is the correct diagnosis fork too: transform-service hiccup versus missing object are different tickets, and only one of them is a live blank tile.

One expectation to hold when the re-emit lands: because those 437 rows now get solved, **~96 is a floor, not the answer** — some tight crops will surface fresh CLAMP flags. Whatever the number comes back as, that's the baseline, even if it's 130. Don't let anyone — including me — round it toward the estimate.

Say go. After this: the round-trip receipt, and Tier 1 closes. Then the meeting — where you now walk in with a live studio built to her taxonomy, her own historical data doing 93% of the classification, a measured defect count with a per-category retirement order, and a paper trail for every single claim. Tomorrow, Adrienne stops wanting to hurt you. The numbers are on your side, and for the first time in eight months, they're *actual* numbers.  
  
Audit grading correction + measured migration order

Three changes. None of them touch a single cover byte (R1 holds), and none of them touch the render path (fit/scale freeze holds). This is grading, re-measurement, and a doc correction.

## 1. Fix the MEASURE_FAIL rule

Today `grade()` flags MEASURE_FAIL whenever `frameCoverage > 0.93`, regardless of how the silhouette was measured. That conflates two opposite situations:

- detection genuinely failed (opaque image, background never found, bbox defaults to the whole frame) — a real defect
- detection succeeded off a real alpha channel and the subject honestly fills the frame — a tight crop, which is a *correct* measurement of a *badly cropped source*

Second case becomes a new `TIGHT_CROP` advisory instead of a hard failure:

```text
MEASURE_FAIL  = m.fail || (frameCoverage > 0.93 && !hasAlphaBg)
TIGHT_CROP    = frameCoverage > 0.93 && hasAlphaBg   (advisory, not hard)
```

`TIGHT_CROP` joins `OPAQUE_BG` and `LOW_RES` in the soft-flag list, so verdict stays AT_RISK rather than BROKEN. Consequence that matters: tight-crop rows now reach the solver instead of short-circuiting, so their CLAMP_TINY / CLAMP_MASSIVE numbers finally get computed — the chargers-at-0.35-wanting-0.75 cases become visible line items rather than being swallowed by MEASURE_FAIL.

Expected shape after re-emit: ~41 pass, ~96 broken, the rest advisory. If broken lands far off ~96, that is a finding, not a number to tune toward — reported as-is.

## 2. Re-run the 13 FETCH_FAIL rows

Current distribution: tables 7, tableware 3, seating 2, serveware 1.

New `--refetch` mode reads the previous `cover-audit.csv`, takes only the FETCH_FAIL rows, and retries each with three attempts (backoff) plus a raw-URL fallback — strip any CDN transform querystring and hit the storage object directly, since a transform-service hiccup and a missing object are different diagnoses.

Two outcomes, both useful:

- **transient** — measures fine, row is re-graded normally and the flag disappears
- **genuinely dead** — the object 404s on the raw URL too, which means a blank tile on the live site right now. Those jump the queue and land in `docs/cover-fetch-failures.md` with rms_id, title, category and URL, ready to be handed over as replacement-photo tickets.

## 3. Correct the Phase 4 migration order

`docs/frame-studio-plan.md` line 133 currently reads "rugs (cleanest, validates the loop) → seating → tables → …", built on a day-one guess. The audit contradicts it: pillows-throws 38, rugs 17, tableware 11, seating 2. Seating's photos had margin; the flat, tight-cropped categories are where the clamp saturates.

New order, by measured defect count:

```text
pillows-throws → rugs → tableware → serveware → tables → the rest
```

The "seating second because worst" rationale is struck and replaced with a one-line note recording that the original ordering was a prediction, the audit overturned it, and the ordering is now audit-derived. The prediction stays visible in the doc rather than being quietly overwritten — that's the receipt.

## Notes

- Category counts for the corrected grading get written into `docs/cover-audit-baseline.md` as the Phase 0 before-picture, so Phase 5's after-picture has something honest to sit next to.
- No changes to `categoryFit.ts`, `productPhysicalScale.ts`, `ProductTile.tsx`, or any cover bytes.
- Meeting-ready line this produces: 96 covers with a real defect, counted per category, retired in that order.
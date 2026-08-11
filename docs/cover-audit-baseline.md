# Cover audit — Phase 0 baseline (corrected grading)

Run: 2026-08-11 · `node scripts/cover-audit.mjs` · 636 live covers · zero bytes changed.

## Grading correction

`MEASURE_FAIL` previously fired on any cover whose silhouette filled >93% of the
frame, regardless of how that silhouette was measured. That conflated a genuine
detection failure with a *correct* measurement of a tight-cropped source.

```text
MEASURE_FAIL  = detection failed OR (frameCoverage > 0.93 AND no alpha channel)
TIGHT_CROP    = frameCoverage > 0.93 AND alpha detection succeeded   (advisory)
```

`TIGHT_CROP` is soft — it never makes a cover BROKEN by itself. The consequence
that matters: those rows now **reach the solver**, so their clamp numbers get
computed instead of being swallowed by the false positive.

## The number came back higher, and that is the finding

Expected shape going in was ~41 pass / ~96 broken. Actual:

```text
41 pass · 286 at-risk · 309 broken
```

309 is the baseline. Not 96, not 533. The estimate was a floor, and the reason
it moved is exactly the mechanism the correction unblocked: 226 tight-crop rows
finally ran the solver, and **281 of the 309 broken rows are CLAMP_MASSIVE** —
covers whose subject wants to render at 0.35–0.43 scale against a clamp floor of
0.75, i.e. rendering at roughly double their correct size. The charger case is
not an anomaly; it is the dominant failure mode of the entire flat-goods half of
the catalog.

Hard-flag tally across broken rows: CLAMP_MASSIVE 281 · MEASURE_FAIL 26 ·
WOULD_CLIP 2. (LOW_RES 308 and TIGHT_CROP 226 are advisories riding along.)

## Per category

| category | pass | at-risk | broken |
| --- | --- | --- | --- |
| pillows-throws | 0 | 17 | **136** |
| styling | 0 | 2 | **63** |
| tableware | 0 | 0 | **41** |
| serveware | 0 | 2 | **36** |
| rugs | 0 | 1 | **25** |
| large-decor | 0 | 22 | 3 |
| furs-pelts | 0 | 4 | 2 |
| bars | 37 | 7 | 1 |
| candlelight | 0 | 9 | 1 |
| lighting | 0 | 28 | 1 |
| chandeliers | 0 | 11 | 0 |
| seating | 1 | 99 | 0 |
| storage | 1 | 10 | 0 |
| tables | 2 | 74 | 0 |
| **total** | **41** | **286** | **309** |

The day-one prediction was "rugs cleanest, seating worst." Both halves are
wrong, and the reason is structural rather than random: seating and tables were
photographed with margin around the subject, so the solver has room to work
(0 broken between them, 173 at-risk on resolution alone). The flat, tight-cropped
categories — pillows, styling, tableware, serveware — are where the clamp
saturates. The prediction is kept here on purpose; the ordering is derived from
the table above, not from it.

## Fetch failures

The prior run reported 13 FETCH_FAIL rows (tables 7, tableware 3, seating 2,
serveware 1). All 13 fetched and measured cleanly on this run, and a subsequent
`--refetch` pass found zero remaining. **All transient — no dead objects, no
blank tiles on the live site.** See `docs/cover-fetch-failures.md`.

## Artifacts

- `cover-audit.csv` — one row per cover, all metrics and flags
- `cover-audit.html` — contact sheet, red/amber/green, grouped by category
- Phase 5 re-runs this script and attaches the after-picture next to this file.

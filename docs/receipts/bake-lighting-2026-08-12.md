# Bake receipt — lighting

2026-08-12T08:40:56.366Z · rule fs2-2026-08-12 · APPLIED

| Outcome                  | Count |
| ------------------------ | ----- |
| tiles                    | 40    |
| framed (verify PASS)     | 38    |
| unchanged (hash match)   | 0     |
| queued (verify FAIL)     | 2     |
| skipped                  | 0     |
| uploads deduped (R1 409) | 0     |

## Advisories

- SRC_UPSCALED: 37

**What SRC_UPSCALED measures (settled 2026-08-12, verified not remembered):**
it is a _resample-ratio_ advisory, not a source-path one. `frame-render`
computes `resampleFactor = drawW / raw.w` and the verifier raises it when the
composition enlarges the source more than 1.25x
(`src/lib/frame-engine.ts`, `resampleFactor > 1.25`). It never inspects the URL.

Verified against the rows: 0 of 45 lighting rows have any `images[]` entry
pointing at an `upscaled-covers/` file — consistent with the retirement check.
The flagged sources are low-resolution-era cutouts in `incoming-photos/` and
`missing-gaps/` with small silhouettes (e.g. GIDEON Small bbox 97x230 px,
IRENE 112x296 px) that must be enlarged to fill the 1200w derivative.

So: **low-res era, not upscaler era.** Earlier narration calling these
"upscaler-era files" was loose and is wrong. The remedy for SRC_UPSCALED is a
higher-resolution source photo (input contract), not the replace-source-photo
remedy that hallucinated backdrops require.

## Human review protocol (contact sheet)

Walk the sheet at actual tile size. Three checks per tile:

1. **Backdrop** - object floating over a grey smudge or a shadow not attached
   to reality -> veto.
2. **Baseline** - does it sit where its neighbours sit -> veto if it floats or sinks.
3. **Softness** - illegible at 600w -> veto. Mild softness -> ship with the
   SRC_UPSCALED advisory already recorded; the input contract covers the future.

Record each veto by appending a row to `docs/frame-queue-lighting.md` with code
`HUMAN_VETO` and one reason word (`backdrop` / `baseline` / `softness`).
Tomorrow's Publish scope = 38 minus vetoes, machine-readable.

Queue: [docs/frame-queue-lighting.md](../frame-queue-lighting.md)
Contact sheet: `docs/receipts/contact-sheet-lighting-2026-08-12.html`

Not live until a human clicks Publish (R8).

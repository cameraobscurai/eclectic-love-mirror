Final pass. One render. Three real problems, fixed at the source.

## Problem (visually confirmed)

Scene 4 (the Brief) assembles for ~7s and is then immediately wiped before the eye can read it. The "— Yours, The Hive" signature lands at frame ~798 and Scene 4 fades out frames 792–810. Scene 5 (Send) starts at 780, so by 810 the brief is gone and Send is alone on a near-empty page. The Brief — the whole payoff — gets no dwell.

Also still broken: palette doesn't read as pulled from the inspo/products, and the wide right rail leans on words instead of proof.

## Fix 1 — Give Scene 4 real dwell (the actual bug)

In `remotion/src/MainVideo.tsx`, rebalance the timeline so the assembled Brief holds on screen for ~4s before Send begins:

```text
S1 INSPO      0   → 186
S2 INVENTORY  156 → 372
S3 PALETTE    342 → 582
S4 BRIEF      552 → 900   (was → 810; +90f / 3s)
S5 SEND       870 → 1110  (starts after Brief fully assembled + dwells)
TOTAL: 1110f / 37s
```

In `SceneBrief.tsx`: keep assembly timing as-is but extend `SCENE_LEN` to 348 so the brief holds composed for ~50 frames before the soft outro fade.

In `WideVideo.tsx`: shift Scene 5 rail flip to frame 900 to match.

In `Root.tsx`: bump both compositions to `durationInFrames={1110}`.

## Fix 2 — Palette pulled from real images

Replace `REAL_PALETTE` in `remotion/src/theme.ts` with tones extracted from the actual inspo + product files (already sampled):

```text
#E2DED2 Limestone   — Amangiri / tableware
#D1BE9B Bleached Oak — Lars / rug
#C8A989 Travertine  — Tibur tray
#8B7562 Cane        — Fawn chair
#A13B22 Clay Ember  — Dos Mas tablescape
#6D7D96 Blue Smoke  — Lynden lounge
#4B332C Walnut      — Botond / bar
#211E1A Char        — Brooke / votive
```

Update `SWATCH_ORIGINS` so each swatch's tether line in Scene 3 points to the image/product it actually came from. Tiny caption under each swatch ("from Amangiri", "from Lars") so the connection is visible, not implied.

## Fix 3 — Wide right rail proves choices visually

Reduce text dependence. Keep the verbs (IMAGINED · SOURCED · COMPOSED · DESIGNED · REALIZED). Drop the epigraph line.

Per scene, render a small visual ledger under the verb:
- S1: 5 inspo thumbnail dots
- S2: 8 product dots
- S3: 8 palette chips
- S4: palette chips + product dots stacked
- S5: same chips fading into the page

One accent hairline per scene tinted with that scene's dominant palette tone, sweeping in under the verb.

## Fix 4 — Scene 5 last-frame composition

Currently ends mid-vignette on white space. Pull the palette ghost band up taller (~120px), add the Hive wordmark + "/stylebrief" centered above it during the final 60-frame hold, and stop the vignette at 0.12 opacity so the frame reads as a closed editorial page, not a fade-to-nothing.

## Files touched

- `remotion/src/theme.ts` — new palette, swatch origins, scene accent map
- `remotion/src/MainVideo.tsx` — new sequence timing
- `remotion/src/scenes/SceneBrief.tsx` — extend `SCENE_LEN`, add dwell hold
- `remotion/src/scenes/SceneSend.tsx` — composed last frame
- `remotion/src/scenes/ScenePalette.tsx` — captioned tether lines
- `remotion/src/WideVideo.tsx` — visual rail, drop epigraph, shift S5 flip to 900
- `remotion/src/Root.tsx` — bump durations to 1110

## Guardrails

- No new images. No new copy beyond palette names already shown.
- Don't touch `src/routeTree.gen.ts`.
- Frame-check 540 / 720 / 840 / 900 / 1050 before final render.
- One MP4: `stylebrief-site-v10-wide.mp4`. v9 stays.
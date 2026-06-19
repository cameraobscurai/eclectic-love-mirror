## Cohesion audit — all 5 scenes

Same chrome already: header, STEP row, serif title, hairline, italic subtitle, progress bar. The break in cohesion is the **body density**: scenes 1, 2, 5 breathe; scenes 3, 4 don't.

| Scene | Body weight today | Action |
|---|---|---|
| 1 Drop | Drop zone + 5 thumbs + caption. Calm. | Keep. |
| 2 Pin | Search + pills + 4×2 grid + cursor. Calm. | Keep. |
| 3 Palette | Tall source strip + button + short swatch band + void. **Empty.** | Rebuild. |
| 4 Brief | Doc header + 4 meta rows + palette + 4×2 pinned + signature. **Spills.** | Rebuild. |
| 5 Sent | Button → check → giant italic Sent. + tagline. | Keep. |

## Cohesion rules applied to every scene (3 and 4 will match)

- 8 swatches, height 56, hex underneath → reused identically in Scene 3 footer and Scene 4 palette band.
- "08 / 08" + "08 TONES" right-aligned counters → already in Scene 4, add to Scene 3.
- Section labels: 12px BODY, 0.34em tracking, 0.55 opacity, uppercase → same in 3 and 4.
- Hairline section dividers (`COLORS.rule`) between every body section in 3 and 4 → matches the chrome rule under the title.
- Bottom italic closer line in 3 mirrors the italic "Sent." weight in 5 and the italic "Yours, The Hive" in 4.

## Scene 3 — Palette (rebuild)

```text
PULLED FROM                                          (label)
[ 5 inspo · 130×160 ][ 8 product chips · 56×56 ]    (one row)
────────────────────────────────────────────────
[ ◆ GENERATE PALETTE ]   →   [ READING… ]   →   [ ✓ RE-GENERATE ]
────────────────────────────────────────────────
COMBINED PALETTE                          08 TONES
┌────┬────┬────┬────┬────┬────┬────┬────┐
│    │    │    │    │    │    │    │    │           (height 420)
└────┴────┴────┴────┴────┴────┴────┴────┘
#FAF4DC #E9D7B3 …                                    (12px tabular)
 Paper   Linen  …                                    (italic 18)
────────────────────────────────────────────────
Eight tones — composed.                              (italic closer)
```

- Source row: inline; no 4×2 product mini-grid.
- Swatch wall 420px (was 280) — hero of the scene.
- Hex + italic name pair under each swatch.
- Add "08 TONES" counter so it matches Scene 4.
- Add hairline dividers between sections (matches rest of system).
- Italic closer ends the scene.
- Keep the source→swatch hairline pulls.

## Scene 4 — Brief (rebuild)

Drop the duplicate header. The IndexCard already renders "Your Style Brief." then the doc inside repeats "The Ridgeline Dinner." That double-title is the cramped feeling. Add `hideTitle` + `hideSubtitle` props to IndexCard; Scene 4 uses them so the doc owns the page.

```text
STYLE BRIEF · No.0042                09 · 26 · 26
The Ridgeline                              (serif 88)
Dinner.
────────────────────────────────────────────────
FOR        Hayes / Ridgeline Estate
OCCASION   Late-Summer Welcome Dinner       (14px row pad,
GUESTS     64                                24px serif values)
MOOD       Sand-washed · candle-warmed · low+long
────────────────────────────────────────────────
COMBINED PALETTE                     08 TONES
[ 8 swatches · 56px · hex underneath ]      (same band as Scene 3)
────────────────────────────────────────────────
PIECES YOU PINNED                    08 / 08
[ 8 thumbs · single row · ~108×108 ]        (was 4×2)
────────────────────────────────────────────────
— Yours, The Hive            READY TO SEND  (top ~1040)
```

- Pinned grid: single row of 8 (cuts ~370px).
- Meta rows tightened: 14px padding, 24px values.
- Signature clears the progress bar.
- Palette band is byte-identical to the one in Scene 3 — that's the cohesion glue.

## Files

- `remotion/src/components/IndexCard.tsx` — add optional `hideTitle`, `hideSubtitle` props (no other changes).
- `remotion/src/scenes/ScenePalette.tsx` — rebuild body per spec above.
- `remotion/src/scenes/SceneBrief.tsx` — rebuild body per spec above; pass `hideTitle hideSubtitle`.
- Scenes 1, 2, 5: untouched.
- `remotion/src/theme.ts`: untouched.

## Verify

1. `bunx remotion still` at frames 100, 280, 450, 680, 900 — one per scene mid.
2. Eyeball: same chrome, same dividers, same swatch band in 3 and 4, no overflow, no void.
3. Full render → `/mnt/documents/stylebrief-site-v8.mp4`.

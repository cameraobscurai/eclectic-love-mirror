## Brand alignment — what the PDFs confirmed

From `Brand_and_Marketing_Kick_Off`:
- Brand voice: **"Two parts luxe, one part regal, and a dash of edge."**
- Home page direction: **"A little sexy and a lot of intrigue. Video movement to hold interest."**
- Display type: **Saol Display, editorial.**
- Inventory aesthetic: **"Modern but timeless. Clean and composed. Don't love over-images."**

From `Working_With_Eclectic_Hive`:
- Tagline-level claim: **"Cinematic approach. Storytelling inventory. Sensory journey through details."**
- Project pillars: Luxury Weddings · Meetings + Incentive Travel · Social + Non-Profit.
- Image language is unmistakable — sandstone, canyon, oversized vases with branches, low desert light, white linen against rock. Exactly what's already in the Amangiri set on storage.

So the brand wants: **intrigue, not exposition. Movement, not stillness. Luxe restraint, not maximal collage.** Over-imagery is explicitly not the move.

That changes my last round. Three giant Amangiri photos chopped into shapes is the wrong instinct — that's "over-images," the thing she said she doesn't love. The right instinct is **fewer images, more glass, more negative charcoal, the photography revealed *through* the frosted plates rather than tiled across them.**

## Re-using the actual glass system

The codebase already has the vocabulary baked in:

- `LiquidGlass` (SVG `feTurbulence` + `feDisplacementMap` refraction filter, hover-amplified, specular highlight tracks the cursor) — this is what powers the three CTA pills today.
- `glassBand.dark` — the canonical horizontal frosted band recipe (`backdrop-filter: blur(14px) saturate(1.05) brightness(0.92)`, charcoal-tinted gradient, cream hairlines top/bottom). This is what the wordmark sits inside.
- `glassPlate` / `glassNamePlate` — softly squared frosted plates for object labels.

Every variant below uses these same primitives. No new glass dialects. Same SVG filter, same band recipe, same hairline weights. That's how it stays cohesive with the existing moodboard hero, the Atelier hero, the Collection sticky bar, and the QuickView modal.

## Three refined variants — same grammar, three sentences

The shared sentence structure: **one anchor Amangiri image as the substrate** + **frosted glass elements that organize and reveal it** + **the existing wordmark band and CTA stack on top, untouched.** What changes between the three is the glass composition, not a different image grid.

---

### Variant 1 — "VITRINE" (the museum vitrine)

```text
┌─────────────────────────────────────────────────────────────┐
│  ECLECTIC HIVE          ATELIER  COLLECTION  GALLERY  …    │
│                                                             │
│   topHero (Amangiri pool / sandstone) — full-bleed          │
│   covers entire stage at object-cover, slightly desaturated │
│                                                             │
│       ┌──────────┐        ┌──────────┐                      │
│       │ glass    │        │ glass    │   ← two small        │
│       │ plate    │        │ plate    │     frosted vitrines │
│       │ holding  │        │ holding  │     floating over    │
│       │ leftTall │        │ detailOne│     the substrate    │
│       └──────────┘        └──────────┘                      │
│                                                             │
│  ════════ frosted band — full width ═══════════════════════ │
│  ════════ ECLECTIC HIVE wordmark ══════════════════════════ │
│  ════════ band continues ══════════════════════════════════ │
│                                                             │
│              ┌──────────┐                                   │
│              │ glass    │   ← third vitrine,                │
│              │ plate    │     centered below band,          │
│              │ detailTwo│     smallest                      │
│              └──────────┘                                   │
│                                                             │
│  [Atelier]    [Collection]    [Gallery]                     │
│                                          [● ○ ○ ○ ○]       │
└─────────────────────────────────────────────────────────────┘
```

- **Substrate**: `topHero` full-bleed, `object-cover`, `filter: brightness(0.85) saturate(0.95)` — pulled back so the glass reads.
- **Three small frosted vitrines** (~200×260px each) float over the substrate, asymmetrically. Each vitrine *contains* a different Amangiri detail shot, framed by a `glassPlate`-style frosted edge with `inset 0 1px 0 rgba(245,242,237,0.18)` highlight. Reads like museum vitrines on a sandstone gallery floor.
- The vitrines use the **same `feDisplacementMap` refraction filter** as `LiquidGlass`, so their edges have the same liquid distortion as the CTA pills. This is the move — the CTAs and the vitrines are clearly the same physics.
- Wordmark band crosses the substrate untouched. The lower vitrine sits below the band, between the band and the CTA row.
- On hover (any pointer-fine device), each vitrine's refraction scale animates from `6` to `10` — the same hover behavior the CTAs already have. Visitor learns "the glass is reactive" once, then sees it everywhere.

Voice match: **luxe, regal, restrained.** Three precious objects floating in a gallery. Brand says "we curate," and the page literally curates three things.

---

### Variant 2 — "REVEAL" (the moving aperture — answers the "video movement" brief)

```text
┌─────────────────────────────────────────────────────────────┐
│  ECLECTIC HIVE          ATELIER  COLLECTION  GALLERY  …    │
│                                                             │
│  ░░░░░░░░ frosted full-stage scrim ░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░ (heavy blur over Amangiri substrate) ░░░░░░░░░░  │
│  ░░░░░     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░  ┌──────────────────────┐  ░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░  │   crisp aperture      │  ░░░░░ ← one rectangular   │
│  ░░░░  │   topHero shows here  │  ░░░░░   "window" of clear │
│  ░░░░  │   at full clarity     │  ░░░░░   vision through    │
│  ════  │   [aperture crosses   │  ════   the frost           │
│  ════  │    the band line]     │  ════                       │
│  ════  │                       │  ════ ECLECTIC HIVE         │
│  ░░░░  │                       │  ░░░░░                      │
│  ░░░░  └──────────────────────┘  ░░░░░                      │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                             │
│  [Atelier]    [Collection]    [Gallery]                     │
│                                          [● ○ ○ ○ ○]       │
└─────────────────────────────────────────────────────────────┘
```

- **Substrate**: `topHero` full-bleed.
- **A single full-stage frosted scrim** (`glassBand.dark` recipe, but applied to the entire stage instead of a horizontal stripe) covers the photo. The page reads as a frosted window with one event happening behind it.
- **One rectangular "aperture"** (~38vw × 56vh, vertically centered, slightly left-of-center) cuts through the scrim — this is the only place the photograph is visible at full clarity. Implemented as a `mask-image` on the scrim, not a separate clear element, so the aperture's edge has the same hairline as `glassBand.dark`'s top/bottom.
- **The aperture *slowly drifts*** — `transform: translate3d(...)` driven by a 14-second sine wave loop, ±3% horizontal, ±1.5% vertical. This is the "video movement to hold interest" the brand brief explicitly asked for, achieved without video. Respects `prefers-reduced-motion`.
- **The wordmark band stays exactly where it is** — but now reads as a wider, denser frosted strip *crossing* the aperture, like a label on a vitrine. The intersection of band and aperture is the focal point.
- The CTA pills sit on the heavily frosted lower portion — most legible they've ever been, because the substrate is uniformly blurred.

Voice match: **"a little sexy and a lot of intrigue."** The page literally hides most of itself. The visitor sees one window into one moment.

---

### Variant 3 — "STRATA" (three horizontal glass planes, parallax-stacked)

```text
┌─────────────────────────────────────────────────────────────┐
│  ECLECTIC HIVE          ATELIER  COLLECTION  GALLERY  …    │
│                                                             │
│   topHero substrate — full-bleed Amangiri                   │
│                                                             │
│  ───── thin frosted glass plane ────────────  ← strata 1    │
│                                                              │
│   (substrate visible between)                                │
│                                                              │
│  ════ frosted band + ECLECTIC HIVE ═══════  ← strata 2      │
│       (the existing wordmark band — this is the              │
│        thickest, brightest plane, the focal stratum)         │
│                                                              │
│   (substrate visible between)                                │
│                                                              │
│  ───── thin frosted glass plane ────────────  ← strata 3    │
│                                                              │
│  [Atelier]    [Collection]    [Gallery]                     │
│                                          [● ○ ○ ○ ○]       │
└─────────────────────────────────────────────────────────────┘
```

- **Substrate**: `topHero` full-bleed.
- **Three horizontal frosted strata** stacked vertically across the stage. The middle stratum *is* the existing wordmark band (no change to it). The outer two are new — same `glassBand.dark` recipe but at ~30% the thickness (`height: clamp(28px, 5vh, 56px)`) and ~60% the opacity. Hairlines on top and bottom of each.
- **Parallax**: the three strata move at different rates against the cursor — top stratum at `-6px`, wordmark band stays still (anchor), bottom stratum at `+6px`. Same spring physics already wired up for the wordmark micro-counter-drift. The substrate moves at `+18px` (existing parallax). Result: an actual sense of depth, glass planes floating at different heights above the photograph.
- Tiny tabular labels on the outer strata: `01 — AMANGIRI` on top stratum, `2024 — UTAH` on bottom stratum. Sand color, 9px, tracking 0.32em. Real metadata, not decorative.
- The CTA stack and the variant dot toggle sit *under* the bottom stratum — they show through the glass. Their `LiquidGlass` plates compose against the frosted stratum, producing a glass-on-glass interaction that's visually rich without being noisy.

Voice match: **"editorial feel" + "clean and composed."** Three quiet horizontal planes, the brand mark as the central one, the photograph as the foundation. Modern but timeless.

---

## Why these three, this time

Each variant is now a **glass composition first, an image composition second.** That's the brand:

- The brand voice is luxe + restrained, not maximal.
- The existing site's signature material (the thing that makes Eclectic Hive's site visually distinct from every other event-design site) is the frosted-band + LiquidGlass system. Use it more, not less.
- All three are **deeply cohesive with the moodboard / exploded variants already shipping.** Same wordmark, same band physics, same CTA glass, same sandstone palette, same Amangiri image source.
- All three give "movement to hold interest" — Vitrine via hover refraction, Reveal via the drifting aperture, Strata via parallax-stratified planes.

## Tradeoffs

- **Vitrine**: most "designed object" feeling. Three plates means three opportunities to look fussy if margins aren't perfect. I'd ship this only if I commit to QA the spacing carefully.
- **Reveal**: the boldest of the three and the most on-brand for "intrigue." Carries real risk — if the aperture animation feels janky or the scrim is too dark, the page reads as broken. Reduced-motion fallback is mandatory.
- **Strata**: the safest and the most internally cohesive (it's literally three of the same thing the wordmark band already does). Lowest risk, highest "looks like the rest of the site" score.

If I had to pick one to land first: **Strata**. It extends the existing visual system one bar further without inventing a new vocabulary. **Reveal** second. **Vitrine** third because it depends most on perfect margin tuning.

## Implementation notes

- New file: `src/components/home/AmangiriGlassHero.tsx` — one component, `variant: "vitrine" | "reveal" | "strata"` prop, switch over composition. All three pull from `amangiriHome` in `src/content/amangiri.ts` (already in place) and reuse `glassBand.dark`, the SVG filter from `LiquidGlass`, and the existing wordmark anchoring math.
- `src/routes/index.tsx`: extend `HeroVariant` union to 5 values, render new component for new values, expand variant dot toggle from 2 to 5 dots. ~30 line diff.
- No new dependencies, no new image assets, no DB, no edge functions. Reversible in one revert.
- Mobile collapse:
  - Vitrine → drop the third lower vitrine, keep two side-by-side at 45vw each above the band
  - Reveal → aperture grows to 70vw and stops drifting (saves CPU on mobile)
  - Strata → all three strata still render, parallax disabled (already gated by `pointer: fine`)

## Pick before I build

1. **Which variants ship?** My pick: all three, in the rotation. Or pick a subset.
2. **Reveal — keep the drifting aperture animation, or hold it still?** Strong recommendation: keep it. It's the literal answer to the brand brief's "video movement to hold interest" without adding video.
3. **Strata labels** — `01 — AMANGIRI` / `2024 — UTAH` (real-archive feel) vs no labels (purer). I'd keep the labels.

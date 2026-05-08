# Gluing the home scroll — with droflower's card reveal as the closing beat

I pulled the droflower component you're referencing — `ParallaxDepthReveal` (`src/components/animations/ParallaxDepthReveal.tsx`). Here's what makes that card reveal feel addicting, then how I'd adapt it (not copy it) to the three destination tiles at the bottom of our home page, plus the surrounding motion that makes it feel earned.

## What droflower's reveal actually does

As the section approaches the viewport, each card is **stacked, scaled down, rotated, and tilted in 3D**, then they fan out into a row as you scroll. Specifically per card:
- starts horizontally collapsed toward center (`-offset * 33.33%`), vertically pushed down (`(total-1-i) * 22px`), scale `0.72 + 0.06*i`, rotate Z `±6deg`, rotate X `12deg`, opacity `0.15 + 0.12*i`
- ends at neutral (x:0, y:0, scale:1, rotateX:0, opacity:1)
- driven by `useScroll({ offset: ["start 0.85", "start 0.2"] })` — the scrub finishes well before the section centers, so the resolution lands instead of trailing
- Framer Motion only, no springs (raw `useTransform`), `perspective: 1200px` on the parent, `transform-style: preserve-3d`
- mobile + reduced-motion fall back to a static grid

That's the move you want. The reason it feels good is the **3D tilt + stagger + the scrub finishing early**. Without those three, you just get fade-in.

## How I'd adapt it for our home page

Our destinations are 3 hairline rows inside `EvolutionNarrative`'s footer slot, not 3 chunky cards. A literal port would look gaudy against our editorial restraint. Two options:

### Option A — "Stacked Index" *(closest to droflower, recommended)*

Treat the three destinations as a small editorial card stack that resolves into the existing index row.

- Each destination becomes a slim card (paper background, hairline charcoal border, ~clamp(120px, 12vh, 180px) tall) holding the same number/title/label/arrow.
- As you cross from the manifesto into the footer:
  - Card 1 (Atelier) sits behind, scale `0.86`, y `+44px`, rotateX `10deg`, rotateZ `-3deg`, opacity `0.25`
  - Card 2 (Collection) middle, scale `0.92`, y `+22px`, rotateX `8deg`, opacity `0.45`
  - Card 3 (Gallery) top, scale `0.96`, y `+8px`, rotateX `4deg`, opacity `0.7`
  - All resolve to neutral (row layout) by the end of the scrub.
- `useScroll({ offset: ["start 0.9", "start 0.35"] })` — the resolution lands as the section centers, not when you hit the very bottom (this is the fix for "dumps you into the buttons").
- Tone it WAY down vs droflower: rotateX max 10°, rotateZ ±3°, scale floor 0.86 (not 0.72). We're luxe-editorial, not consumer-bold.
- After resolved: a 1px hairline draws across the top of the row left→right (320ms) — confirms "the room is set."
- Arrows draw their SVG `pathLength` 0→1 on resolve, 60ms staggered.
- Mobile + reduced-motion: skip the 3D entirely, cards just stagger-fade in vertically (60ms apart, 12px lift).

### Option B — "Quiet Slide" *(simpler, no 3D)*

Keep the existing flat hairline rows, but each row slides up from `+36px / opacity 0.2` into place as you scroll past `progress 0.78 → 0.95` of the manifesto, staggered 80ms. Shorter scroll budget. Less wow.

---

## The other half of the fix — the 60vh of dead air before the cards

Even with a great card reveal, the manifesto's last line ("This is our evolution.") currently has nothing between it and the CTA. Two structural improvements (do these regardless of A or B):

1. **Closer-line dwell + letter-spacing relax.** The `closer` line gets a 1.4s ease and letter-spacing eases from `0.2em → 0.16em` as it brightens — same gesture as the wordmark on load, completing a visual rhyme. ~5 lines of code in `EvolutionNarrative.tsx`.

2. **Pre-warm scrim.** A scroll-driven charcoal-on-paper gradient at the bottom 30vh of the EvolutionNarrative section, growing from 0 → 10% as `progress` crosses 0.78 → 1. The footer's darker zone feels approached, not dropped on. Reuses the same gradient pattern as the home hero scrim.

3. **Shrink `FOOTER_REVEAL_AT` from 0.92 → 0.78** so the cards begin their resolve while there's still scroll runway, instead of slamming in at the bottom.

## Filmstrip → manifesto handoff (optional, separate beat)

The filmstrip currently sits frozen as you scroll past it. A subtle binding: tie each frame's inner image `object-position-y` to scroll progress (±16px range). Photographs gain weight inside their windows, and the strip reads as you "passing through" rather than scrolling over. Pure parallax, ~30 lines in `HeroFilmstrip.tsx`. Easy to add or skip.

---

## My pick

**Option A + the three structural fixes + the filmstrip parallax.** That's the version that solves your actual complaint: the manifesto resolves into a card reveal that *feels like an arrival*, not a buttons dump.

## Files

- `src/components/home/DestinationStack.tsx` *(new)* — adapted ParallaxDepthReveal, restraint-tuned, 3 cards.
- `src/routes/index.tsx` — replace inline destinations footer with `<DestinationStack destinations={DESTINATIONS} />`.
- `src/components/home/EvolutionNarrative.tsx` — closer-line dwell, scrim, `FOOTER_REVEAL_AT` 0.78.
- `src/components/home/HeroFilmstrip.tsx` — per-frame inner parallax (optional).

No new deps. Framer Motion + Lenis already wired. All transforms GPU-only. `useReducedMotion` gates everything, mobile gets the static fallback.

Tell me **A** or **A without filmstrip** or **B**, and I'll build it.

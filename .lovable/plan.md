
# Style Brief Editorial Video — V2 Plan

The current video is close but reads templated and rushed. Two subagents (stylist + motion director) audited it. The diagnosis is one sentence:

> **Every scene cuts before it lands, and every product/photo was picked by position in an array — not by editorial instinct.**

## The 3 Real Problems

1. **No hold time.** Each scene = 162f total, but the fade starts before the last element finishes animating. Need 30–120f of dead-still hold *after* the last element lands, before any transition begins.
2. **Uniform fades.** 4 identical 18f fades = "PowerPoint with serif fonts." Each boundary needs its own logic.
3. **Wrong picks + wrong treatment.** Currently re-using the same product images, the Cressida burgundy lamp and Alora floral chair fight the "sand-washed candle-warmed" mood, and the polaroid collage drops 5 cards on the same beat = robotic.

---

## Scene 1 — DROP INSPIRATION (5.0s)

- 5 inspiration polaroids drop in **staggered with physics variance** (8–14f apart), each with its own entry vector and rotation (–6° to +9°, deliberately odd: –3.7°, +5.2°, etc.). No two share rotation.
- **One polaroid clipped at bottom edge** (~80px off-screen). Intentional imperfection.
- Per-card shadow variance (8px → 24px blur). Real-object depth, not CSS boxes.
- Image curation rule: each photo must have a different dominant color temperature and a different subject (interior, textile, garment, surface, still life). Diversity = "curated."
- **Hold 54f dead-still** after last card lands.

## Scene 2 — PIN THE PIECES (5.7s)

- **Replace all 8 products** with fresh stylist picks across 8 different categories:
  1. LARS 8' Bleached Oak Dining Table (Tables) — hero pin, scale 1.06
  2. BOTOND 87" Walnut Rod Chandelier (Lighting) — the "low and long" anchor
  3. FAWN Natural Cane Chair (Seating)
  4. BEAUREGARD Natural Tambour Bar (Bars)
  5. TIBUR Travertine Tray (Serveware)
  6. AKOYA Tableware Set (Tableware)
  7. AMALIA Smoke Cut Glass Votive (Candlelight)
  8. KEITHA Chunky Jute Tassels Rug (Rugs)
- **Reveal in 3 waves: 2 → 3 → 3**, +18f apart. Not a grid load.
- Each card drops 12px with 6f ease-out. Pin icon pops *after* card lands (+4f).
- Pin counter increments 0 → 2 → 5 → 8, not a single jump.
- No card borders. Shadow-only separation.
- **Hold 60f.**

## Scene 3 — EXTRACT PALETTE (5.6s)

- Only **2 inspo images** visible (the strongest from Scene 1) at 85% opacity. Less is more specific.
- **Swatches earn their place**: each swatch originates as a 4px dot at a real pixel coordinate on the inspo image, then travels along a hairline (0.5px charcoal, 30%) out to its final swatch position. Visible cause→effect.
- Swatches reveal lightest → darkest, 12f apart.
- Each swatch gets a **one-word editorial name** above the hex (Cormorant italic): "Alabaster", "Dust", "Warm Graphite", "Slate", "Linen", "Bone", "Cream", "Paper."
- **Hold 66f completely still.** No shimmer, no breathe.

## Scene 4 — YOUR BRIEF (5.7s)

- **Paper grain overlay** at 4–6% opacity on the card face. This single change does the most work.
- Type hierarchy breaks the grid: client name 28pt Cormorant caps tracked 120, occasion 11pt system italic, palette row offset to a different column than text above.
- Pinned pieces render as a **horizontal proof-sheet strip** of small thumbnails (~64×80px, 6px gap, no labels) — not a gallery grid.
- Card enters via slow 6px upward drift, 40f ease-in-out (no spring).
- Single 0.5pt rule line between palette and pinned pieces — one line, that's it.
- **Hold 90f** (this is the payoff scene; let it read).

## Scene 5 — SENT (5.2s)

- "Sent." alone first, 72pt Cormorant Light tracked 200, centred. Fade + +4px upward drift over 20f.
- **Hold "Sent." alone for 30f** before tagline appears.
- Tagline at 14pt system regular lowercase 80% opacity, opacity-only entrance.
- No background motion, no particles, no grain loop.
- **Hold 120f** on final state. ~4 seconds. Confidence.

---

## Transition Treatments (kill the uniform fades)

| Boundary | Treatment | Why |
|---|---|---|
| S1 → S2 | **Slow push-in** — scale 1.0→1.04 on collage while crossfading to grid | Feels like camera leans in to examine |
| S2 → S3 | **Match-cut** — 8th product's dominant color hard-cuts to first swatch (1f color bridge), palette builds from there | The pieces *become* the palette |
| S3 → S4 | **Hold-on-white** — swatches fade to cream, hold 12f white, brief drifts up | Page turn |
| S4 → S5 | **Slow push-out** — brief scales 1.0→0.97 + opacity to 0 on cream, "Sent." fades in on same cream | Document sent; only the feeling remains |

---

## Total Runtime

~26.3s (790 frames at 30fps). Longer scenes were tempting but the real fix is **hold time**, not length. If review wants more breathing room, extend Scene 4 hold to 120f.

---

## Build Order

1. Download the 8 new product images from the catalog URLs into `remotion/public/products/` (replace existing 8).
2. Curate 5 new inspo images with deliberate subject diversity (replace existing 5 in `remotion/public/inspo/`).
3. Update `remotion/src/theme.ts` PRODUCTS + add palette editorial names + add swatch origin coordinates per inspo image.
4. Add paper-grain PNG to `remotion/public/textures/` for Scene 4 card.
5. Rewrite the 5 scene components to the new motion specs (staggered drops, wave reveals, swatch-origin animation, document drift, Sent hold).
6. Rewrite `MainVideo.tsx`: new scene durations, custom transitions per boundary (replace uniform `fade()` with mix of `slide()` push, custom match-cut Sequence, hold-on-white via a white interstitial Sequence).
7. Render to `/mnt/documents/stylebrief-editorial-v2.mp4`, spot-check key frames first.

---

## What I need from you before building

1. **Sign off on the 8 product picks** above, or veto specific items.
2. **Inspo images**: keep the current 5, or want me to source 5 fresh ones with the diversity rule above?
3. **Total runtime**: 26s (recommended) or push Scene 4 hold to land at ~30s?

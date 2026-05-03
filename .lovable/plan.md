## Goal

Add an edge-to-edge frosted glass band behind the "ECLECTIC HIVE" wordmark on the home hero so the mark stays legible against the busy paint-swatch + blueprint area, without darkening the rest of the composition.

## Approach

Insert one new element in `src/routes/index.tsx` between the hero `<picture>` and the wordmark `<motion.div>`:

- **Position**: anchored to the same `bandPoint.y` the wordmark already uses (via `useObjectCoverPoint`), so it tracks the artwork's baked-in glass band across breakpoints.
- **Width**: full-bleed `inset-x-0`, edge to edge.
- **Height**: `clamp(96px, 18vh, 180px)` — tall enough to cushion the wordmark, short enough to stay a band, not a curtain.
- **Effect**:
  - `backdropFilter: blur(14px) saturate(1.05) brightness(0.92)` — frosted glass that slightly knocks back the chaotic mid-composition.
  - Subtle dark-tint gradient (`rgba(26,26,26, 0 → 0.18 → 0)`) to deepen the middle for cream text contrast.
  - Hairline inset highlights top + bottom for a real glass edge.
  - `mask-image` linear-gradient feathers both edges to transparent so the band dissolves into the image rather than cutting it with hard lines.
- **Layering**: `z-[5]` — above the hero image (`z-0` implicit), below the wordmark (`z-10`) and CTAs (`z-20`).
- **Motion**: matches the wordmark's load fade-in (`transition-opacity duration-1000`, 200ms delay) so it appears as one gesture.

No other changes — the wordmark, parallax, specular, and CTAs stay exactly as they are.

## Files touched

- `src/routes/index.tsx` — insert one `<div>` (~25 lines) between the closing `</picture>` and the wordmark block.

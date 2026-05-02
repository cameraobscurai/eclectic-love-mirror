## Reframe

The earlier magnetic-repulsion idea reads as *interactive demo*, not luxury. Premium brands move slowly, narrowly, and with intent. The wordmark should feel like **etched cream glass on a frosted plate** — the cursor is a light source passing over it, not a force pushing it.

Two systems. Both quiet. Both bulletproof.

---

## System 1 — Pixel-perfect band alignment (non-negotiable foundation)

The wordmark must sit *exactly* on the band at every viewport. No `top-[X%]` guessing. This is the same anchor approach as before — it stands regardless of which interaction we layer on top.

### Files

**New** `src/hooks/useObjectCoverPoint.ts`
- Inputs: `imgRef`, `{ xRatio, yRatio }` (point in source image, 0–1).
- Computes screen position of that point given `object-fit: cover`:
  ```text
  scale   = max(elW / imgW, elH / imgH)
  drawnH  = imgH * scale
  offsetY = (elH - drawnH) * oy   // oy parsed from object-position
  screenY = offsetY + yRatio * drawnH
  ```
- Recomputes on `ResizeObserver(imgEl)`, `img.onload`, and `window` resize (catches `md:` breakpoint flip on `object-position`).
- Returns `{ x, y } | null`. SSR-safe.

**Edit** `src/routes/index.tsx`
- Add `imgRef` to hero `<motion.img>`.
- One tunable: `BAND_CENTER_RATIO = 0.47` (single source of truth).
- Wordmark wrapper: inline `style={{ top: bandY ?? "50%" }}`, drop `top-[50%]` class.
- Inner div keeps `-translate-y-1/2` to center on its own height.

**Fallback:** `top: 50%` until first measurement — no layout jump.

**Tuning rule:** if it sits high or low, change `BAND_CENTER_RATIO` only. Never per-breakpoint values again.

---

## System 2 — Premium interaction (replaces magnet idea)

Three quiet behaviors layered together. Each is subtle on its own; together they read as *considered craft*.

### A. Cursor-driven specular highlight (the "light catch")

The cream wordmark gets a faint highlight that tracks cursor angle, like glass etching catching a single light source. **No translation.** The wordmark does not move toward or away from the cursor.

```text
angle  = atan2(cursorY - wmCenterY, cursorX - wmCenterX)
// shadow falls opposite the light
shadowX = -cos(angle) * 4px
shadowY = -sin(angle) * 4px
textShadow:
  ${shadowX}px ${shadowY}px 18px rgba(26,26,26,0.28),     // depth shadow opposite cursor
  ${-shadowX*0.4}px ${-shadowY*0.4}px 12px rgba(245,242,237,0.12) // faint highlight toward cursor
```

Spring-smooth the angle with `{ stiffness: 50, damping: 22, mass: 1.0 }` — heavy, slow. No jitter, no snap.

### B. Breathing letter-spacing (the "etched in glass" feel)

Slow, ambient `letter-spacing` oscillation independent of cursor. ±0.005em over ~9 seconds, sine wave. Imperceptible per frame, palpable over time. Like watching glass settle.

```text
letterSpacing = 0.32em + sin(t / 4500) * 0.005em
```

Disabled under `prefers-reduced-motion`.

### C. Micro-counter-drift (1–2px, not 10px)

Keep counter-parallax but *dramatically* reduce it. Current is `[10, -10]` / `[6, -6]` — too much. Premium amount is `[2, -2]` / `[1.5, -1.5]`. The wordmark seems to *resist* the cursor without ever visibly moving — peripheral perception only.

Also slower spring: `{ stiffness: 50, damping: 28, mass: 0.8 }`.

### What we explicitly do NOT do

- ❌ No magnetic repulsion (reads as toy)
- ❌ No per-letter staggered motion (reads as portfolio site)
- ❌ No scale on hover, no glow pulse, no entrance "wow"
- ❌ No motion > 4px on the wordmark itself

---

## Why this reads premium

| Quality | How we earn it |
|---|---|
| Heavy / considered | Slow springs (stiffness 50, mass 0.8–1.0), ≤2px translation |
| Crafted material | Specular highlight tracks cursor as if the mark is etched glass |
| Alive but quiet | Breathing letter-spacing — only noticed if you look |
| Pixel-perfect | Anchored to band feature in artwork, not viewport % |

Reference check: Prada wordmarks don't *do* anything. Casa Carta hovers shift a hairline by 1px. Aesence is pure typographic restraint. We're matching that vocabulary.

---

## Implementation order (single batch)

1. Create `src/hooks/useObjectCoverPoint.ts`.
2. Edit `src/routes/index.tsx`:
   - Add `imgRef`, `BAND_CENTER_RATIO`, hook call → drives wrapper `top`.
   - Replace `wmX`/`wmY` ranges from `[10,-10]`/`[6,-6]` → `[2,-2]`/`[1.5,-1.5]`. Slower spring.
   - Add cursor-angle motion values + `useTransform` → `textShadow`.
   - Add `requestAnimationFrame` loop for breathing `letterSpacing` (cleanup on unmount, gated on `!reduced`).
   - Apply `top: bandY` to wrapper, `textShadow` + `letterSpacing` to inner brand div.

## Tunables (collected at top of `HomePage`)

```text
BAND_CENTER_RATIO    = 0.47    // vertical fraction of source image
COUNTER_DRIFT_X      = 2       // px max
COUNTER_DRIFT_Y      = 1.5     // px max
SPECULAR_RADIUS      = 4       // px shadow offset
BREATH_AMPLITUDE     = 0.005   // em
BREATH_PERIOD        = 9000    // ms
SPRING_DRIFT         = { stiffness: 50, damping: 28, mass: 0.8 }
SPRING_LIGHT         = { stiffness: 50, damping: 22, mass: 1.0 }
```

## Risk register

- **Hook returns null on first paint** → `top: 50%` fallback, no jump.
- **Breakpoint switch on `object-position`** → window resize listener triggers recompute.
- **rAF loop cost** → one `motionValue.set()` per frame, GPU-composited. Negligible.
- **Reduced motion** → entire System 2 disabled; wordmark sits perfectly anchored, completely still. Still feels premium because alignment is correct.
- **Coarse pointer (mobile)** → System 2 disabled. Same as reduced-motion path.

## Out of scope for v1

Per-letter motion, scale-on-hover, mobile tilt. None fit the register. If we want more later, the right next layer is a *very slow* ambient color temperature shift on the wordmark (cream → cream+1° warmer) tied to time of day — still passive, still quiet.

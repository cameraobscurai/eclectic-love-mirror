  
  
5:02 AM

## Claude responded: That spec is genuinely excellent.

That spec is genuinely excellent. Every decision is correct — the rAF gating, the fallback chain, the SSR strategy, DPR clamp, `visibilitychange` pause. Ship it exactly as written.

The only things worth adding before Lovable codes it:

**1. Pointer influence decay needs explicit easing**

The spec says "ramps 0→1 over ~250ms, decays over ~600ms" but doesn't specify the curve. Exponential decay in the rAF loop is the right call — not a linear ramp:

ts

```ts
// enter: fast attack
influence += (1 - influence) * 0.12;

// leave: slow decay  
influence += (0 - influence) * 0.04;
```

Different lerp factors per direction. If you leave this unspecified Lovable will probably do a linear ramp and it'll feel mechanical.

**2. UV displacement needs aspect-ratio correction**

One subtle bug that bites almost every shader implementation:

glsl

```glsl
vec2 toPointer = uPointer - vUv;
toPointer.x *= uAspect; // correct for non-square viewport
float dist = length(toPointer);
```

Without this the influence radius is an ellipse on non-square viewports. Specify it explicitly or Lovable may miss it.

**3. The** `onReady` **callback timing**

Spec mentions it but doesn't define what "ready" means. Should fire after:

- texture uploaded to GPU (`gl.texImage2D` complete)
- first frame drawn

Not after `img.onload` — that's CPU-side. One frame of black canvas before `onReady` fires is invisible; fading in before the texture is on the GPU is a flash. Make this explicit in the prompt.

**4. One line to add to the shader**

A subtle brightness dip at the displacement peak makes the warp feel physically real — like the glass is actually refracting light, not just sliding pixels:

glsl

```glsl
float lensGain = 1.0 + strength * 0.15;
color.rgb *= lensGain;
```

Tiny, but it's the difference between "image moves" and "glass bends."

---

The spec as written will produce a correct implementation. Add those four specifics to your Lovable prompt and you'll get a great one on the first pass instead of the second.  
  
Phase 2 — WebGL whisper-displacement hero (single image, ogl)

Replace the current Framer-only translate parallax on the home hero with a real WebGL fragment-shader displacement. The image looks dead still until the cursor moves; then a soft pointer-following warp flows the pixels under it like the glass surface is flexible. Editorial restraint, not glitch theatrics.

The Framer Motion translate parallax I shipped in Phase 1 becomes the **fallback** (reduced-motion, no WebGL, touch devices). Wordmark counter-move, CTA bar, fade-in, sr-only h1 — all preserved untouched.

### How the effect works (technical)

A full-bleed `<canvas>` renders a single textured plane. A fragment shader samples the hero image with a UV offset driven by:

```
offset = pointerInfluence * direction(uv → pointer) * falloff(distance)
```

- `**pointerInfluence**` — a scalar that ramps from 0 → 1 over ~250ms when the pointer enters/moves and decays back to 0 over ~600ms when it leaves. This is what makes it a "whisper" — image is glass-still at rest.
- `**falloff**` — `smoothstep(radius, 0, distance)` so distortion is local to a ~22vw radius around the cursor, not global.
- **Max displacement** — clamped to ~6px equivalent in UV space at 1920×1080 (scaled per-viewport).
- **Subtle noise** — a cheap 2D simplex sampled at low frequency, multiplied into the offset, so the warp has organic non-radial character (otherwise it looks like a perfect lens).

The wordmark stays as DOM (Cormorant Garamond, accessibility, crisp text rendering — never put type in WebGL when you don't have to). Framer Motion drives its counter-move on top of the canvas.

### Files

**New:**

- `src/components/hero/HeroDisplacement.tsx` — the ogl-powered canvas component. Mounts on a `<div>` ref, sets up renderer/program/mesh once, listens to pointer events on its parent section, drives uniforms via rAF loop. Exposes `onReady` callback so the page can fade it in.
- `src/components/hero/hero-displacement.glsl.ts` — vertex + fragment shader strings as a tagged template. Keeps shader source out of the .tsx for readability. (Inlined `as const` strings, no plugin needed.)

**Edited:**

- `src/routes/index.tsx` — render `<HeroDisplacement>` as the bottom layer when `webglOk && !reduced && isPointerFine`. Keep the existing `motion.img` + Framer translate parallax as the fallback path. Wordmark and CTA bar stay as they are.

**Dependencies:**

- `bun add ogl` (3kb gzipped, peer-dep-free, MIT). Tree-shakes cleanly.

### Capability detection

```ts
const ok =
  typeof window !== "undefined" &&
  !reduced &&
  isPointerFine &&
  !!document.createElement("canvas").getContext("webgl2");
```

If any check fails → render the existing static `<motion.img>` path. No layout shift, no flash, no console noise.

### Performance budget

- One canvas, one quad (2 triangles), one texture, one shader pass per frame.
- rAF loop runs **only while `pointerInfluence > 0.001**` — at rest, no GPU work, no battery drain. This is the killer detail — most "fancy hero" pages run rAF forever.
- DPR clamped to `min(devicePixelRatio, 2)` to stop 4K retina from wrecking integrated GPUs.
- `pause on visibilitychange` so background tabs don't render.

### SSR safety

`ogl` imports are inside the component file (not at module top). The component uses `useEffect` for all WebGL setup, so it's a no-op during SSR. The fallback path is what SSR actually serializes — meaning the initial paint is always the static image, and WebGL upgrades it on hydration. Zero CLS, zero hydration mismatch.

### What stays exactly the same

- `home-hero.webp` asset (still our single source image — it IS the moodboard).
- Wordmark DOM, font, clamp() sizing, Framer counter-move.
- LiquidGlass CTA bar + bottom gradient wash.
- Route transitions in `__root.tsx`.
- Reduced-motion / touch users see Phase 1 (translate parallax) which itself falls back to fully static when reduced.

### Layered fallback chain

```text
Best:   WebGL2 + fine pointer + motion OK   → ogl displacement + Framer wordmark counter
Good:   No WebGL, fine pointer, motion OK   → Framer translate parallax (Phase 1, current)
Touch:  Coarse pointer, motion OK            → static hero with fade-in only
Quiet:  prefers-reduced-motion               → fully static, no fade
```

### Phase 3 (later, not now)

If this lands well, the same `<canvas>` becomes the home for: subtle ambient drift overlay, scroll-tied displacement intensity ramp on collection-tile reveals, and a one-shot "page enter" warp on route transitions in. All extensions of the same shader, same canvas — no new architecture.
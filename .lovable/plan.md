## v12 — ONE TAKE

A single 60-second continuous camera move through a 3D gallery of the entire Hive. No scene cuts. Every product, every season, every capability exists as a physical object in one navigable space. The camera is the edit.

Renders headless via Remotion + WebGL/ANGLE in the sandbox.

---

### THE SHOT

```text
START               BACK WALL                MID FIELD              MACRO            HUD            END
[black]  ─────────► [seasonal video wall] ─► [84 tiles in space] ─► [one chair] ──► [brief HUD] ──► [wordmark]
                          home reel          tonal sort happens     real dolly-in    pass-through    pull back
                                              in 3D, in front of                      from interior
                                              the camera
```

One camera. One take. No cuts. ~60s @ 30fps = 1800f.

---

### THE STACK

| Layer       | Tech                                            | Role |
|-------------|-------------------------------------------------|------|
| World       | `three` + `@react-three/fiber` + `@remotion/three` | Gallery, product planes, video walls |
| Camera      | `useCurrentFrame()` driven path                 | Bezier track, deterministic |
| Optics      | `@remotion/motion-blur` `<CameraMotionBlur>`    | Real shutter-angle blur on whip moments |
| Lens        | Custom postprocessing shader (R3F `<EffectComposer>`) | Subtle barrel + chromatic aberration + vignette + grain |
| Home reel   | Three.js `VideoTexture` on a back-wall plane    | Live seasonal clip plays as a wall |
| Products    | 84 PlaneGeometries with product PNG as texture, alpha-cut | Float in field formations |
| HUD         | DOM overlay above R3F canvas                    | Labels, timecode, ELECTIC HIVE wordmark |
| Type        | Cormorant Garamond (display) + JetBrains Mono (HUD) | Mono for timecode keeps editorial |

---

### CAMERA CHOREOGRAPHY

```text
00:00–00:06   black, hairline draws, fade up into 3D space
00:06–00:14   camera floats forward toward back wall, home reel playing
00:14–00:22   camera arcs LEFT, the field of 84 tiles materializes around it
00:22–00:32   TONAL SORT — 16 textile tiles physically migrate to the camera's
              eyeline in tonal order, others recede in depth (real Z motion, not opacity)
00:32–00:38   camera DOLLY-IN to the Adelaide chair card, card grows to full frame
00:38–00:44   chair card dissolves to atelier triptych panels (3 physical panels in space)
              camera tracks RIGHT past each panel
00:44–00:50   camera passes THROUGH a swatch — screen fills with #C7B6A1, color name HUD
00:50–00:56   brief form fades up as a HUD plane the camera passes through
              palette swatches detach from form and float past as physical cards
00:56–01:00   camera pulls back to reveal wordmark in deep space, fade to charcoal
```

No cuts. Every "scene" is a position on one camera path.

---

### LENS / OPTICAL TREATMENT

Custom postprocessing pass added to the R3F scene:

- **Vignette** — subtle, anchors the frame
- **Barrel distortion** — 1–2% only, makes it feel photographed not rendered
- **Chromatic aberration** — 0.5px on edges, fires harder during whip moments
- **Film grain** — 3% animated noise, masks compression
- **`<CameraMotionBlur shutterAngle={180}>`** wraps the whole composition for natural shutter blur on fast moves

This is the "this looks real" layer. Without it Three.js looks like a game; with it, it looks like a Phantom camera in a real room.

---

### MOTION BLUR REALITY CHECK

`<CameraMotionBlur>` works by rendering N samples per frame and compositing. Set `samples={8}` for production. Costs ~8× render time on whip frames but the result is the difference between web 3D and broadcast 3D.

---

### TECHNICAL DETAILS

**New dependencies:**
- `three`
- `@react-three/fiber`
- `@react-three/drei` (for `<Plane>`, `<OrbitControls>` dev-only, etc.)
- `@remotion/three`
- `@remotion/motion-blur`
- `postprocessing` (for the lens stack)

**File structure:**
```
remotion/src/
  v12/
    SiteReelV12.tsx      ─ root composition
    World.tsx            ─ R3F scene root (lights, fog, floor)
    CameraRig.tsx        ─ frame-driven camera path
    BackWall.tsx         ─ seasonal video texture wall
    ProductField.tsx     ─ 84 product planes, formations, tonal sort
    AtelierPanels.tsx    ─ triptych in 3D space
    HudPlane.tsx         ─ brief form as a billboarded plane
    LensStack.tsx        ─ postprocessing shader pass
    HudOverlay.tsx       ─ DOM overlay (timecode, labels, wordmark)
    camera-path.ts       ─ keyframed bezier path data
```

**Render command — needs `--gl=angle` for WebGL in headless chromium:**

Update `scripts/render-v11.mjs` (or new `render-v12.mjs`) to add:

```js
chromiumOptions: { gl: 'angle', args: ['--no-sandbox', '--disable-dev-shm-usage'] }
```

Drop `concurrency: 4` → `concurrency: 2` (3D + motion blur is heavy). Expected render time: 8–12 min. Within sandbox 10-min `code--exec` limit if we go concurrency 2. If we breach, drop to 24fps (1440 frames) or render in two halves and concat with ffmpeg.

**Same composition shape as v11** (1920×1080, charcoal #1a1a1a / white #ffffff / sand #d4cdc4, Cormorant + JetBrains Mono, ALL CAPS HUD).

---

### WHAT IT IS NOT

- Not another slideshow
- Not stitched scenes with transitions
- Not flat 2D motion graphics
- Not CSS-animated divs pretending to be 3D
- Not Premiere-template "modern reveal" energy

It's one camera, one take, our actual world, browser-rendered.

---

### DELIVERABLE

`/mnt/documents/eclectic-hive-onetake-v12.mp4` (mp4, ~1080p, ~60s, ~30–40MB), externalized via `lovable-assets` to `src/assets/onetake-v12.mp4.asset.json`.

v11 stays untouched — this is additive.

---

### RISKS / DECISIONS NEEDED

1. **Render time**: 3D + 8-sample motion blur will be slow. If it breaches 600s sandbox limit, options are: drop fps to 24, drop motion blur samples to 4, render in halves.
2. **GPU in sandbox**: WebGL via ANGLE works in headless Chromium but isn't GPU-accelerated. Three.js with 84 textured planes at 1080p should still render — verified by smaller R3F test before committing to full pipeline.
3. **Approval needed on**: 60s length (vs 45s tighter) and whether to keep v11 in parallel as a "safe" version.

Ready to build on approval.
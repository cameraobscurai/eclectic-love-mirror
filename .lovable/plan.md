# Mobile filmstrip — poster strip + lightbox

Mobile (<768px) currently has no entry point to the seasonal clips because the desktop strip is gated behind `hidden md:block`. We add a mobile-only poster strip below the home hero, before Evolution. No autoplay, no five-video tax. Tap a poster → existing zoom-from-origin lightbox plays with sound. We also tighten the lightbox sizing math so nothing crops or bleeds at any viewport.

## What ships

### 1. New mobile-only poster strip
A horizontal strip of all 5 season posters (Spring · Summer · Late Summer · Autumn · Winter), all visible at once at small widths, just like your reference screenshot. Each tile is a tappable poster with the `01 SPRING` style caption beneath.

Built as a **second render path inside `HeroFilmstrip`** rather than a new component, so the lightbox, zoom origin, and audio fade logic stay in one file:

```text
HeroFilmstrip
├── desktop/tablet path (md+)  → existing 5 video frames, autoplay muted
└── mobile path (<md)          → 5 poster-only tiles, no video
                                  → tap → onOpen(rect) → same Lightbox
```

The mobile tiles render `<img>` only — no `<video>` element mounts at all on mobile, so no autoplay battery/data hit. Posters are already declared on each clip in `src/components/home/clips.ts`, no new assets.

**Layout per your choice:** horizontal flex row, 5 tiles visible, no overflow scroll. Each tile is `flex-1` with a 3/4 aspect, `gap-px` between (hairline charcoal seam, matches desktop). Captions sit below in the existing tabular format but scaled down (`text-[9px]` season label, tighter tracking) so 5 captions fit on a 390px viewport.

**Touch target:** the figure itself is the tap target (existing pattern), so the small tile size is fine — tapping anywhere on the poster opens the full-screen lightbox.

### 2. Placement on the home page
In `src/routes/index.tsx`, render the filmstrip block (currently inside `hidden md:block`) for all viewports. Use a smaller top/bottom rhythm on mobile via the existing `--fold-strip` / `--fold-tail` tokens, or override with `pt-10 pb-12 md:pt-[var(--fold-strip)] md:pb-[var(--fold-tail)]` so the mobile strip doesn't eat as much vertical room as the tall desktop frames need.

### 3. Lightbox sizing fix (carries to mobile too, finally answers your earlier ask)
In `Lightbox` inside `src/components/home/HeroFilmstrip.tsx`:

- **Pre-seed `naturalAspect` per clip.** Add optional `aspect?: number` to `FilmstripClip` in `clips.ts`, default the clips known to be portrait phone footage to `9/16`. Kills the brief letterbox between open and `onLoadedMetadata`.
- **Responsive padding + caption reservation.**
  ```text
  PAD_X       = vw < 640 ? 16 : vw < 1024 ? 32 : 64
  PAD_TOP     = 56            // clears close button
  PAD_BOTTOM  = 56            // reserves caption + breathing room
  maxW = vw - PAD_X * 2
  maxH = vh - PAD_TOP - PAD_BOTTOM
  ```
  Then the existing aspect-fit math fills the remaining real estate at the clip's true ratio. On a 390×844 phone with 9/16 footage we get a near-edge-to-edge video instead of a tiny island.
- **Figure background `bg-charcoal` instead of `bg-transparent`.** During the brief moment `object-contain` is letterboxing (pre-metadata or any aspect mismatch), the bars match the scrim instead of showing the page through. This is the actual "white bar" remedy.
- **Scrim opacity 1.0** (was 0.96). The 4% bleed-through was visible at the edges on tablet.

### 4. Origin rect from the mobile poster
The same `onOpen(rect)` signature works — we pass the tapped tile's `getBoundingClientRect()`. The zoom-from-origin spring animates from the small poster up to the full-screen video frame. No new animation code.

## What we're NOT changing

- Desktop/tablet filmstrip behavior, layout, or videos.
- Zoom-from-origin spring transition.
- Audio fade-in on open.
- Reduced-motion path (still skips lightbox when `prefers-reduced-motion`).
- No new clip files, no re-encoding, no extra asset weight beyond the posters mobile already loads.

## Mobile-specific best practices applied

- **No autoplay video on mobile** — all five clips would compete for decoders, drain battery, and on cellular it's rude. Posters only until tap.
- **`loading="lazy"` and `decoding="async"`** on mobile poster `<img>` so they don't block the home hero paint.
- **Tap target ≥44px** — at 5 tiles across a 390px viewport each tile is ~78px wide and 104px tall, comfortably above Apple's 44pt minimum.
- **Lightbox uses `playsInline`** (already set) so iOS doesn't fullscreen-hijack the video.
- **Scroll lock** already ref-counted via `acquireScrollLock` — safe.
- **Audio fade-in already gracefully falls back to muted** if iOS blocks unmuted autoplay (already handled in the `.catch`).

## Files touched

- `src/components/home/HeroFilmstrip.tsx` — add mobile poster path, fix Lightbox sizing math + figure bg + scrim opacity, seed aspect from clip.
- `src/components/home/clips.ts` — add optional `aspect?: number` field, set `9/16` on portrait clips.
- `src/routes/index.tsx` — drop the `hidden md:block` gate around the filmstrip; tune `padding-top/bottom` for mobile rhythm.

## Verification

- 390×844 (iPhone 12): all 5 posters visible in one row below the hero, captions readable, tap any → lightbox zooms from that tile, video fills viewport with no bars, caption sits clear of bottom edge, close X clears top.
- 820×1180 (iPad Air): existing video filmstrip unchanged; lightbox now edge-to-edge with no white bar.
- 1303×934 (current desktop): no regression on the existing strip.

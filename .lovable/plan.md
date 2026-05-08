## Owner-note round — what I'll address now

Six items came in. Two I'm setting aside per your reply (Atelier "more questions" link is an old note, no longer in code; the 7 new galleries wait for photos). The rest:

### 1. Home — Evolution script, slightly larger
`src/components/home/EvolutionNarrative.tsx`. The per-line `font-size` is currently `clamp(0.9rem, 1.85vh, 1.55rem)` (closer line a notch smaller). Bump to `clamp(1rem, 2.05vh, 1.75rem)` (closer to `clamp(0.95rem, 1.9vh, 1.6rem)`). Stays vh-anchored so the 17-line manifesto still fits one viewport on every breakpoint. No layout structure changes.

### 2. Atelier — first row of THE HIVE photos missing
Root cause in `src/components/atelier/team.tsx`: the first 4 portraits are gated behind `revealReady`, which only flips true once `firstRowLoaded === firstRowImageCount`. If any one of those four images is cached/decoded before the `onLoad` handler attaches, or fails silently, the counter never reaches 4 and the entire row stays invisible.

Fix: remove the synchronized-reveal gate. Each portrait reveals independently as it loads (same behavior the rest of the grid already uses). Keeps eager fetch + high-priority hints; drops `firstRowLoaded` / `revealReady` / `reportFirstRowLoad`.

### 3. Atelier — "MORE QUESTIONS — SEE FAQ"
Confirmed via repo grep: that string does not exist anywhere in the codebase. It was likely removed in an earlier pass and the owner's note predates it. No code change. Will flag in the close-out summary so she knows it's already gone.

### 4. Collection — individual items not opening (QuickView)
Wiring looks correct (`ProductTile.onOpen` → `setQuickViewId` → lazy `QuickViewModal`). This is a runtime issue, not a structural one. Investigation pass:

```text
1. Open /collection in preview, click a tile, check code--read_console_logs.
2. Watch code--read_network_requests for the QuickViewModal chunk —
   is the dynamic import resolving? Failing? 404?
3. Inspect quickViewId state path in collection.tsx (lines 562 + 1329)
   for any guard that's silently bailing.
4. Fix whatever the trace shows. Likely candidates: lazy chunk error,
   modal mounted but z-index/visibility issue, or a click-handler
   swallowed by an overlay (e.g. CollectionWall's hover layer).
```

I won't predict the patch until I see the trace.

### 5. Gallery — scrolling broken (filmstrip + lightbox)
Two surfaces, two fixes:

- **Filmstrip on `/gallery`:** `GalleryFilmstrip` uses `overflow-x-auto scrollbar-hide`. With no visible scrollbar and the "↔ Scroll" hint hidden on mobile (`hidden sm:inline-block`), it looks frozen. Add: a slim always-visible horizontal track on hover/active (custom thin scrollbar style), keep keyboard arrow support, and surface the scroll hint on mobile too.
- **Lightbox:** wheel listener calls `preventDefault()` on the hero plate. On trackpads with vertical-only intent that blocks the sidebar from scrolling on short viewports. Scope the wheel hijack so it only fires on horizontal-dominant deltas (`Math.abs(deltaX) > Math.abs(deltaY)`) OR when sidebar isn't the wheel target. Also verify touch swipe still steps plates (current threshold 40px is fine).

After fixes, re-test in preview at desktop + mobile viewports.

### 6. Gallery — 7 new projects
Deferred. Once you upload the photos I'll add `Love This Day · Brush Creek (Natalie & Ben)`, `Easton Events · Dunton Hot Springs`, `Easton · Blackberry Farms TN`, `Slater Events · Devil's Thumb Ranch`, `Michelle Rago · Anguilla`, `41 North · Santa Fe`, `Diwan by Design · Boston (Sapna & Ari)` to `src/content/gallery-projects.ts` with full coords + summaries, mirroring the pattern of the existing six.

---

## Verification pass (after edits)

- Reload `/` → confirm Evolution lines read a touch larger without spilling viewport at 1440×900 and 390×844.
- Reload `/atelier` → first 4 portraits paint with the rest.
- Reload `/collection`, click 3 tiles across categories → modal opens each time. Console clean.
- Reload `/gallery` → filmstrip shows a draggable thin scrollbar, mouse wheel + arrow keys work. Open a lightbox → vertical scroll on the sidebar works on short viewports; horizontal wheel/swipe still steps plates.

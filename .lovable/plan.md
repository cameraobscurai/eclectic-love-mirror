## Verification plan for Jill's three WEB corrections

Run Playwright against localhost at mobile viewport (390×844) and desktop (1280×1800) to verify each fix visibly, not just in code.

### 1. Hero video sound (mobile + desktop)
- Load `/`, wait for hero video to first-frame.
- Confirm the tap-to-unmute speaker button is present, visible, and toggles `muted` on the active `<video>`.
- Screenshot before/after tap. Check `video.muted` and `video.volume` via `page.evaluate`.
- Desktop `HeroFilmstrip`: verify the same unmute affordance exists there too (Jill said "videos on the main page" — plural). If desktop has no unmute control, flag it.

### 2. Mobile portrait cropping (Jill's photo on /atelier)
- Load `/atelier` at 390×844.
- Screenshot the team section. Confirm Jill appears inline in the staff grid at the same tile size as other staff, no crop, no separation.
- Load at 1280×1800 and confirm the sticky principal column still shows Jill full-frame.

### 3. Side table tile on /collection
- Load `/collection` at both mobile and desktop.
- Element-screenshot the "SIDE TABLES" tile and a neighboring landscape tile (e.g. "COFFEE TABLES"). Measure rendered image bounding box via `getBoundingClientRect` and compare visual footprint ratio.
- If side-tables silhouette is still <70% the height of landscape peers, the padding fix under-shot — propose a smaller inset or a category-specific min-height for the `<img>`.

### 4. Sweep for anything else broken
While in the browser, capture:
- Console errors on `/`, `/collection`, `/collection/nathalie-black-spindle-dining-table-2788`, `/atelier`, `/gallery`, `/contact`.
- Network 4xx/5xx.
- Visual scan of each route at mobile viewport for other invisible-text / cropping / undersized-tile regressions.

### Deliverable
A short report per issue: PASS / PARTIAL / FAIL with a screenshot reference and, if FAIL/PARTIAL, the specific file+line follow-up. No code changes in this pass — verification only. If any item fails, I'll queue the fix as a follow-up plan.

# Gallery polish

## What you asked for
1. Product-centric plate ordering inside each gallery, honoring Jill's notes
2. Lightbox: pinch-zoom + persistent counter
3. Index: hover thumbnail preview
4. Filmstrip: ken-burns on active, fix chevron flicker, snap tightening

No image uploads, no destructive ops, no schema changes. All changes are additive to existing files.

---

## Pass 1 — Plate ordering (the hard one)

### Approach
Hybrid: Jill's grammar comes first, AI vision-rank breaks ties.

1. **Score every plate** in each populated gallery via Lovable AI Gateway (`google/gemini-3-flash-preview`). One image → one JSON object:
   - `productScore` (0-5): how much rentable Hive decor is in frame (tables, chairs, lounges, tablescapes, florals, lighting, rugs, bars)
   - `tags`: subset of `{tablescape, lounge, ceremony, tent-exterior, room-shot, florals, detail-close, portrait, landscape, dance, night, day}`
   - `lifestyleScore` (0-5): editorial-lifestyle vs. snapshot-portrait
2. **Apply Jill's grammar** per gallery from `curationNotes`. Encoded as a small rule table:
   - `amangiri`: chinle dinner → lounge (amphitheater) → landscape → fireside; drop pool-deck filenames
   - `aspen-event-works`: day → personal interleaved → night
   - `lynden-lane`: exclude `1083`, lead with `1143`
   - `brooke-keegan`: lead MKSadler-4118
   - `42-north`: cocktail → ceremony → tent → friday details
   - `love-this-day`: color-grouped Westworld arc
   - others without explicit notes: sort by `(productScore * 0.7 + lifestyleScore * 0.3)` desc, then interleave to avoid 3+ similar tags in a row.
3. **Bake** results into `src/data/gallery/plate-order.json` (`{ galleryNumber: orderedSrcs[] }`). Script lives at `scripts/order-gallery-plates.mjs`.
4. **Load** the manifest in `gallery-projects.ts` — apply ordering to `detailImages` at module init. Falls back to original order if a src isn't in the manifest. Zero runtime cost.

### Cost
~15 galleries × ~25 plates = ~400 Gemini Flash vision calls. Small.

### Safety
- Script is **dry-run first** → writes a proposal JSON + side-by-side preview HTML I can show you → you approve → apply writes the final manifest.
- Existing `detailImages` arrays stay untouched. Hero `coverDirective` arc stays untouched.
- If anything looks wrong, deleting one JSON file reverts everything.

---

## Pass 2 — UI polish (shipped as separate small commits)

### Lightbox: zoom + counter
- Add `react-zoom-pan-pinch` (~6kb, MIT). Wrap `CrossfadeImage` in a pinch/wheel zoom container on mobile + cmd-scroll on desktop. Double-tap to zoom, drag to pan, double-tap to reset.
- Move the `01 / 12` counter from the sidebar into a small persistent badge bottom-left on the hero plate (always visible, including when scrolling the sidebar on tall screens). Sidebar counter stays for redundancy on mobile.

### Index: hover thumbnail
- On `≥ lg` only: cursor-following thumbnail card (~280×340) shows the gallery's cover when hovering each text row. Charcoal frame, subtle fade-in, follows pointer with `requestAnimationFrame` (no library). Mobile keeps current text-only.

### Filmstrip polish
- Active card gets slow ken-burns (scale 1 → 1.04 over 8s, reverse on inactive). Uses existing `prefers-reduced-motion` guard.
- Chevron disabled-state flicker — currently the buttons reflow as `disabled` swaps. Fix by always rendering, opacity transition driven by data attribute.
- Tighten `scroll-snap` to `mandatory` + add small `scroll-margin-inline` so the active card lands flush, not half-pixel off.

---

## Files

**New**
- `scripts/order-gallery-plates.mjs` — dry-run + apply
- `src/data/gallery/plate-order.json` — baked manifest
- `src/lib/gallery-plate-ordering.ts` — apply manifest at module init

**Edited**
- `src/content/gallery-projects.ts` — import + apply ordering
- `src/components/gallery/GalleryLightbox.tsx` — zoom wrapper + persistent counter
- `src/components/gallery/CrossfadeImage.tsx` — accept transform from zoom wrapper
- `src/components/gallery/GalleryIndex.tsx` — hover thumbnail
- `src/components/gallery/GalleryFilmstrip.tsx` — chevron flicker, snap
- `src/components/gallery/GalleryProjectCard.tsx` — ken-burns on `active`

**Added dep**
- `react-zoom-pan-pinch`

---

## Order of operations
1. Build + run the ordering script in dry-run mode. Show you the proposed reorder for 2-3 galleries (Amangiri, Santa Fe, Love This Day) as side-by-side HTML before/after. You approve or redirect.
2. Apply the manifest, ship the gallery-projects wire-up. Verify /gallery still renders.
3. Ship Filmstrip polish (smallest, lowest risk).
4. Ship Index hover thumbnail.
5. Ship Lightbox zoom + counter.

Each step is its own commit. Any one can revert without touching the others.

---

## Not in scope
- New Drive uploads (folders are already mirrored where they exist)
- Cover hero swaps (those are owner-locked via `coverDirective`)
- Pending galleries (#3, #5, #11, #12 if still empty — they show placeholders until folders land)
- Performance pass (separate request per the perf memory; never batched)

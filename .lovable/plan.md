# Gallery expansion

Not a redesign. The visual system, hero, filmstrip, index, tickers, and press band stay exactly as they are. This adds the structural layer the gallery is missing so the owner can actually grow it.

## The core problem

A project is not a place. Clicking a project opens an overlay held in component state — no URL, no back button, no share link, no per-project preview image, nothing for Google or Pinterest or a press mention to point at. The gallery is the taste surface and the referral channel, and right now none of it is addressable.

Second problem: adding a project is a code change. 15 projects live in a hand-authored array wired to a 1,045-line manifest file. The owner cannot add a gallery.

Third: there are no credits. Only the planner. No photographer, florist, venue, caterer — the standard editorial furniture for this industry.

## P0

**1. Project permalinks — `/gallery/{slug}`**
A real page per project. Reuses the existing lightbox internals in page mode, not a rewrite. Per-project title, description, og:image, and JSON-LD. Slug helper already exists.
Touches: new `src/routes/gallery.$slug.tsx`, `GalleryLightbox`, `GalleryIndex`, `GalleryFilmstrip`. Effort: M.

**2. URL state for the overlay**
Opening a project pushes history; back closes it; refresh restores it; a plate index is linkable.
Touches: `src/routes/gallery.tsx`, `GalleryLightbox`. Effort: S–M.

**3. Credits block**
Add optional `credits` (photographer, florist, venue, caterer, rentals) to the project type; render in the lightbox sidebar and the new detail page. Schema and UI are small; the real work is the owner supplying the data.
Touches: `src/content/gallery-projects.ts`, lightbox sidebar. Effort: S.

## P1

**4. Admin: add and manage projects**
Today `/admin/gallery` only reorders plates inside a project. Extend it to add a project, hide one, reorder the index, and set the cover — so new galleries stop being a code change.
Touches: `admin.gallery.tsx`, new table + functions. Effort: L.

**5. Video as a first-class plate**
Video detection is regex duplicated across components. One helper, plus a sound toggle and duration mark on video plates.
Touches: `GalleryIndex`, `GalleryFilmstrip`, `GalleryLightbox`, new util. Effort: S.

**6. Scroll choreography on entry**
Extend the reveal already partly present on the cards with a restrained scroll-velocity parallax, reusing the lightbox parallax pattern. Subtle, not scrollytelling.
Effort: M.

## P2

- Per-project OG image pipeline.
- Split `gallery-manifests.ts` per project; paginate past ~30 projects.
- Map view using the `coords` field that already exists and is unused.

## Explicitly excluded

Masonry or full-bleed scrollytelling rewrite. A new filter/tag paradigm (re-enabling the existing hidden filters is fine; inventing a new one is not). Rebuilding the lightbox from scratch. Any type or color change.

## Technical notes

- `gallerySlug()` in `src/lib/gallery-orders.ts` is already the stable key — permalinks and admin records both key off it.
- The baked-orders-plus-live-snapshot pattern in `gallery.tsx` is sound and should be the model for any new admin-controlled gallery data.
- Detail route reuses `GalleryLightbox` internals. If that reuse turns out not to be feasible, stop and flag rather than rebuilding it.

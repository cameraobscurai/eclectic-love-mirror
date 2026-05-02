## Goal
Populate the Gallery page from the existing `image-galleries` storage folders so the page shows all available projects instead of just Amangiri.

## What I’ll implement
1. Expand the gallery content source to include the 5 additional storage-backed projects already sitting in `image-galleries`:
   - Aspen Event Works / Aspen
   - Birch Design Studio / Caribou Club
   - Easton Events / Big Sky
   - Brooke Keegan Events / Dunton Hot Springs
   - Lynden Lane project

2. Wire every image in each folder into its project’s `detailImages` so the panel surfaces the full set now, with curation deferred to a later pass.

3. Choose stronger hero images for the rail cards based on visual read, not alphabetical order.
   Current likely hero picks from the samples reviewed:
   - Aspen Event Works: `Ceremony Favorite.jpg` or `Tent 3.jpg`
   - Birch Design: `Caribou Rehearsal Dinner Tablescape 2.jpg`
   - Easton Events Montana: `Tent.jpg`
   - Brooke Kegan / Dunton Hot Springs: needs one stronger wide/scene image from the folder than the sample closeups reviewed
   - Lynden Lane: likely `nb-25-taylor&brenden-1083.webp` or `...1474-min.webp`

4. Preserve the existing gallery UI and behavior (`GalleryFilmstrip`, project panel, thumbnail strip). This is a content propagation pass, not a layout redesign.

## Metadata approach
I found supporting public references for several projects via Eclectic Hive’s existing public portfolio:
- Birch Design Studio → Caribou Club
- Easton Events → Big Sky
- Brooke Keegan Events → Dunton Hot Springs
- Aspen Event Works → Aspen

For Lynden Lane, public search confirms the planner brand, but not the exact venue/location from the folder alone. I’ll add the project with a safe title and neutral metadata unless I can confirm more from the codebase/public references during implementation.

## Files I expect to update
- `src/content/gallery-projects.ts`
- likely a new content/helper file for storage-backed gallery manifests, to keep `gallery-projects.ts` clean
- possibly `src/content/amangiri.ts` pattern-matched into a broader gallery content structure

## Technical details
- Reuse `galleriesUrl()` from `src/lib/storage-image.ts`.
- Keep the existing `GalleryProject` type shape.
- Generate `detailImages` arrays directly from known storage paths per folder.
- No database or schema changes needed.
- No UI component rewrite needed unless a content size issue becomes obvious during implementation.

## Notes / guardrails
- I will not invent fake bridge copy or speculative project descriptions.
- I will keep alt text honest and generic where exact scene naming is unknown.
- If one folder’s hero image still feels weak after review, I’ll swap to the strongest composition during implementation.

Approve this and I’ll implement the propagation pass.
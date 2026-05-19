## Goal

On `/studio`, let visitors browse the same 630-product catalog the `/collection` page uses, with two ways to find pieces:

1. **Text search** — port the collection's debounced search-and-rank logic
2. **Visual search** — upload an image, extract its palette via the existing `color-engine`, surface catalog pieces whose `color_tags` overlap

Clicked pieces pin into the existing inquiry/style-brief flow.

## Heads-up on the referenced projects

I checked both `eclectichive` and `Remix of eclectichive`. Neither has visual-search code — `DesignStudio.tsx` is the AI render tool (sketch→furniture, fabric restyler), and `Inventory.tsx` is plain text filter. So we're building visual search fresh, not porting. Best ingredient we already own is `src/lib/color-engine.ts` (`analyzeMoodboard`) — already used on `/studio` to derive palette from inspo uploads — plus the `color_tags` baked into `current_catalog.json`.

## What to build

### 1. New component `src/components/studio/StudioBrowser.tsx`
A self-contained inventory browser dropped into `/studio` as a new section between the inspo step and the form. Three modes via tabs:

- **Browse** — category pills (reuse the 14 facets from the catalog) + product grid
- **Text** — search input that filters + ranks by title (same algorithm as `collection.tsx` lines 407–451)
- **Visual** — image dropzone → `analyzeMoodboard()` → display extracted palette as swatches → grid of catalog items ranked by `color_tags` overlap with the extracted dominant colors

Grid tiles reuse `ProductTile` from `src/components/collection/ProductTile.tsx`. Click pins into `useInquiry()` (already wired). Quick-view via existing `QuickViewModal`.

### 2. Wire into `/studio`
Add the browser between the existing palette step and the form. If the visitor has already uploaded inspo images, the Visual tab auto-seeds with that palette — no re-upload needed.

### 3. State via URL search params (light)
Use TanStack `validateSearch` for `mode` (`browse`|`text`|`visual`), `q`, `cat`. Skip persisting the uploaded image to URL — it's session-only. This keeps shareable links working without bloating the URL.

### 4. Visual-match scoring
Pure client-side, no server call:
- Take top 3 dominant colors from `analyzeMoodboard` (LAB or hex)
- For each catalog product, compute min ΔE between its `color_tags` and the query colors
- Sort ascending; show top 24

Algorithm lives in `src/lib/visual-match.ts` (new), imports the existing color utilities. No new deps.

## Technical details

**Files to touch:**
- NEW `src/components/studio/StudioBrowser.tsx` (~250 lines)
- NEW `src/lib/visual-match.ts` (~60 lines, pure)
- EDIT `src/routes/studio.index.tsx` — add `validateSearch`, mount `<StudioBrowser />`, pass current analysis palette down
- REUSE `src/lib/phase3-catalog.ts` (`getCollectionCatalog`), `src/components/collection/ProductTile.tsx`, `src/components/collection/QuickViewModal.tsx`, `src/hooks/use-inquiry.ts`, `src/lib/color-engine.ts`

**No backend changes.** `current_catalog.json` already has color_tags from the existing AI color pipeline. No new migrations, no new server functions, no new deps.

**Design tokens only.** Tabs/pills match `CategoryPill` styling. ALL CAPS labels per site voice.

**Performance:** catalog (~630 items) loads once via existing memo. Visual-match is O(n) over ~630 — sub-10ms. Debounce text input 200ms like collection does.

## Out of scope (v1)

- True embedding-based visual similarity (CLIP/etc.) — color-overlap is the right MVP given the catalog already has color_tags
- 3D model preview in browser — `/studio/three` already exists separately
- Saving visual-search uploads server-side — session-only

## Build order

1. `visual-match.ts` (pure function, testable standalone)
2. `StudioBrowser.tsx` with Browse + Text tabs working
3. Add Visual tab using existing analysis output
4. Wire into `studio.index.tsx` with search-param state
5. Manual QA: search "chair", pin two items, switch to Visual, confirm palette-driven results differ

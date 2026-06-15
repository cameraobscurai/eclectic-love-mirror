## What we're building

A `/admin/gallery` page that lists every gallery (Amangiri, Brush Creek, etc.) and lets you drag-reorder its plates AND pin a custom front-of-arc — same UX as the Collection per-product reorderer.

Sidebar nav gets two changes:
- `Photos` → `Collection` (matches the public /collection route it edits)
- New `Gallery` item below it (matches the public /gallery route it edits)

```text
INVENTORY
├─ Collection         ← renamed from "Photos"
├─ Gallery            ← NEW
├─ Upload hero
├─ Incoming photos
├─ Image health
├─ Image QA
└─ Color QA
```

## How the gallery reorder persists

Galleries today are static arrays in `src/content/gallery-manifests.ts` + a hard-pin override hardcoded in `src/content/gallery-projects.ts` (Amangiri). We can't edit source files from an admin tool, so order moves to the database.

New table `gallery_orders`:
- `gallery_slug` text PK (derived from `name`, e.g. `amangiri-az`)
- `pinned_keys` text[] — front-of-arc heroes, in order (replaces the hardcoded `pin:` arrays)
- `order_keys` text[] — full plate order; `null` = use manifest default
- `updated_at` timestamptz

The Gallery route loader merges DB overrides over the manifest at request time. Pinned keys jump to the front in the given order; remaining plates follow `order_keys` if present, else the manifest's original sequence. The existing `promoteHeroes` hard-pin path stays as a build-time fallback so anything not yet overridden in the DB still renders.

## Admin UX (mirrors `/admin/photos` + `ImageOrderEditor`)

`/admin/gallery` — index list:
- Grid of gallery cards (hero + name + plate count + pinned-count badge)
- Click → opens the per-gallery editor inline

Per-gallery editor (one card per gallery, drag-and-drop on the full plate list):
- "Pinned heroes" strip at the top (up to 4 slots) — drag plates in from the main grid
- Main reorder grid — every plate, dnd-kit sortable, autosave on drop (debounced)
- "Reset to manifest default" button
- Save state badges (`saving` / `saved` / `error`) identical to Collection editor

## Files

NEW
- `supabase/migrations/<ts>_gallery_orders.sql` — table + RLS + grants
- `src/lib/gallery-orders.functions.ts` — `getGalleryOrder`, `saveGalleryOrder`, `resetGalleryOrder` (admin-only)
- `src/lib/gallery-orders.ts` — pure merge helper `applyGalleryOrder(manifestImages, dbOrder)` used by both the public Gallery loader and the admin editor
- `src/routes/admin.gallery.tsx` — admin index + inline editor
- `src/components/admin/GalleryOrderEditor.tsx` — dnd-kit sortable, modeled on `ImageOrderEditor`

EDITED
- `src/components/admin/admin-shell.tsx` — rename `Photos` → `Collection`, add `Gallery` nav item, update CRUMB_LABELS
- `src/content/gallery-projects.ts` — Amangiri's hardcoded `pin:` stays as a fallback (DB override wins when present); add stable `slug` derivation
- Gallery detail route loader — apply DB order before render

## Out of scope (call out)

- Cross-gallery reordering (the order galleries appear on `/gallery`) — separate tool
- Editing plate metadata (captions, alt text) — separate tool
- Uploading new plates from this UI — the existing `/admin/incoming` flow stays the upload path

## Open question

Renaming `Photos` → `Collection` is what you suggested and it does match the public route. Confirming before I ship that label.
# Plan: Glue The Site Together

Four passes. Ship in order. Each pass is independently shippable and reversible.

---

## Pass 1 — Gallery becomes a funnel (#3 + #6)

**Goal:** Gallery stops being a dead-end. Every lightbox can convert to inquiry or brief.

**Schema**
- Add `relatedInventorySlugs: string[]` to `GalleryProject` in `src/data/gallery-projects.ts`
- Optional `shopTheLookEnabled?: boolean` per project (default true when slugs exist)

**Component**
- `src/components/gallery/GalleryLightbox.tsx`
  - New "SHOP THE LOOK" rail under the caption — horizontal scroll of product tiles resolved from `current_catalog.json` by slug
  - Per-tile "ADD TO INQUIRY" button (writes to existing `inquiryStore`)
  - "START A BOARD FROM THIS" secondary action — opens `/studio` with project context in query params

**Data**
- Bind slugs for 3–5 hero projects manually first (no admin UI yet)

---

## Pass 2 — Tray → Brief handover (#4)

**Goal:** Inquiry tray and Studio brief stop being parallel intake systems.

- `src/components/collection/InquiryTray.tsx`
  - When `items.length >= 3`, add secondary "BUILD A BRIEF" action next to the existing inquiry CTA
  - Routes to `/studio` with tray contents preloaded into a new draft brief
- `src/routes/studio.tsx` (or its draft loader)
  - Accept `?from=tray` and hydrate the brief's product list from `inquiryStore`

---

## Pass 3 — Boards → one-click inquiry (#5)

**Goal:** Remove the `mailto:` dead-end. Client clicks one button and the Hive gets a real inquiry.

- `src/components/studio/BoardDeck.tsx:402`
  - Replace `mailto:` with a server function call that creates an `inquiries` row with `source: 'board'` and `board_id` reference
  - Confirmation toast + state flip on success

**Schema**
- Add `source text` and `board_id uuid references style_boards(id)` to `public.inquiries` (nullable, no backfill)
- Migration includes the GRANT block

---

## Pass 4 — Admin cache + concurrency fixes (HIGH bugs from earlier audit)

**Goal:** Admin actions actually reflect on `/collection`. Two admins can't stomp each other.

- `src/routes/admin.image-qa.tsx`
  - `toggleItemVisibility` → call `invalidateCollectionCatalog()` after success
  - Fix `expectedUpdatedAt` by selecting `updated_at` in the read query
- `src/routes/admin.colors.tsx`
  - Add `invalidateCollectionCatalog()` to `overrideColor`, `setColorLocked`, `clearColorTag`
- `src/lib/photos-admin.functions.ts`
  - Add `expectedUpdatedAt` concurrency guard to `reorderItems`
- `src/lib/inventory-images.functions.ts:143`
  - Add `expectedUpdatedAt` to `setCoverFocal`

---

## Out of scope (deliberate)

- Mobile polish (#8) — separate pass, low structural risk
- Catalog-engine unification in Studio picker (#7) — larger refactor, defer
- Admin UI for binding gallery slugs — manual bind first, build UI only if needed
- New animations, new pages, design changes

---

## Order & gates

1. Pass 1 → verify lightbox CTA fires and tray updates from `/gallery`
2. Pass 2 → verify tray with 3+ items deep-links into `/studio` with items present
3. Pass 3 → migration first (dry-run review), then component swap, verify inquiry row lands
4. Pass 4 → one file at a time, verify cache invalidation on `/collection` after each toggle

Stop after each pass for your review before starting the next.

# Adrienne's notes — decoded and sequenced

Twenty-three loose lines. Most collapse into six real defects. Each item below cites what was verified.

## What her notes actually are

| Her words                                                  | Verified cause                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Where did Quantity go?"                                   | The new-product form saves the numeric `quantity` but hardcodes `quantity_label` to null (`admin.new-product.tsx:107`). Every live surface reads **only** `quantity_label` (`phase3-catalog.ts:296,353,404`). So her number is stored and never shown.                                                                                                                           |
| "Things are not updating on live / it converts right back" | Once Publish has run once, the live site reads the published snapshot and **never re-reads the database** (`phase3-catalog.ts:504-508`). Edits made in `/admin/products` save to the DB but no surface tells her to Publish, and only `/admin/photos` has the button. Nothing reverted — it never left the DB.                                                                   |
| "Says 9 images, only 2 show"                               | The photos tile counts the **merged family** image set; the editor opens **one row** (`products-admin.functions.ts:112`). 3 variants x 3 photos = 9 on the tile, 2 in the drawer.                                                                                                                                                                                                |
| "Only needs one product page, no in-between"               | Tile clicks open QuickView, never the real page (`ProductTile.tsx:104`, `collection.tsx:1153`). The real product page exists but nothing on the site links to it.                                                                                                                                                                                                                |
| "Back/Collection buttons don't work"                       | Back guesses from `document.referrer` + history length (`collection_.$slug.tsx:389-399`); when the guess fails it hard-reloads and loses her place. Fixes itself once tiles link to the page normally.                                                                                                                                                                           |
| "Variants/configurations are clunky"                       | There is **no variant field in the database**. Families are guessed at build time by a string matcher against an old site snapshot (`scripts/family-rollup.mjs`), and the "main" item is just whichever variant has the most photos (`family-rollup.mjs:202`). She cannot choose, combine, or split anything. This is the root of Inola/Iraja, Monroe/Sinatra, and Vespa/Patina. |

## The work, in order

### 1. Quantity — same day

Show the number she typed. Carry `quantity` through the publish snapshot alongside `quantity_label`, and render "4 available" when there's no label. Add the label field ("EACH", "SET OF 4") to the new-product form.

### 2. New Inventory page gaps — same day

Add a **Notes / description** field ("Available October 2026"). Collection and Category are already there and required; leave as-is.

### 3. Publish stops being a trap — same day

- Show a persistent "N unpublished changes — Publish" bar on **every** admin page, not just Photos.
- Any edit anywhere marks the site pending; one click publishes.
- Tell her plainly when it's live.

### 4. Photos page becomes the audit tool — 1 day

- Remember her last view choice; add a third, denser "small icons" size and make it her default once chosen.
- Clicking a tile opens the **full product editor**, not just the photo panel.
- Hidden items appear, dimmed with a HIDDEN badge, instead of vanishing.
- Each thumbnail shows its filename and position so she can tell what she clicked.
- Family tiles say "9 across 3 items" instead of a count that doesn't match the drawer.

### 5. One product page on live — 1 day

- A tile click goes to the product page. QuickView is retired.
- Back and Collection become ordinary links that always work.

### 6. Variants and configurations — the real fix, 2-3 days

Replace the build-time guess with something she owns:

- Two new fields on inventory: which family an item belongs to, and which item is the **main** one.
- In the products list: a MAIN badge, and components indented under their parent.
- On the main item's page: all components edited in one place — title, photos, dimensions, status — with "Add component", "Combine into this item", and "Split out".
- Clicking a configuration on the live site swaps the title and photos in place. No second page.
- Migration: import today's guessed groupings once so nothing moves, then she corrects by hand from there.

### 7. Cleanup — half day

- Deleting an item removes its photos from storage too (today they're orphaned, `products-admin.functions.ts:207-223`).
- Removing a photo that's already gone succeeds quietly instead of erroring.

## Two items I could not confirm

- **"Hidden creates a blank space on Live."** The code filters hidden items out of the list before the grid is built, so it should close up. I need the category she saw it in to reproduce.
- **"Search is very slow."** Admin search is server-side with a 250ms delay and a full row count on every keystroke — the count is the likely drag. I'll measure before changing anything.

## Already correct — no work needed

Live search already spans the whole catalog, not the current category (`collection.tsx:443-456`).

## Technical notes

- Items 1-5 and 7 are contained changes to existing admin routes, `phase3-catalog.ts`, and `photos-admin.functions.ts`. No schema change.
- Item 6 needs one migration (family + main-item columns, grants, policies) and touches the admin list, product editor, and the bake script.
- Sizing, framing, and taxonomy work stays untouched throughout.

## Checkpoints

Stop for review after item 3 (she can verify her own edits reach the site), and again before item 6 ships, since it changes how she thinks about inventory.

# Variants, configurations, and the delete ghost

Claude is right on the substance. Three of his points change this plan, one I'm downgrading, and the sequencing moves.

## What I verified in code before writing this

- `deleteProduct` removes the database row and nothing else. The COLLECTION grid is built from the baked catalog plus the published overlay, and the overlay is assembled by walking live rows — a deleted row simply stops being mentioned, so its baked tile survives on both the admin grid and the live site until the next full bake. Adrienne's "image remains and there is an error" is exactly this.
- 85 families, 301 variant rows. 294 resolve to a photo, 7 do not, 1 family has two variants on the same photo.
- A variant's photo is derived, not declared: `phase3-catalog.ts:297` takes that row's `images[0]`.
- The product page has no variant switcher. Variant chips and image-to-variant matching exist only in QuickView, which still guesses from filenames.
- `/collection` sends a tile click to the product page when the row has a slug, and falls back to QuickView when it doesn't. So QuickView is a fallback entry, not the main one — narrower than Claude read it, but still the only place variants appear.

## Accepted from Claude

**1. The option axis.** Adrienne isn't asking for a sibling list, she's asking for a configurator — "I click Square Bar and the title changes to Square Bar." Two fields:

```text
product_families
  option_name  text null   -- "Configuration", "Size", "Finish"; null = plain family

inventory_items
  variant_label text null  -- "Square Bar", "Patina", "8 ft"
```

`variant_label` falls back to the diffed portion of the title, but declared beats diffed. The chip then swaps photo, dimensions, quantity, and displayed label.

**2. The pointer must survive our own pipelines.** A URL pointer breaks the moment a migration rewrites `images[]` — cache-busting suffixes, mirroring, any bulk swap. So: the validation compares normalized URLs (query string stripped), and R6 gains a line requiring pointer remapping to travel in the same statement as any image rewrite. Clear-on-delete stays, but only for genuine removals.

**3. "Add variant" from the parent.** The family board needs an action that creates a row pre-linked to the family and opens it. It wasn't in the plan; it is now.

## Downgraded

**"9 images but only 2 show" is not a count bug.** The count is the merged family pool; the gallery is the filename guess. It disappears when the guess is deleted in phase 4. No separate fix.

## Order of work

**0 — Delete tombstone. First, alone, today.** The overlay is assembled by walking live rows, so a deletion is invisible to it — the tombstone cannot live on `inventory_items`. It gets its own table:

```text
deleted_items (id, rms_id, deleted_at, deleted_by)
```

The publish snapshot serializes it as a suppress-list; the phase-3 merge filters against it. Four rules:

- **Suppress at both levels.** The check runs on the tile _and_ on every entry in `variants[]`. A deleted variant row is folded inside a baked family, so filtering only top-level products moves the ghost down a level — a live tile with a dead chip, which phase 4 turns into a clickable error.
- **Deleted lead falls through.** If the tombstoned row is a family's lead, the baked tile still carries its cover, title, and copy. Suppressing the ID must not remove the tile — the siblings are still rentable. Rule: lead tombstoned → the next sibling by family position becomes display-lead until the bake catches up.
- **Self-expiring.** The next full bake reads the database, where the row is simply absent, so the tombstone has nothing left to suppress. Purge `deleted_items` at bake time — one line in `bake-catalog.mjs`, not a cron.
- **Delete lights the Publish badge.** `deleteProduct` increments the same pending state every other edit does. Otherwise she deletes, sees it gone from the admin grid, assumes done, and the live ghost persists — the same trust failure one layer down.

The admin grid also reconciles against the database rather than the snapshot, since it is an audit surface.

**1 — Schema.** `product_families` (with `option_name`), `inventory_items.family_id`, `variant_label`, `variant_cover_url`. Pointer validated against normalized URLs in that row's `images[]`. Empty pointer = AUTO, which is today's behaviour, so day one is a no-op.

**2 — Bake and runtime.** Bake selects the new columns; `phase3-catalog` resolves the variant photo as pointer, then `images[0]`. Family membership reads declared first, heuristic second, until the 85 are walked.

**3 — The family board, inside the drawer.** Replaces the read-only panel: every sibling with thumbnail, label, dimensions, quantity, AUTO/PINNED badge; set the variant photo from that row's own photos; set the lead; add a variant; jump between siblings without leaving the drawer; coverage line plus warnings for the 7 photoless variants, the duplicate photo, and duplicate `variant_label` within a family — two chips reading "Square Bar" is the same class of silent wrongness. A lead marker also goes in the `/admin/products` rows so the question is answerable outside the drawer.

**4 — The configurator on the product page.** Option-name heading, chips of variant labels, selection swaps photo, dimensions, quantity, and label. Deep-linkable `?v=`. Inquiries carry the selection. Filename matching is deleted. QuickView's remaining entry branch fires only when a row has no slug, so "one product page" means auditing standalone tiles for missing slugs and backfilling them first — otherwise QuickView is retired everywhere except the rows that need a real page most.

**5 — Verification.** First fixture written is the deleted-lead fall-through, because nobody triggers it in testing and she will trigger it in week one. Then pointer precedence, URL-normalization, delete-clears-pointer, variant-level suppression; a coverage audit script; the RMS re-import loop test extended to prove pointers and labels survive.

## Running alongside, not blocking

- **"Changes convert right back."** Instrument before fixing — log overlay hit versus baked fallback per field on one of her reported reverts. Suspects in order: edits never published, the 60s catalog memo plus CDN TTL, or a variant edit hidden behind the lead's data on the family tile.
- **Global search on live.** The catalog is already fully client-side on `/collection`; cross-collection search is cheap.
- **Admin speed.** `admin.photos` pulls the whole catalog on every mount with no query cache and renders every tile. Two fixes: cache it the way the taxonomy tree is cached, and virtualize the icons grid.
- **Repros needed from her:** the broken Back/Collection buttons, and the blank space from a hidden piece. Neither reproduces from reading the code.

## One question for Adrienne

"Available October 2026" in a description renders publicly. If that's a status rather than marketing copy, it's a small availability field with a badge, not prose.

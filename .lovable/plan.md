# What's left: phases 1-5, ordered by risk

Phase 0 (delete tombstones) shipped. Everything below is the variant/configurator
work, plus the loose items running alongside.

## Phase 1 — Schema (low risk, reversible)

- `product_families(id, title, slug unique, lead_rms_id, option_name, created_at, updated_at)`
- `inventory_items`: `family_id`, `family_position`, `variant_label`, `variant_cover_url`
- `variant_cover_url` validated against normalized URLs (query string stripped) in that row's `images[]`; cleared on genuine image removal.
- Backfill `product_families` + `family_id` from `family-map.json` so membership is byte-identical on day one.

Risk: near zero. Empty pointer = AUTO = today's behaviour. Nothing reads the columns yet.

## Phase 2 — Bake and runtime (medium risk, catalog-wide)

- `bake-catalog.mjs` selects the new columns; `family-rollup.mjs` uses `db:<family_id>` when set, heuristic otherwise.
- `phase3-catalog.ts` resolves a variant photo as pointer → `images[0]`.
- Invariants to hold: `variants[]` includes the lead row; a single-member DB family still emits `variants: []`.

Risk: this is the one that can move 636 tiles. Mitigation: diff baked JSON before/after the switch and require zero product-count delta and zero cover-URL delta on families with no pointers set.

## Phase 3 — Family board in the drawer (medium risk, admin only)

Replaces the read-only `FamilyPanel`: sibling thumbnails, label, dimensions, quantity, AUTO/PINNED badge; set variant photo from that row's own photos; set lead; add variant pre-linked to the family; jump between siblings without closing the drawer. Warnings for the 7 photoless variants, the 1 duplicate photo, and duplicate `variant_label` inside a family. Lead marker also shows in `/admin/products` rows.

Risk: contained to admin. Worst case is a confusing panel, not a broken site.

## Phase 4 — Configurator on the PDP (highest risk, public)

Option-name heading, chips of variant labels, selection swaps photo/dimensions/quantity/label, deep-linkable `?v=`, inquiries carry the selection. Filename matching deleted.

Blocker to clear first: QuickView still fires for rows without a slug. Audit standalone tiles for missing slugs and backfill before retiring the filename guess — otherwise the rows most needing a real page lose their only surface.

Risk: public-facing and it removes the fallback. Ship behind a per-family gate: only families with `option_name` set render the configurator; everything else keeps today's gallery.

## Phase 5 — Verification

First fixture is deleted-lead fall-through. Then pointer precedence, URL normalization, delete-clears-pointer, variant-level suppression. Coverage audit script. Extend `intake:test` to prove pointers and labels survive an RMS re-import (R6).

## Chronological risk analysis

The order 1→2→3→4 is correct and shouldn't be reshuffled:

- **1 before 2** is forced — the bake can't select columns that don't exist.
- **2 before 3** is the one worth questioning. Building the board first would let Adrienne set pointers that nothing reads yet, which feels safe but means her first pointers land untested against the bake. Keep 2 first, verify with the diff, then hand her the board.
- **3 before 4** is non-negotiable. Shipping a public configurator on heuristic membership means the chips are guesses. The 85 families have to be walked in the admin before they're rendered to customers.
- **5 runs alongside, not after.** Each phase lands with its fixtures. A trailing test phase gets cut.

The real risk isn't ordering, it's Phase 2 landing on a Friday. Bake, diff, review, publish next morning — same discipline as the lighting bake.

## Running alongside (not blocking)

- "Changes convert right back" — instrument first: log overlay hit vs baked fallback per field on one reported revert.
- Admin speed: cache the catalog on `admin.photos` mount, virtualize the icons grid.
- Repros still needed from Adrienne: broken Back/Collection buttons, blank space from a hidden piece.

## One open question for Adrienne

"Available October 2026" in a description renders publicly. If that's status rather than copy, it's an availability field with a badge, not prose.

# Variant family track — what's left, step by step

Done and not reopening: delete tombstones, family schema, 85-family backfill
(301 rows, 0 drift), bake + runtime resolver, writable Family Board in the drawer.

Remaining: A → B → C → D. Nothing else belongs in this track.

## Step A — Walk the 85 families in the admin

Before anything public renders chips, the declared data has to be true.

1. Warning sweep in the board: 7 photoless variants, 1 duplicate photo,
   duplicate `variant_label` inside a family.
2. Set `option_name` only where a real axis exists (Size, Finish). No axis = no
   configurator later. This is the per-family gate.
3. Set the landing piece where AUTO picked wrong.
4. Publish once at the end, not per family.

Risk: low. Admin-only, reversible, no public surface reads `option_name` yet.
Failure mode: nobody walks it, and step C ships guesses. That's the real risk in
this whole plan.

## Step B — Prove the drawer workflow end to end

Playwright: open COLLECTION → click a family photo → rename variant → reorder →
pin a photo → reset to AUTO → close → reopen → values persisted. Plus the
negative: pin a photo that isn't that row's own and confirm Postgres rejects it
with a readable message.

Risk: low. Catches a broken write before Adrienne does.

## Step C — PDP configurator (the only public change)

Gated per family on `option_name`. Families without it keep today's gallery.

- Option heading + chips of `variant_label`.
- Selection swaps photo, dimensions, quantity, title.
- Deep-linkable `?v=`.
- Inquiry carries the selected variant.
- Filename matching deleted — but only after the slug audit below.

Blocker: QuickView still fires for rows with no slug. Audit standalone tiles for
missing slugs and backfill first; otherwise retiring the filename guess removes
the only surface those rows have.

Risk: highest in the track. Public, and it drops a fallback. Mitigation is the
per-family gate plus staged rollout — turn on `option_name` for three families,
look at them live, then the rest.

## Step D — Lock it

- Fixtures: pointer precedence, URL normalization, delete-clears-pointer,
  variant-level suppression, deleted-lead fall-through.
- Extend `intake:test` to prove pointers and labels survive an RMS re-import (R6).
- Coverage audit: families with an axis but missing labels.

Risk: none. Cost is skipping it — the pointers become unowned within a month.

## Ordering

A before C is non-negotiable: chips rendered off unreviewed membership are
guesses shown to customers. B is cheap and belongs before A so a broken write
doesn't waste the walk. D lands with each step, not after.

Bake/publish never on a Friday afternoon. Same discipline as the lighting bake.

## One open question for Adrienne

"Available October 2026" in a description renders publicly. If that's status, it
is an availability field with a badge, not prose.

# Plan — merged with your handoff doc

The handoff is solid. Following it as-written has 4 collisions with what we already shipped. Below: where I agree, where I push back, and the order of operations.

---

## Where the handoff is right (no changes)

- Stack adaptation rules (TanStack Router, Tailwind v4 tokens, no React Router).
- Verbatim copy list of types/hooks/canvas/21 blocks/image drawer/lexicon edge fn.
- `useInventory.ts` rewrite reading `current_catalog.json` directly. Variant flattening is correct.
- `bun add @dnd-kit/* html-to-image jspdf sonner lucide-react`.
- Drop `sync-catalog`, XLSX import, rename-manifest, inventory tables. Eclectic Hive IS the source.
- Visual rules: strip every `rounded-*` and `shadow-*`, `font-display` on block headings, monochrome only, no Sparkles AI chrome. The final grep check stays.
- Lexicon system non-negotiable — without it the AI writes generic copy.

## Where I push back

1. **Two systems will collide if we just "port and mount."**
   - Current `/studio/$token` reads `style_boards` (pinned RMS ids + named palette swatches + curator notes). Natasha's board is seeded there.
   - The proposal tool stores `blocks[]` — a discriminated-union JSON document.
   - These are different shapes. The handoff doesn't address storage on the eclectichive side.
   - **Decision:** new table `proposal_decks (id, token, meta jsonb, blocks jsonb, created_by, sent_at, ...)`. Leave `style_boards` alone. `/studio/$token` route stays the public deck view; it will resolve a token against **both** tables (proposal first, style_board fallback) until we migrate Natasha into the new shape. No data loss, no big-bang.

2. **Background color in the handoff is wrong for this repo.**
   - Handoff says `bg-background` = paper `#fafaf7`. Memory + current `styles.css` say the baseline was flattened: `--cream` and `--paper` both resolve to `#ffffff`. Old `#fafaf7` survives only as `--cream-accent` for transition.
   - **Decision:** keep `#ffffff` page background. Do NOT reintroduce paper-tan. Don't touch `styles.css` tokens. Use `bg-background`/`bg-card` as the handoff says — they already resolve to white in this repo. That's the correct outcome anyway; cutout product PNGs need pure white.

3. **The handoff doesn't fix what the user is actually staring at right now.**
   - Natasha's deck at `/studio/natasha-aug2026-garden` renders product cutouts with `object-cover`, cropping leather chairs into abstract slabs. The site nav bleeds into the cover. The hero title clips.
   - The builder port is multi-day work. Natasha's deck has to stop looking broken today.
   - **Decision:** Pass 0 (below) is an emergency patch on the existing `BoardDeck.tsx`. Tiny, surgical, no architecture change. Lands before any builder code.

4. **`/studio/builder` route gating.**
   - Handoff says create `/studio/builder`. That's an internal admin tool — never public.
   - **Decision:** mount it under the admin guard (`has_role('admin')` via `requireSupabaseAuth` middleware on its server fns + a client guard on the route). Public link stays `/studio/<token>` only.

5. **`Toolbar`/`StudioBuilder` is a shell, not a verbatim copy of source's `src/pages/Index.tsx`.**
   - The doc says copy `Index.tsx` verbatim. Source is React Router DOM page-based. Verbatim copy will trip on layout assumptions and the existing `/studio` siblings (`studio.index.tsx`, `studio.lab.tsx`, `studio.three.tsx`, `studio.$token.tsx`).
   - **Decision:** copy structure, not file. New `src/components/studio/StudioBuilder.tsx` wires the ported hooks + canvas + drawer. Route file is a thin 6-line `createFileRoute`.

---

## Order of operations

### Pass 0 — Emergency deck fix (THIS turn, ~30 min, no new deps)

Touches only `src/components/studio/board/BoardDeck.tsx` and the route file. No data changes.

- `ProductionPage` cells: replace `object-cover` with the catalog pattern — white background, `object-contain` with padding, max-aspect clamp. Reuse `getTilePreset` + the `padClass` from `CollectionWallTile.tsx` so cutouts render identically to `/collection`.
- `MoodHeroPage` triptych cells: same fix.
- `SectionDividerPage` checker tiles: same fix.
- `CoverPage`: drop the muddy gradient + `opacity-70`. Two layouts gated by whether `cover_pinned_rms_id` is set:
  - Pinned cutout → product floats on charcoal, type beside it (no crop, `object-contain`).
  - No pin → typographic cover, no image, single hairline rule.
- Add `<style>{`html, body { background: var(--charcoal) }`}</style>` removal — make sure the deck page eats the global nav by setting a layout-segment escape (pathless `src/routes/_deck.tsx` with no nav/footer, move `studio.$token.tsx` under it as `_deck.studio.$token.tsx`).
- PDF export keeps working because it captures `[data-board-page]` which is unchanged.

Result after Pass 0: Natasha's deck looks like a Hive artifact, not garbage. We can ship it while the builder gets built.

### Pass 1 — Port the builder (next session, follows handoff §1-§6 verbatim)

Strict order:
1. `bun add` deps.
2. Copy verbatim: `src/types/proposal.ts`, `src/hooks/useProposal.ts`, `src/hooks/useMoodboard.ts`, `src/hooks/useKeyboardShortcuts.ts`, `src/lib/export-utils.ts`, all of `src/components/proposal/**` + `src/components/moodboard/**`.
3. **Conflict resolution before paste:**
   - Source `src/lib/color-engine.ts` vs ours. Ours is wired into `/admin/colors` and `style_boards`. Do NOT overwrite. Rename source to `src/lib/proposal-color-engine.ts` and adjust imports. (The proposal tool's engine produces a different result shape than ours; coexistence is the safe move.)
   - Existing `src/components/studio/*` (StyleBoardCanvas, PaletteTab, TonesTab, InsightsTab, CatalogPickerTab, StudioBrowser, InspoDropZone) — leave in place. They power `/studio/index` (the old quick-pick admin). The builder is a parallel new surface at `/studio/builder`. Retirement of the old one comes after the new one is proven.
4. Replace `useInventory.ts` with the handoff's local-JSON version.
5. Replace `src/lib/brand.ts` with the eclectichive values.
6. Project-wide replace of React Router DOM imports inside `src/components/proposal/**` only.
7. Mount routes: `src/routes/admin.studio.builder.tsx` (admin-guarded) + a thin `src/components/studio/StudioBuilder.tsx` shell.
8. Visual cleanup pass (handoff §6.2–§6.3). Run the grep at §7. Zero hits required.

### Pass 2 — Backend + AI generation

1. Pull `supabase/migrations/*` from source for `lexicon_page_types`, `lexicon_item_labels`, `lexicon_budget_allocations`, `lexicon_voice_rules`. Apply as a single new migration in eclectichive with proper GRANTs + RLS (admin-only writes, no public reads).
2. Port `supabase/functions/generate-proposal/index.ts` verbatim. Uses Lovable AI Gateway — already configured, no new secret needed.
3. Skip `refresh-lexicon` for now; seed lexicon via the migration's initial inserts.

### Pass 3 — Wire builder output to public deck

1. New table `proposal_decks(id uuid pk, token text unique, owner uuid, meta jsonb, blocks jsonb, sent_at timestamptz)`. Admin write, public read by token only.
2. Builder's "Send" action writes a row + returns the public URL.
3. `studio.$token.tsx` loader: try `proposal_decks` by token first; fall back to `style_boards` (Natasha + any existing). One route serves both shapes via a discriminator.
4. `<ProposalPreview>` (the public deck renderer the source ships) gets the same Pass-0 image-fit treatment so cutouts behave.

### Pass 4 — Migrate Natasha

1. Open Natasha's `style_boards` row in the builder via a one-shot "import legacy board" admin action: maps pinned items → `ProductionPage` blocks, palette swatches → `Palette` block, curator notes → block.note.
2. Curator reviews, edits in builder, hits Send. New `proposal_decks` row replaces. Old `style_boards` row archived (don't delete).

---

## What I need from you before I touch a file

Answer these so Pass 0 ships clean and Pass 1 doesn't get stuck:

1. **Pass 0 right now, yes?** Or do you want me to skip the patch and go straight to the full port (Natasha's deck stays broken for ~a day).
2. **`/studio/builder` admin-gated?** (Recommended yes.) Or open to anyone with the URL during dev?
3. **Lexicon seed data** — port the source project's seed inserts verbatim, or do you have updated voice rules / item labels you want included in the first migration?
4. **Old `/studio/index` quick-pick admin** — keep alongside `/studio/builder` indefinitely, or retire after Pass 4?

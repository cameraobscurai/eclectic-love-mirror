
# /admin/studio — Admin Style Builder

## Premise

Visitors keep `/contact` as is — pin from `/collection`, write a note, submit. Nothing on the public site changes. Staff open `/admin/studio?inquiry=<id>` against an inquiry and use the workspace to build a palette, tone read, style narrative, and a curated piece list to send back to the client. No public exposure of the AI tooling, no abuse vector.

This first cut is **not** wired into the admin nav (per your request). It's reachable only by URL or a contextual "Open in Studio" link from the inbox row.

---

## What we transplant from `Mood Palette AI` — exactly

Three modules, dropped in 1:1 (re-skinned to Eclectic Hive tokens). Everything else from that project (proposal builder, lexicon tables, generate-proposal edge function, PDF export, Firecrawl) is intentionally excluded — that's a separate product.

### 1. `src/lib/color-engine.ts` — verbatim copy

The whole file (~263 lines) drops in unchanged. It's pure client-side, zero deps beyond canvas:

- `samplePixels(img, canvas, n=1500)` — pixel sampling
- `kMeans(pixels, k=8, iters=12)` — k-means++ clustering with `colorDist` Euclidean
- `mergeColors(colors, threshold=35)` — collapses near-duplicates
- `computeTones(colors)` → `ToneAnalysis` (warm/cool/neutral/light/dark/saturated/muted as %)
- `generateInsights(palette, tones)` → `DesignInsight[]` (monochromatic vs analogous vs contrast; warm/cool/balanced; light/moody; saturated/muted; suggested pairing; style direction string like *"terracotta and ochre tones commonly appear in Mediterranean or eclectic interiors"*)
- `analyzeMoodboard(images, canvas)` — orchestrates per-image + combined

Why no changes: it's stateless, no React, no Supabase, no env. The hex-bucket → descriptive-label table inside `generateInsights` (lines 215-227) IS the open-source color-naming system you asked for — no Pantone license needed.

### 2. `src/hooks/use-style-board.ts` — adapted from `useMoodboard.ts`

Source file (74 lines) is ported with three changes:
- IDs become deterministic so we can persist them: inspo uploads use `crypto.randomUUID()` and store the storage path; catalog adds use `inv:${rms_id}`
- Adds `pinFromCatalog(rmsId)` and `unpin(rmsId)` mirroring `addInventoryImage` (lines 16-25 of source)
- Adds `loadFromBoard(board)` / `saveToBoard()` for persistence to `style_boards`

The `analyze()` method (lines 59-71 of source) is reused unchanged — instantiates an offscreen `<canvas>`, calls `analyzeMoodboard`, sets `result`.

### 3. Three presentational components (re-skinned)

`PaletteTab.tsx` (70 lines), `TonesTab.tsx` (65 lines), `InsightsTab.tsx` (26 lines) port over with:
- Tailwind classes swapped: `bg-muted`/`text-muted-foreground` → `bg-charcoal/5`/`text-charcoal/55`, `font-medium` → `font-display`, all labels become `uppercase tracking-[0.22em]`
- Toast import: `from 'sonner'` (already installed in this project, used at root)
- `copyHex` helper inlined (one line: `navigator.clipboard.writeText(hex)`)

The interaction model is preserved: click a swatch in the gradient strip → it expands (`hover:flex-[2]` on `Swatch`); click any chip → toast "Copied #B8A48A".

---

## Architecture

```text
public                                       admin (gated by requireAdminOrRedirect)
──────                                       ─────────────────────────────────────
/collection ──pin──▶ /contact ──submit──▶ inquiries row
                                              │
                                              ▼
                                     /admin/insights  (inquiry list)
                                              │  "Open in Studio" link per row
                                              ▼
                                     /admin/studio?inquiry=<id>
                                     ┌────────────────────────────────────────┐
                                     │ LEFT (col-span-3, sticky top-12)       │
                                     │  Inquiry context                       │
                                     │   · client name + email                │
                                     │   · raw message (whitespace-pre-wrap)  │
                                     │   · pinned snapshots (item_snapshots)  │
                                     │   · "+ pin" pre-loads tile             │
                                     ├────────────────────────────────────────┤
                                     │ CENTER (col-span-6)                    │
                                     │  StyleBoardCanvas                      │
                                     │   · InspoDropZone (≤12, signed URLs)   │
                                     │   · ImageMosaic of inspo + catalog     │
                                     │   · "Analyze palette" button           │
                                     ├────────────────────────────────────────┤
                                     │ RIGHT (col-span-3, sticky)             │
                                     │  Tabs: Palette / Tones / Insights /    │
                                     │        Catalog (search baked catalog)  │
                                     │   + curator notes textarea             │
                                     │   + "Save board" / "Mark ready"        │
                                     └────────────────────────────────────────┘
```

Layout follows the existing `/contact` 5-7 split memory (sticky-fluid-canvas pattern), reframed as 3-6-3 for three useful columns.

---

## Database — one new table, one new bucket

### Migration

```sql
-- New: style_boards anchored to inquiries (soft FK; inquiries.id is uuid)
create table public.style_boards (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null,
  status text not null default 'draft',          -- 'draft' | 'ready' | 'sent'
  inspo_images jsonb not null default '[]'::jsonb,
    -- shape: [{ id: uuid, name: string, storage_path: string, width?: number, height?: number }]
  pinned_rms_ids text[] not null default '{}',
  palette jsonb not null default '[]'::jsonb,    -- ColorInfo[] from color-engine
  tones jsonb not null default '{}'::jsonb,      -- ToneAnalysis
  insights jsonb not null default '[]'::jsonb,   -- DesignInsight[]
  curator_notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index style_boards_inquiry_idx on public.style_boards(inquiry_id);

alter table public.style_boards enable row level security;

create policy "Admins manage style_boards"
  on public.style_boards for all to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));

create trigger update_style_boards_updated_at
  before update on public.style_boards
  for each row execute function public.update_updated_at_column();

-- New private bucket for curator inspo uploads
insert into storage.buckets (id, name, public)
values ('studio-inspo', 'studio-inspo', false)
on conflict (id) do nothing;

create policy "Admins read studio-inspo"
  on storage.objects for select to authenticated
  using (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'));

create policy "Admins write studio-inspo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'));

create policy "Admins delete studio-inspo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'));
```

Storage layout: `studio-inspo/<inquiry_id>/<uuid>.<ext>`. Visitors can never read; staff fetches signed URLs (60-min) for the canvas analyzer.

---

## File plan — new

| File | Source | Notes |
|---|---|---|
| `src/lib/color-engine.ts` | `Mood Palette AI:src/lib/color-engine.ts` | **Verbatim copy.** No changes. |
| `src/hooks/use-style-board.ts` | adapted from `Mood Palette AI:src/hooks/useMoodboard.ts` | adds persistence + `pinFromCatalog`. See "Hook contract" below. |
| `src/routes/admin.studio.tsx` | new | Route shell, query-param decode, three-column layout |
| `src/components/studio/InspoDropZone.tsx` | based on `Mood Palette AI:src/components/moodboard/DropZone.tsx` | Uploads to `studio-inspo`, calls `addInspo({ id, name, storage_path })` instead of holding `URL.createObjectURL` |
| `src/components/studio/StyleBoardCanvas.tsx` | based on `Mood Palette AI:src/components/moodboard/ImageMosaic.tsx` | Drops `MOODBOARD_DRAG_KEY` (no proposal builder). Renders inspo + catalog tiles in one mosaic, distinguished by a tiny "PIN" or "INSPO" pill. |
| `src/components/studio/PaletteTab.tsx` | re-skin of `Mood Palette AI:src/components/moodboard/PaletteTab.tsx` | tokens swapped, Cormorant labels |
| `src/components/studio/TonesTab.tsx` | re-skin of `Mood Palette AI:src/components/moodboard/TonesTab.tsx` | tokens swapped |
| `src/components/studio/InsightsTab.tsx` | re-skin of `Mood Palette AI:src/components/moodboard/InsightsTab.tsx` | tokens swapped |
| `src/components/studio/CatalogPickerTab.tsx` | new | Reuses existing `getCollectionCatalog()` from `@/lib/phase3-catalog`. Search box + 4-col grid + "+ pin" / "remove" toggle. No new DB query. |
| `src/server/studio.functions.ts` | new | `getStudioWorkspace`, `saveStyleBoard`, `signInspoUploadUrl`, `getInspoSignedUrls` (all `requireAdmin` + `supabaseAdmin`) |

## File plan — touched (small)

| File | Change |
|---|---|
| `src/routes/admin.insights.tsx` | Add a small "Open in Studio →" link per inquiry row; opens `/admin/studio?inquiry=<id>` in a new tab. ~6 lines. |
| `src/integrations/supabase/types.ts` | Auto-regenerated by the migration. No manual edit. |

Explicitly **NOT** touched (per your request):
- `src/components/admin/admin-shell.tsx` — no nav entry yet. We'll add it after you've used Studio for real and confirmed where in the sidebar it belongs.

---

## Hook contract — `use-style-board.ts`

Concrete shape so reviewers can read it without opening the file:

```ts
export interface InspoImage {
  id: string;            // uuid
  name: string;
  storage_path: string;  // 'studio-inspo/<inquiry>/<uuid>.jpg'
  signed_url?: string;   // hydrated lazily; engine needs a URL
}

export interface StyleBoardState {
  boardId: string | null;
  inquiryId: string;
  status: 'draft' | 'ready' | 'sent';
  inspo: InspoImage[];
  pinned: string[];                // rms_ids
  palette: ColorInfo[];
  tones: ToneAnalysis | null;
  insights: DesignInsight[];
  curatorNotes: string;
  analyzing: boolean;
  saving: boolean;
  dirty: boolean;
}

export function useStyleBoard(inquiryId: string) {
  // - on mount: getStudioWorkspace({ inquiryId }) → seeds pinned[] from
  //   inquiry.item_snapshots if no board yet, otherwise loads existing board
  // - signInspoUploadUrl({ inquiryId, ext }) → { uploadUrl, storage_path }
  // - addInspoFiles(files) → upload each via signed URL → push to inspo[]
  // - removeInspo(id) / pin(rmsId) / unpin(rmsId) / setNotes(s)
  // - analyze() → reuse useMoodboard.analyze logic exactly:
  //     1. getInspoSignedUrls({ paths }) → fill signed_url
  //     2. concat with catalog images (resolved via getCollectionCatalog)
  //     3. call analyzeMoodboard(combined, canvas)
  //     4. setPalette/setTones/setInsights, mark dirty
  // - save() → saveStyleBoard({ ...state }) — debounced auto-save on dirty
  return { state, addInspoFiles, removeInspo, pin, unpin, setNotes, analyze, save, markReady };
}
```

The `analyze()` pipeline is the load-bearing reuse: same canvas, same `analyzeMoodboard` call, same result object. The difference is just the URL source (signed for inspo, public Squarespace mirror for catalog).

---

## Server functions — `src/server/studio.functions.ts`

All four use the existing `requireAdmin` middleware + `supabaseAdmin` (same pattern as `admin.functions.ts`):

```ts
// getStudioWorkspace({ inquiryId })
//   returns { inquiry: {id,name,email,message,item_snapshots,metadata},
//             board: StyleBoardRow | null }

// signInspoUploadUrl({ inquiryId, ext })
//   path = `${inquiryId}/${crypto.randomUUID()}.${ext}`
//   uploadUrl = supabaseAdmin.storage.from('studio-inspo').createSignedUploadUrl(path)
//   returns { uploadUrl, storage_path: path }

// getInspoSignedUrls({ paths: string[] })
//   returns { [path]: signedUrl } — 1h expiry, used by the analyzer

// saveStyleBoard({ inquiryId, boardId?, status, inspo, pinned, palette, tones, insights, curatorNotes })
//   if boardId: update; else insert. Sets created_by from context.userId on insert.
//   returns the row.
```

No edge functions, no Lovable AI Gateway calls in v1. Pure data + storage.

---

## Workflow on the page (concrete)

1. Curator clicks "Open in Studio" on an inquiry row in `/admin/insights` (or pastes the URL).
2. Route `beforeLoad` runs `requireAdminOrRedirect` (existing).
3. `useStyleBoard(inquiryId)` fires `getStudioWorkspace`. If no board exists, it seeds `pinned[]` from `inquiry.item_snapshots` (the array we just added on the contact form).
4. Left rail renders the inquiry context. Pinned tiles show using the existing baked catalog data — no new lookups.
5. Curator drags 3-12 inspiration images into `InspoDropZone`. Each upload:
   - calls `signInspoUploadUrl` → gets signed URL
   - PUTs the file directly to storage
   - appends to `state.inspo`
6. Curator clicks "Analyze palette". Hook fetches signed URLs, runs the engine, fills the three right-rail tabs.
7. Curator can swap to **Catalog** tab, search ("brass candle"), and `+ pin` more pieces. Each pin appears in the center mosaic with an "INV" pill.
8. Curator types notes, hits **Save** (or autosave fires on debounce).
9. **Mark ready** flips status to `'ready'` — visible on the inbox row as a small dot.
10. (Out of scope for v1) Send-to-client share link.

---

## Re-skin spec (so the components actually look like Eclectic Hive)

| Mood Palette token | Eclectic Hive replacement |
|---|---|
| `bg-background` | `bg-cream` |
| `bg-muted` | `bg-charcoal/5` |
| `text-foreground` | `text-charcoal` |
| `text-muted-foreground` | `text-charcoal/55` |
| `border-border` | `border-charcoal/10` (or `border-[var(--archive-rule)]`) |
| `font-medium` headings | `font-display uppercase tracking-[0.22em]` |
| `tracking-wider` labels | `tracking-[0.24em]` |
| Default toast | `sonner` (already mounted in `__root.tsx`) |

ALL CAPS rule applies to every label; only client name + their raw message + product titles stay mixed case.

---

## Order of work

1. **Migration**: `style_boards` + `studio-inspo` bucket + RLS (one tool call)
2. **`color-engine.ts`** verbatim copy from Mood Palette AI
3. **`server/studio.functions.ts`** + `use-style-board.ts`
4. **Route + components**: `admin.studio.tsx`, `InspoDropZone`, `StyleBoardCanvas`, the three tabs, `CatalogPickerTab`
5. **Insights link**: tiny "Open in Studio →" affordance on each inquiry row in `admin.insights.tsx`
6. **Smoke test on preview**: open against a real inquiry that has pinned items, upload 4-5 inspo shots, run Analyze, verify palette + tones + insights render with the right tokens, save, reload, confirm persistence

---

## Deliberately deferred (so v1 ships clean)

- Sidebar nav entry (you said no)
- AI-generated style narrative paragraph (Lovable AI Gateway pass over palette+tones+pinned → editable draft) — clean swap point in `InsightsTab`
- Public read-only share link `/studio/share/<token>` for client review
- PDF export
- Real Pantone TPG/TPX matching — leave `generateInsights`'s hue-bucket labeler as the swap point
- The full Mood Palette proposal builder (production-pages, lexicon, deck export) — separate route, separate scope

---

## Open confirmations (will default to these unless you say otherwise)

- Bucket name: `studio-inspo` (private). If you'd rather nest under existing `editorial`, say so.
- Auto-seed pinned tiles from `inquiry.item_snapshots` on first open: **yes** by default.
- Autosave on debounce (1.5s after last change): **yes** by default — explicit Save button still present for clarity.

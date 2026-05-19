
# Studio — Client-Facing Build Plan

## Stack in play (already in the repo, nothing new to install)

| Layer | Tool | Where it lives |
|---|---|---|
| Routing | TanStack Router (file-based) | `src/routes/studio.*.tsx` |
| Server logic | `createServerFn` (TanStack Start) | `src/server/*.functions.ts` |
| DB / Auth / Storage | Supabase via Lovable Cloud | `src/integrations/supabase/*` |
| Forms + validation | `react-hook-form` + `zod` | already used in `/contact` |
| UI | shadcn/ui + Tailwind v4 tokens | `src/components/ui/*`, `src/styles.css` |
| Color extraction | `src/lib/color-engine.ts` (custom, exists) | already powers `/admin/colors` |
| Catalog read | `src/data/inventory/current_catalog.json` | baked, has `color_tags` |
| 3D | `@google/model-viewer` + GLB in `3dfiles` bucket | `studio.three.tsx`, `studio.lab.tsx` |
| Inquiry storage | `public.inquiries` table | feeds `/admin/insights` + `/admin/studio` |

## Route map (final shape)

```text
/studio              → public, the actual product. Form + palette + match.
/studio/lab          → public, 3D pieces marquee (already works)
/studio/three        → public, full 3D viewer (already works)
/studio/thanks       → public, post-submit confirmation (exists)
/studio/$token       → public, view a saved brief by share token
/admin/studio        → admin only, internal style builder anchored to inquiry
```

`/studio/index.tsx` becomes the client product. The 3D nav band stays at the top as discovery.

## The /studio workflow (one page, three steps stacked)

```text
┌─ HERO ────────────────────────────────────────┐
│  "Start your style brief"                     │
│  (3D Viewer · Lab links in top utility bar)   │
├─ STEP 1 · INSPIRATION ────────────────────────┤
│  Drop 1–8 images → upload to studio-inspo     │
│  bucket (anonymous, prefixed by session uuid) │
├─ STEP 2 · PALETTE (auto) ─────────────────────┤
│  Client-side color extraction via             │
│  color-engine.ts → 5 swatches + tone words    │
│  Editable: rename palette, remove a swatch    │
├─ STEP 3 · PIECES (auto) ──────────────────────┤
│  Query current_catalog.json in-memory:        │
│  products whose color_tags intersect palette  │
│  → 6–12 tiles, click to pin (max 8)           │
├─ STEP 4 · DETAILS + SEND ─────────────────────┤
│  Name · Email · Event date · Location ·       │
│  Budget band · Notes                          │
│  Submit → createServerFn → inquiries row +    │
│  studio_briefs row → redirect /studio/thanks  │
│  Bonus: share-token URL emailed back          │
└───────────────────────────────────────────────┘
```

## Data model (one new table, reuses inquiries)

```sql
-- new table only
create table public.studio_briefs (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete cascade,
  share_token text unique not null default encode(gen_random_bytes(12),'base64url'),
  palette jsonb not null,            -- [{hex,name?}]
  inspo_paths text[] not null default '{}',  -- studio-inspo bucket keys
  pinned_rms_ids text[] not null default '{}',
  client_notes text,
  created_at timestamptz default now()
);
alter table public.studio_briefs enable row level security;

-- public can INSERT (anonymous brief) but not read others
create policy "anyone can submit a brief"
  on public.studio_briefs for insert to anon, authenticated with check (true);

-- public read only by share_token (handled in server fn, not RLS)
-- admins read all via has_role(auth.uid(),'admin')
create policy "admins read all briefs"
  on public.studio_briefs for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
```

Storage: `studio-inspo` bucket already exists (private). Add a public-insert + admin-read policy. Reads from client side use signed URLs returned by the server fn.

## Server functions (new file: `src/server/studio-brief.functions.ts`)

```text
submitStudioBrief({ inquiry, palette, inspoPaths, pinned, notes })
  → validates with zod
  → inserts inquiries row (source: 'studio')
  → inserts studio_briefs row
  → returns { shareToken }

uploadInspoImage(formData) [admin-middleware not required]
  → rate-limited per IP, max 8 files per session
  → writes to studio-inspo/<sessionId>/<uuid>.jpg
  → returns { path, signedUrl }

getBriefByToken({ token })
  → reads studio_briefs by share_token
  → returns palette + signed inspo URLs + hydrated pinned products
```

## Security + abuse guard rails

- Zod on every input: name ≤100, email RFC, message ≤2000, palette = 3–8 hex `/^#[0-9a-f]{6}$/i`, max 8 images, max 8 pins.
- Upload server fn enforces MIME `image/*`, size ≤8MB, count ≤8 per IP/hour (in-memory bucket; good enough for v1).
- No service-role key on client; uploads go through server fn so we control bucket path.
- `/studio/$token` is public by design — token is the secret. 96 bits of entropy.
- Honeypot field on the submit form. Submission requires palette OR pins (blocks empty-spam).

## Client-side palette extraction

Use existing `src/lib/color-engine.ts` (already powers admin tagging). Run in the browser on uploaded image blobs, never re-extract on server. Show a skeleton while the worker pass runs. Cache result on the file blob hash so re-renders don't recompute.

## Catalog match (zero new infra)

```text
const palettePool = new Set(palette.map(toClosestNamedTone))
products
  .filter(p => p.color_tags?.some(t => palettePool.has(t)))
  .sort(by overlap count desc)
  .slice(0, 12)
```

All client-side. Catalog is already imported via `current_catalog.json`. No DB round-trip.

## Best practices we are NOT going to violate

1. **Caps everywhere.** Brand voice. Headings, labels, buttons. Only product names from catalog stay mixed case. (Project memory rule.)
2. **Design tokens only.** `bg-cream`, `text-charcoal`, `border-charcoal/15`. No raw hex in JSX. (`src/styles.css`.)
3. **Server fns, not edge functions.** Per stack rule. Read `process.env.LOVABLE_API_KEY` inside `.handler()` only if we add AI later.
4. **`/contact` stays the convert page.** Studio is a separate funnel that produces inquiries with `source='studio'` so they sort distinctly in `/admin/insights`.
5. **No nav surgery yet.** Add Studio link to footer first. Promote to main nav only after we see real submissions.
6. **No FAQ on /studio.** Single FAQ remains on `/atelier#working-with-the-hive`.
7. **Bake before publish.** Catalog match relies on `current_catalog.json` — if we change taxonomy we re-run `scripts/bake-catalog.mjs` first.
8. **No new deps.** `react-hook-form`, `zod`, `color-engine`, shadcn — all already in the tree.

## Build order (smallest shippable slice first)

```text
1. Migration: studio_briefs table + RLS + studio-inspo bucket policy
2. Server fn: submitStudioBrief + uploadInspoImage
3. /studio rewrite: form skeleton (name/email/details only) → submit works end-to-end
4. Add inspiration uploader (reuse InspoDropZone component)
5. Wire palette extraction via color-engine
6. Wire catalog match grid with pin toggle
7. /studio/$token read-only view of the saved brief
8. Footer link → /studio. Email confirmation (post-MVP).
```

Each step is independently deployable. Each step is reviewable before the next. We do not batch.

## Out of scope for v1 (call out so we don't drift)

- AI-generated mood board summaries
- AR / "place in room" on `/studio/lab`
- Multi-collaborator briefs
- Pricing engine / quote calculator
- Email delivery of the share-token (next iteration; needs custom domain wiring)

---

Approve and I start with step 1: the migration.

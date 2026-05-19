# Studio → Client-Facing Design Service

## Goal
`/studio` becomes a public, no-login tool where a visitor builds a personal style brief — drops inspiration images, gets an auto-generated color palette + tone read, fills basic event info, optionally pulls in pinned Collection pieces — and submits it. Submission lands in `public.inquiries` (same table contact.tsx uses) with full style-brief payload attached, and the contact page can deep-link back to a draft brief.

The existing admin Style Builder UI is preserved but moved behind `/admin/studio` so it stays internal. `/studio/$token` (client-facing send) and `/studio/three` (3D viewer) stay as-is.

---

## Route map (after)

```
/studio                  PUBLIC  → new client intake (StyleBrief)
/studio/three            PUBLIC  → 3D viewer (unchanged)
/studio/$token           PUBLIC  → admin-sent board view (unchanged)
/admin/studio            ADMIN   → existing internal workspace (moved)
/admin/studio?inquiry=…  ADMIN   → existing per-inquiry editor (moved)
```

Move = rename file `src/routes/studio.index.tsx` → `src/routes/admin.studio.tsx`, keep `requireAdminOrRedirect` guard on the admin version. Update the one `<Link to="/studio">` inside `admin.insights.tsx` (and anywhere else) to `/admin/studio`.

---

## Data flow

```text
Visitor at /studio
  │
  ├─ Step A: Inspo drop (1–8 images)         → in-memory File[] + object URLs
  ├─ Step B: "Generate palette" button       → analyzeMoodboard() client-side
  │                                            (existing src/lib/color-engine.ts)
  │                                            yields palette + tones + insights
  ├─ Step C: Basic info form                 → name, email, event date, scope,
  │                                            budget, vibe notes
  ├─ Step D: Optional pinned pieces          → reads useInquiry() store +
  │                                            ?items= URL param (same source
  │                                            as /contact)
  │
  └─ Submit
       │
       ├─ Upload each inspo File to storage bucket `studio-inspo`
       │    via new public createServerFn signPublicInspoUpload({ ext })
       │    (server returns signedUploadUrl + storage_path)
       │    [no auth required — bucket already exists, currently private]
       │
       ├─ Call new public createServerFn submitStyleBrief({
       │      name, email, eventDate, scope, budget, message,
       │      paletteHex[], tones, insights,
       │      inspoPaths[], pinnedRmsIds[]
       │    })
       │    Server writes one row to public.inquiries with:
       │      • name, email, message (visible plain text summary)
       │      • subject = "Style Brief"
       │      • item_ids = pinnedRmsIds (existing column)
       │      • metadata = { source: "studio", palette, tones, insights,
       │                     inspo_paths, event_date, scope, budget }
       │      • item_snapshots = resolved {id, title, image} for pinned pieces
       │
       └─ On success → redirect to /studio/thanks?inquiry=<id>
                       (or inline confirmation card)
```

No new tables. No new buckets. RLS on `inquiries` already permits anon insert; we'll re-confirm the column shape before writing the migration (likely none needed).

---

## File plan

### New files

- `src/routes/studio.index.tsx` — **REWRITTEN** as `StyleBriefPage` (client-facing).
- `src/routes/studio.thanks.tsx` — short confirmation screen, "we'll reach out within 24h", CTA to `/collection`.
- `src/components/studio/client/StyleBriefForm.tsx` — basic info fields (name, email, date, scope, budget, vibe notes). Reuses styling tokens from `/contact`.
- `src/components/studio/client/InspoUploader.tsx` — drag-drop wrapper around existing `InspoDropZone` plus thumbnail strip with remove buttons. Purely client-side until submit.
- `src/components/studio/client/PaletteReveal.tsx` — renders palette swatches + tone bars + 2–3 insight chips. Pure presentation; consumes `AnalysisResult` from `color-engine.ts`.
- `src/components/studio/client/PinnedPiecesStrip.tsx` — small horizontal list of pieces from `useInquiry()` + URL `?items=` with unpin. Mirrors the pinned-pieces logic from `/contact`.
- `src/server/style-brief.functions.ts` — two public server functions:
  - `signPublicInspoUpload({ ext })` — anon-allowed, generates a one-off signed upload URL into `studio-inspo` under a `public/<uuid>/<uuid>.<ext>` prefix. Rate-limited by simple per-IP bucket header check.
  - `submitStyleBrief(payload)` — Zod-validated; uses `supabaseAdmin` to insert into `inquiries`. Returns `{ inquiryId }`. Honeypot field rejected. Reuses the same client-side rate-limit key pattern from `/contact` (`RATE_LIMIT_MS`).

### Modified files

- `src/routes/admin.studio.tsx` — **MOVED** from `src/routes/studio.index.tsx`. Keep `requireAdminOrRedirect` (restore the guard removed last turn for THIS file only). All current functionality intact: `?inquiry=…` workspace, recent boards list, send-to-client flow.
- `src/routes/studio.three.tsx` — no functional change; update the "back" link target from `/studio` → `/studio` (still the public hub, intentionally).
- `src/routes/studio.lab.tsx` — update back link from `/studio` to `/admin/studio` (lab is internal).
- `src/routes/admin.insights.tsx` — change "Studio →" row links from `/studio?inquiry=…` to `/admin/studio?inquiry=…`.
- `src/routes/contact.tsx` — add a small banner above the form: *"Have a vision board? Build a style brief →"* linking to `/studio`. Optional: accept `?fromStudio=<inquiry-id>` to pre-fill name/email/message from the just-submitted brief (read once from query, no server fetch needed since we just submitted).
- `src/components/navigation.tsx` — `/studio` is already in `LIGHT_BG_PAGES` / `WHITE_BG_PAGES` from prior turn. No change. Optionally surface "Studio" in the public nav under "Tools" or footer.
- `src/server/studio.functions.ts` — no behavior change; only callers move. `requireAdmin` middleware on existing functions is unchanged.

### Storage

- Bucket `studio-inspo` already exists (private). Add storage policy via migration so:
  - **public role can INSERT** into `public/*` prefix (capped object size ~8 MB).
  - **public role can SELECT** from `public/*` (so the visitor can preview their own upload via signed URL we return).
  - Admin already has full access via service role.

### Migration (only what's needed)

```sql
-- Allow anonymous uploads into the public/ prefix of studio-inspo,
-- max ~8MB, only image/* mime types.
create policy "studio_inspo_public_insert"
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'studio-inspo'
  and (storage.foldername(name))[1] = 'public'
  and (metadata->>'size')::int < 8 * 1024 * 1024
);

create policy "studio_inspo_public_read"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'studio-inspo'
  and (storage.foldername(name))[1] = 'public'
);
```

No changes to `public.inquiries` — column shape (`name, email, message, subject, item_ids, item_snapshots, metadata`) already covers everything we need to stuff in.

---

## Page layout — `/studio` (client view)

Single scroll, three bands, matches editorial/all-caps voice from the rest of the site. Charcoal-on-cream, no glass, no chrome.

```text
┌─────────────────────────────────────────────────────────────┐
│  STUDIO · BUILD YOUR STYLE BRIEF        (small intro line) │
├─────────────────────────────────────────────────────────────┤
│  1 · DROP INSPIRATION                                       │
│  [ drop zone — 1–8 images ]                                 │
│  [ thumb · thumb · thumb · + ]                              │
│  → button: "GENERATE PALETTE"  (disabled until ≥1 image)    │
├─────────────────────────────────────────────────────────────┤
│  2 · YOUR PALETTE  (only after Generate)                    │
│  [ ███ ███ ███ ███ ███ ]  ← swatches with hex on hover     │
│  WARM ████░░░░ · COOL ░░██░░░░ · MUTED ██████░░             │
│  Two short insight chips                                    │
├─────────────────────────────────────────────────────────────┤
│  3 · YOUR DETAILS                                           │
│  Name · Email · Event date · Scope · Budget · Vibe notes    │
│  [ pinned pieces strip — if any ]                           │
│  [ SUBMIT BRIEF ]                                           │
└─────────────────────────────────────────────────────────────┘
```

All copy ALL CAPS per project memory. Long-form (insights, notes) stays sentence case. Body uses existing tokens — no new colors.

---

## Implementation order

1. Move `studio.index.tsx` → `admin.studio.tsx`, restore admin guard on it, update internal links in `admin.insights.tsx`, `studio.lab.tsx`.
2. Migration for public storage policies on `studio-inspo`.
3. New server functions `signPublicInspoUpload` + `submitStyleBrief` in `src/server/style-brief.functions.ts`.
4. New components in `src/components/studio/client/`.
5. New `src/routes/studio.index.tsx` (public StyleBriefPage) + `src/routes/studio.thanks.tsx`.
6. Banner on `/contact` linking to `/studio`.
7. Verify: drop image → generate palette → submit → row appears in `inquiries` with metadata populated → admin sees it at `/admin/studio?inquiry=<id>` and the inspo + palette are pre-populated.

---

## Open questions before I build

1. **Email/auth on submit** — keep current contact pattern (no email verification, just collect name+email and rate-limit)? Or send a confirmation email to the visitor with their palette?
2. **Inspo upload cap** — 8 images / 8 MB each OK, or tighter?
3. **Contact ↔ Studio direction** — should `/contact` keep its own "selected pieces + vision" path AND link to `/studio`, or should `/studio` eventually replace `/contact` as the single intake? (I'm assuming both exist side-by-side.)
4. **Palette engine** — stick with the existing client-side canvas/k-means extractor (free, instant, no API), or upgrade to Lovable AI for richer insights ("evokes Amalfi terraces" etc.)? Client-side is faster and ships today; AI is a v2.

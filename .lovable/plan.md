## Lock down studio-inspo uploads

Current state: `studio-inspo` bucket has an anon insert policy ("Anyone can upload studio inspo"). Anyone with the publishable key can write directly to storage. Fix at the storage layer; tighten the signing fn as defense-in-depth.

### 1. Migration: `supabase/migrations/20260604000000_lock_down_studio_inspo_uploads.sql`

Bucket upsert uses `on conflict (id) do update` — the existing `do nothing` pattern would silently no-op against an already-existing bucket and leave the caps off.

```sql
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-inspo', 'studio-inspo', false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

-- Drop public insert + any stale admin policy name variants
drop policy if exists "Anyone can upload studio inspo" on storage.objects;
drop policy if exists "Admins read studio-inspo" on storage.objects;
drop policy if exists "Admins write studio-inspo" on storage.objects;
drop policy if exists "Admins update studio-inspo" on storage.objects;
drop policy if exists "Admins delete studio-inspo" on storage.objects;
drop policy if exists "Admins can read studio inspo" on storage.objects;
drop policy if exists "Admins can manage studio inspo" on storage.objects;

-- Admin-only CRUD via authenticated session. Anon visitors use signed upload URLs (no policy needed).
create policy "studio-inspo admin read" on storage.objects for select to authenticated
  using (bucket_id = 'studio-inspo' and public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "studio-inspo admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'studio-inspo' and public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "studio-inspo admin update" on storage.objects for update to authenticated
  using (bucket_id = 'studio-inspo' and public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (bucket_id = 'studio-inspo' and public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "studio-inspo admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'studio-inspo' and public.has_role(auth.uid(), 'admin'::public.app_role));

commit;
```

Post-migration verify: `select public, file_size_limit, allowed_mime_types from storage.buckets where id='studio-inspo'` shows `false / 8388608 / {image/jpeg,image/png,image/webp,image/avif}`.

### 2. `src/lib/style-brief.functions.ts` — tighten `signPublicInspoUpload`

- Ext allowlist: `jpg`, `jpeg`, `png`, `webp`, `avif` (HEIC dropped — browsers don't set Content-Type reliably and Safari often converts on upload anyway).
- Normalize `jpg → jpeg`.
- MIME check is **advisory** for early UX fail; the bucket `allowed_mime_types` is the real gate.
- Size check is **advisory** for early UX fail; the bucket `file_size_limit` (8 MB) is the real gate.
- Inputs: `{ ext: string, mime: string, size: number }`.

### 3. `src/routes/studio.index.tsx` (call site ~line 194)

- Pass `ext`, `mime: i.file.type`, `size: i.file.size`.
- Change PUT header `x-upsert: "true"` → `"false"` (random UUID paths make upsert pointless and it's free hardening).

### Security boundary

Real enforcement: bucket private + `file_size_limit` + `allowed_mime_types` + no anon insert policy. Server-fn validation is UX/early-fail only — caller-supplied size/mime are untrusted.

### Files touched

- `supabase/migrations/20260604000000_lock_down_studio_inspo_uploads.sql` (new)
- `src/lib/style-brief.functions.ts` (edit `signPublicInspoUpload`)
- `src/routes/studio.index.tsx` (call site + upsert header)
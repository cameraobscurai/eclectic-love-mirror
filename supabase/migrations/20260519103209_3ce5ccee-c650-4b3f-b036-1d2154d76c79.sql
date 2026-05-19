
-- 1. Add source column to inquiries so we can tell studio briefs apart
alter table public.inquiries
  add column if not exists source text not null default 'contact';

create index if not exists inquiries_source_idx on public.inquiries(source);

-- 2. New table: studio_briefs
create table if not exists public.studio_briefs (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  share_token text unique not null default encode(gen_random_bytes(12), 'base64'),
  palette jsonb not null default '[]'::jsonb,
  inspo_paths text[] not null default '{}',
  pinned_rms_ids text[] not null default '{}',
  client_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_briefs_inquiry_idx on public.studio_briefs(inquiry_id);
create index if not exists studio_briefs_token_idx on public.studio_briefs(share_token);

alter table public.studio_briefs enable row level security;

-- Anyone can insert a brief (the matching inquiry insert is already gated by the inquiries RLS validators)
drop policy if exists "Anyone can submit a studio brief" on public.studio_briefs;
create policy "Anyone can submit a studio brief"
  on public.studio_briefs
  for insert
  to anon, authenticated
  with check (
    cardinality(inspo_paths) <= 12
    and cardinality(pinned_rms_ids) <= 12
    and octet_length(palette::text) < 4000
    and (client_notes is null or length(client_notes) <= 4000)
  );

-- Admins can read/update/delete
drop policy if exists "Admins can view studio briefs" on public.studio_briefs;
create policy "Admins can view studio briefs"
  on public.studio_briefs for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can update studio briefs" on public.studio_briefs;
create policy "Admins can update studio briefs"
  on public.studio_briefs for update to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can delete studio briefs" on public.studio_briefs;
create policy "Admins can delete studio briefs"
  on public.studio_briefs for delete to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
drop trigger if exists studio_briefs_set_updated_at on public.studio_briefs;
create trigger studio_briefs_set_updated_at
  before update on public.studio_briefs
  for each row execute function public.update_updated_at_column();

-- 3. Storage policies for studio-inspo bucket (bucket already exists, private)
-- Allow anonymous uploads (server fn enforces size/type/count); admins can read.

drop policy if exists "Anyone can upload studio inspo" on storage.objects;
create policy "Anyone can upload studio inspo"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'studio-inspo');

drop policy if exists "Admins can read studio inspo" on storage.objects;
create policy "Admins can read studio inspo"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'studio-inspo' and has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can manage studio inspo" on storage.objects;
create policy "Admins can manage studio inspo"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'studio-inspo' and has_role(auth.uid(), 'admin'::app_role));

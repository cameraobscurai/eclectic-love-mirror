
create table public.style_boards (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null,
  status text not null default 'draft',
  inspo_images jsonb not null default '[]'::jsonb,
  pinned_rms_ids text[] not null default '{}',
  palette jsonb not null default '[]'::jsonb,
  tones jsonb not null default '{}'::jsonb,
  insights jsonb not null default '[]'::jsonb,
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

insert into storage.buckets (id, name, public)
values ('studio-inspo', 'studio-inspo', false)
on conflict (id) do nothing;

create policy "Admins read studio-inspo"
  on storage.objects for select to authenticated
  using (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'));

create policy "Admins write studio-inspo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'));

create policy "Admins update studio-inspo"
  on storage.objects for update to authenticated
  using (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'))
  with check (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'));

create policy "Admins delete studio-inspo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'studio-inspo' and has_role(auth.uid(),'admin'));

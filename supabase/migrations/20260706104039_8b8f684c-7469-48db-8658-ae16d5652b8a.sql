-- BACK OF HOUSE — snapshots + refresh lock.
-- Both tables have RLS enabled with ZERO policies: service-role only.

create table if not exists public.boh_tile_snapshots (
  route_slug   text primary key,
  status       text not null default 'empty'
               check (status in ('empty', 'pending', 'fresh', 'failed')),
  storage_path text,
  updated_at   timestamptz
);
grant all on public.boh_tile_snapshots to service_role;
alter table public.boh_tile_snapshots enable row level security;

create table if not exists public.boh_refresh_runs (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running'
              check (status in ('running', 'done', 'failed'))
);
create index if not exists boh_refresh_runs_started_idx
  on public.boh_refresh_runs (started_at desc);
grant all on public.boh_refresh_runs to service_role;
alter table public.boh_refresh_runs enable row level security;
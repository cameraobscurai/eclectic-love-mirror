create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  entity text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index admin_audit_log_entity_idx on public.admin_audit_log (entity, entity_id, at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id, at desc);

alter table public.admin_audit_log enable row level security;

create policy "admins read audit"
  on public.admin_audit_log
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'));
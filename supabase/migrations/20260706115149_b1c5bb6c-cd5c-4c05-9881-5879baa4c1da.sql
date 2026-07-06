create extension if not exists pg_trgm;
create index if not exists inventory_items_title_trgm_idx
  on public.inventory_items
  using gin (title gin_trgm_ops);
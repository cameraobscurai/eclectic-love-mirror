-- The app already appends its own cache-busting version to image URLs, so the
-- manual ?v=n1 tag is redundant. Strip it back out to keep stored URLs clean.
update public.inventory_items
set images = (
  select array_agg(replace(img, '?v=n1', '') order by ord)
  from unnest(images) with ordinality as t(img, ord)
)
where exists (select 1 from unnest(images) x where x like '%?v=n1');
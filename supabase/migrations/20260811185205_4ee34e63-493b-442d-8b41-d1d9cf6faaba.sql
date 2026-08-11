-- Cache-bust the 8 normalized lounge covers so the trimmed file is served
-- immediately instead of waiting out the CDN TTL. Same object, versioned URL,
-- so the admin editor and the public site keep reading one identical image.
update public.inventory_items
set images = (
  select array_agg(
    case
      when img like '%/squarespace-mirror/seating/jessie-cow-hide-ottoman/01-JESSE_Ottoman_0.png'
        or img like '%/squarespace-mirror/inventory/127/7b0cadbed4dc0e50.png'
        or img like '%/squarespace-mirror/inventory/749/3644c050d94e5caf.png'
        or img like '%/squarespace-mirror/inventory/161/e7a934ea7a9f8e1b.png'
        or img like '%/squarespace-mirror/inventory/1799/b48ec8f49a4ca910.png'
        or img like '%/squarespace-mirror/inventory/3462/7e8a37c0eb7b9ba4.png'
        or img like '%/squarespace-mirror/lounge/phillipe/01-PHILLIPE_Loveseat_0.png'
        or img like '%/incoming-photos/seating/ottoman/LORENZO%2520Ottoman.png'
      then img || '?v=n1'
      else img
    end
    order by ord
  )
  from unnest(images) with ordinality as t(img, ord)
)
where slug in (
  'jessie-cow-hide-ottoman-675',
  'joseph-goat-hide-ottoman-127',
  'lorenzo-ivory-round-hide-ottoman-3015',
  'omar-brown-leather-ottoman-749',
  'axel-bar-stool-161',
  'mara-hunter-leather-chair-1799',
  'cosette-sage-velvet-loveseat-3462',
  'phillipe-grey-silk-loveseat-34'
);
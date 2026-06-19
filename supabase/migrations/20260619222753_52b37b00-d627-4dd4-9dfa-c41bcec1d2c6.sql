
UPDATE public.inventory_items SET status='draft' WHERE id IN ('2f2c0386-9802-429e-81a0-2d7780d840ae','c290dbf4-ef04-467e-8221-1ac34a5275e2');

UPDATE public.inventory_items
SET images = ARRAY['https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/squarespace-mirror/owner-uploads/vespa-dark-wood-shelf-1929-2026-06-19.png']
             || array(select unnest(images) except select 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/squarespace-mirror/owner-uploads/vespa-dark-wood-shelf-1929-2026-06-19.png')
WHERE id = '17b9c4a4-5733-4ee9-8047-981a0dbdd1b6';

UPDATE public.inventory_items
SET images = ARRAY[
  'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/squarespace-mirror/lounge/lagos-swivel-chair/02-LAGOS_1.png',
  'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/squarespace-mirror/lounge/lagos-swivel-chair/01-LAGOS_0.png'
],
updated_at = now()
WHERE rms_id = '4161';
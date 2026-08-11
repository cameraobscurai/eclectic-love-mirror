update public.inventory_items
set images = ARRAY[
  'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/missing-gaps/INGRAM%20Sofa%201.png',
  'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/missing-gaps/INGRAM%20Sofa%200.png',
  'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/missing-gaps/INGRAM%20Sofa%202.png',
  'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/missing-gaps/INGRAM%20Sofa%203.png'
]
where id = '9b2cb720-ab0e-4311-88bd-c9fdc38f8be3';
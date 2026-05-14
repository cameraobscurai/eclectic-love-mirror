UPDATE public.inventory_items
SET images = array_remove(images, 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/TABLEWEAR/MIDAS VIDAL Butter Knife.png')
WHERE rms_id IN ('2935','2936','2937');
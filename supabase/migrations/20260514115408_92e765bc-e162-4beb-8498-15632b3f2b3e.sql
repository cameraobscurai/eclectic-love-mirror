UPDATE inventory_items
SET images = ARRAY[images[1], 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/sageglassware/sage-cover-2026-05-14.png']
WHERE rms_id IN ('2949','2950','2951','2952','3460');
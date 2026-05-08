UPDATE public.inventory_items
SET public_ready = false,
    hidden_note = COALESCE(hidden_note, '') || CASE WHEN hidden_note IS NULL OR hidden_note = '' THEN '' ELSE ' | ' END || 'hidden 2026-05-08 pre-launch (owner request)'
WHERE rms_id = '2894';
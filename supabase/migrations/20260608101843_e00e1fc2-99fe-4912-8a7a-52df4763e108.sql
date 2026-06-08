alter table public.style_boards
  add column if not exists cover_pinned_rms_id text;

update public.style_boards
set
  cover_pinned_rms_id = '3878',
  palette = jsonb_build_array(
    jsonb_build_object('hex', '#3a4d2e', 'name', 'Moss'),
    jsonb_build_object('hex', '#9aa580', 'name', 'Sage'),
    jsonb_build_object('hex', '#6b4226', 'name', 'Chestnut'),
    jsonb_build_object('hex', '#b06a3b', 'name', 'Terracotta'),
    jsonb_build_object('hex', '#efe4d2', 'name', 'Cream'),
    jsonb_build_object('hex', '#8a6f3e', 'name', 'Bronze'),
    jsonb_build_object('hex', '#1a1a1a', 'name', 'Char')
  ),
  pin_notes = jsonb_build_object(
    '4018', 'Group in odd clusters of 3 and 5 — do not line up.',
    '4015', 'Anchor of the still-life — set centerpiece, single bloom.',
    '4024', 'Pair with Tirzah at the table heads.',
    '4027', 'Use as the negative-space piece — leave empty.',
    '4025', 'Texture against Alumina plates — varies hand-to-hand.',
    '4023', 'Hero vessel — single dramatic branch only.',
    '4016', 'The asymmetry sets the rhythm — off-axis from Ahsta.',
    '2936', 'The only metal in the room — keep glassware clear or smoked.',
    '707',  'Floor anchor — runs the length of the table.',
    '3878', 'Sutton holds the room together — keep nothing else within 3 feet.'
  )
where share_token = 'natasha-aug2026-garden';
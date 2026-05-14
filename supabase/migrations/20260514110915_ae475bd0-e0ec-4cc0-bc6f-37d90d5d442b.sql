
-- Set photo URL constants
WITH photos AS (
  SELECT
    'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/midas/ChatGPT%20Image%20May%2014%2C%202026%2C%2005_01_41%20AM.png'::text AS set_img,
    'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/midas/ChatGPT%20Image%20May%2014%2C%202026%2C%2005_01_44%20AM%20%281%29.png'::text AS fork_img,
    'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/midas/ChatGPT%20Image%20May%2014%2C%202026%2C%2005_01_45%20AM%20%282%29.png'::text AS dinner_knife_img,
    'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/midas/ChatGPT%20Image%20May%2014%2C%202026%2C%2005_01_45%20AM%20%283%29.png'::text AS spoon_img,
    'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/midas/ChatGPT%20Image%20May%2014%2C%202026%2C%2005_01_45%20AM%20%284%29.png'::text AS tea_spoon_img,
    'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/midas/ChatGPT%20Image%20May%2014%2C%202026%2C%2005_01_45%20AM%20%285%29.png'::text AS dessert_knife_img,
    'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/midas/ChatGPT%20Image%20May%2014%2C%202026%2C%2005_01_46%20AM%20%286%29.png'::text AS butter_knife_img
)
UPDATE inventory_items i SET images = ARRAY[v.own, p.set_img]
FROM photos p, (VALUES
  ('32ad2bd2-375b-4aee-85db-149a82c2359f'::uuid, (SELECT fork_img FROM photos)),
  ('9f9067a4-150d-4603-a763-04fd9bab84de'::uuid, (SELECT dinner_knife_img FROM photos)),
  ('d8271564-92f9-4da6-b8fe-b7828bb4d148'::uuid, (SELECT spoon_img FROM photos)),
  ('4ad61d46-3710-4fdb-afd3-df4192aafa89'::uuid, (SELECT tea_spoon_img FROM photos)),
  ('86a48dfa-d065-47a2-9433-407463f46728'::uuid, (SELECT dessert_knife_img FROM photos)),
  ('02b7e8e3-12d4-4755-8b5c-ce3bb7f91815'::uuid, (SELECT butter_knife_img FROM photos))
) AS v(id, own)
WHERE i.id = v.id;

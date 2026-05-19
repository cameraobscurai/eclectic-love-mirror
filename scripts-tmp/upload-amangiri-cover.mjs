import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const file = readFileSync('/tmp/amangiri-cover.jpg');
const { data, error } = await sb.storage.from('image-galleries').upload('AMANGIRI/COVER_amangiri_night_dinner.jpg', file, { contentType: 'image/jpeg', upsert: true });
console.log(error || data);

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const files = ['01SPRING','02SUMMER','03LATESUMER','04AUTUMN','05WINTER'];
for (const f of files) {
  const key = `${f}-v2.mp4`;
  const body = await readFile(`/tmp/hero/${key}`);
  const { error } = await sb.storage.from('videos').upload(key, body, {
    contentType: 'video/mp4',
    upsert: true,
    cacheControl: '31536000, immutable',
  });
  if (error) throw error;
  console.log('✓', key, body.length);
}

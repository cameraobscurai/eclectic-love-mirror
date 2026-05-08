import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const names = readFileSync('/tmp/editorial-files.txt','utf8').split('\n').filter(Boolean);
const { data, error } = await sb.storage.from('editorial').createSignedUrls(names, 60*60*24*7);
if (error) { console.error(error); process.exit(1); }
writeFileSync('/tmp/editorial-signed.json', JSON.stringify(data, null, 2));
console.log('signed', data.length);

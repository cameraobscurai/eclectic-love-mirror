// Build a manifest of every file in the `collection` storage bucket.
// Output: scripts-tmp/collection-manifest.json -> { "<path>": true, ... }
// Read-only against Supabase. No DB writes.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const BUCKET = 'collection';

async function listAll(prefix = '') {
  const out = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // folders have no `id`
      if (entry.id == null) {
        out.push(...(await listAll(path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

const all = await listAll('');
const manifest = Object.fromEntries(all.map((p) => [p, true]));
fs.writeFileSync('scripts-tmp/collection-manifest.json', JSON.stringify(manifest, null, 0));
console.log(`collection manifest: ${all.length} files`);

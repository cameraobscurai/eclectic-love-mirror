import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const plan = {
  adonisglassware: {
    'ChatGPT Image May 14, 2026, 05_09_02 AM (1).png': 'adonis-set.png',
    'ChatGPT Image May 14, 2026, 05_09_03 AM (5).png': 'adonis-white-wine.png',
    'ChatGPT Image May 14, 2026, 05_09_03 AM (4).png': 'adonis-coupe.png',
    'ChatGPT Image May 14, 2026, 05_09_03 AM (3).png': 'adonis-red-wine.png',
    'ChatGPT Image May 14, 2026, 05_09_02 AM (2).png': 'adonis-goblet.png',
  },
  donavertortoiseflatware: {
    'ChatGPT Image May 14, 2026, 05_06_06 AM (8).png': 'donaver-set.png',
    'ChatGPT Image May 14, 2026, 05_06_04 AM (1).png': 'donaver-salad-fork.png',
    'ChatGPT Image May 14, 2026, 05_06_04 AM (2).png': 'donaver-butter-knife.png',
    'ChatGPT Image May 14, 2026, 05_06_04 AM (3).png': 'donaver-dinner-fork.png',
    'ChatGPT Image May 14, 2026, 05_06_05 AM (4).png': 'donaver-dinner-knife.png',
    'ChatGPT Image May 14, 2026, 05_06_05 AM (5).png': 'donaver-dinner-spoon.png',
    'ChatGPT Image May 14, 2026, 05_06_06 AM (6).png': 'donaver-steak-knife.png',
    'ChatGPT Image May 14, 2026, 05_06_06 AM (7).png': 'donaver-tea-spoon.png',
  },
  sageglassware: {
    'ChatGPT Image May 14, 2026, 05_07_12 AM (3).png': 'sage-coupe.png',
    'ChatGPT Image May 14, 2026, 05_07_12 AM (2).png': 'sage-red-wine.png',
    'ChatGPT Image May 14, 2026, 05_07_12 AM (4).png': 'sage-rocks.png',
    'ChatGPT Image May 14, 2026, 05_07_12 AM (1).png': 'sage-white-wine.png',
    'ChatGPT Image May 14, 2026, 05_07_13 AM (6).png': 'sage-woven-rocks.png',
  },
};

const replacements = [];
for (const [bucket, map] of Object.entries(plan)) {
  for (const [from, to] of Object.entries(map)) {
    const { error } = await sb.storage.from(bucket).move(from, to);
    console.log(error ? `FAIL ${bucket}/${from}: ${error.message}` : `OK   ${bucket}/${to}`);
    if (!error) {
      const enc = encodeURIComponent(from).replace(/'/g, '%27');
      replacements.push({ bucket, fromEnc: enc, fromRaw: from, to });
    }
  }
}

// Update catalog JSON
const path = 'src/data/inventory/current_catalog.json';
let raw = fs.readFileSync(path, 'utf8');
let count = 0;
for (const r of replacements) {
  const re = new RegExp(`/${r.bucket}/${r.fromEnc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
  const before = raw;
  raw = raw.replace(re, `/${r.bucket}/${r.to}`);
  if (raw !== before) count++;
}
fs.writeFileSync(path, raw);
console.log(`\nCatalog: ${count} URL groups replaced`);

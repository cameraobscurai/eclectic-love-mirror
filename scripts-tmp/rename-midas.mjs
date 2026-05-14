import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const map = {
  'ChatGPT Image May 14, 2026, 05_01_41 AM.png': 'midas-set.png',
  'ChatGPT Image May 14, 2026, 05_01_44 AM (1).png': 'midas-fork.png',
  'ChatGPT Image May 14, 2026, 05_01_45 AM (2).png': 'midas-dinner-knife.png',
  'ChatGPT Image May 14, 2026, 05_01_45 AM (3).png': 'midas-spoon.png',
  'ChatGPT Image May 14, 2026, 05_01_45 AM (4).png': 'midas-dessert-tea-spoon.png',
  'ChatGPT Image May 14, 2026, 05_01_45 AM (5).png': 'midas-dessert-knife.png',
  'ChatGPT Image May 14, 2026, 05_01_46 AM (6).png': 'midas-butter-knife.png',
};
for (const [from, to] of Object.entries(map)) {
  const { error } = await sb.storage.from('midas').move(from, to);
  console.log(error ? `FAIL ${from} -> ${to}: ${error.message}` : `OK   ${to}`);
}
const { data } = await sb.storage.from('midas').list('', { limit: 100 });
console.log('\nfinal:', data.map(d => d.name));

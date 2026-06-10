#!/usr/bin/env node
// Apply an editorial-order proposal to inventory_items.editorial_order.
// Usage: apply.mjs <parent> [--apply]
//   default = dry-run (prints SQL + summary)
//   --apply = executes UPDATEs via psql
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const parent = process.argv[2];
const apply = process.argv.includes('--apply');
if (!parent) { console.error('usage: apply.mjs <parent> [--apply]'); process.exit(1); }

const proposal = JSON.parse(readFileSync(resolve(root, `scripts-tmp/order/${parent}.proposal.json`), 'utf8'));
const slice = JSON.parse(readFileSync(resolve(root, `scripts-tmp/order/${parent}.slice.json`), 'utf8'));

// Build subcategory pill order from proposal key order.
const subOrder = Object.keys(proposal.order);
// Validate: every slice rms_id appears exactly once.
const sliceIds = new Set();
for (const arr of Object.values(slice)) for (const p of arr) sliceIds.add(p.rms_id);
const proposalIds = new Set();
for (const arr of Object.values(proposal.order)) for (const id of arr) {
  if (proposalIds.has(id)) { console.error(`DUPLICATE in proposal: ${id}`); process.exit(2); }
  proposalIds.add(id);
}
const missing = [...sliceIds].filter(id => !proposalIds.has(id));
const extra = [...proposalIds].filter(id => !sliceIds.has(id));
if (missing.length) console.error(`MISSING from proposal: ${missing.join(', ')}`);
if (extra.length) console.error(`EXTRA in proposal: ${extra.join(', ')}`);
if (missing.length || extra.length) process.exit(2);

// Assign editorial_order. Numbering scheme:
//   subcategoryIndex * 10000 + (position * 100), gaps of 100 for manual nudges.
const updates = [];
subOrder.forEach((sub, subIdx) => {
  proposal.order[sub].forEach((rms_id, pos) => {
    const order = subIdx * 10000 + (pos + 1) * 100;
    updates.push({ rms_id, order, sub, pos: pos + 1 });
  });
});

console.log(`# ${parent} editorial-order proposal`);
console.log(`# ${updates.length} updates across ${subOrder.length} subcategories`);
for (const sub of subOrder) {
  const n = proposal.order[sub].length;
  console.log(`#   ${sub}: ${n}`);
}
console.log();

const sql = updates.map(u =>
  `UPDATE public.inventory_items SET editorial_order = ${u.order} WHERE rms_id = '${u.rms_id.replace(/'/g, "''")}';`
).join('\n');

if (!apply) {
  console.log('# DRY RUN — first 5 SQL statements:');
  console.log(sql.split('\n').slice(0, 5).join('\n'));
  console.log(`# ... (${updates.length - 5} more)`);
  console.log('# Re-run with --apply to execute.');
  process.exit(0);
}

console.log('# APPLY — executing via Supabase service role...');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
let ok = 0;
for (const u of updates) {
  const { error } = await sb.from('inventory_items').update({ editorial_order: u.order }).eq('rms_id', u.rms_id);
  if (error) { console.error(`FAIL rms_id=${u.rms_id}:`, error.message); process.exit(3); }
  ok++;
}
console.log(`# applied ${ok}/${updates.length} updates`);

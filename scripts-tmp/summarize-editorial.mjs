import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const data = JSON.parse(readFileSync('/tmp/editorial-classified.json','utf8'));
const buckets = {};
const rows = [['original_filename','proposed_bucket','proposed_slug','caption','palette']];
for (const [path, c] of Object.entries(data)) {
  const b = c.bucket || 'other';
  buckets[b] = (buckets[b]||0)+1;
  rows.push([path, b, c.slug||'', c.caption||'', Array.isArray(c.palette)?c.palette.join(' / '):c.palette||'']);
}
console.log('\nBUCKET COUNTS\n'+Object.entries(buckets).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`  ${String(v).padStart(3)}  ${k}`).join('\n'));
mkdirSync('/mnt/documents', { recursive: true });
const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
writeFileSync('/mnt/documents/editorial-classification.csv', csv);
const proposal = {};
for (const [path, c] of Object.entries(data)) {
  const b = c.bucket || 'other';
  const slug = (c.slug||'image').replace(/[^a-z0-9-]/gi,'-').toLowerCase();
  (proposal[b] ||= []).push({ from: path, to: `${b}/${slug}.png`, caption: c.caption });
}
// dedupe slugs within each bucket
for (const b of Object.keys(proposal)) {
  const seen = new Map();
  for (const item of proposal[b]) {
    const base = item.to;
    let n = seen.get(base) || 0; n++; seen.set(base, n);
    if (n > 1) item.to = base.replace(/\.png$/, `-${n}.png`);
  }
}
writeFileSync('/mnt/documents/editorial-rename-plan.json', JSON.stringify(proposal, null, 2));
console.log('\nWrote /mnt/documents/editorial-classification.csv');
console.log('Wrote /mnt/documents/editorial-rename-plan.json');

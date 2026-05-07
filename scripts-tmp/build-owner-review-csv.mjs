import fs from 'fs';
const diff = JSON.parse(fs.readFileSync('/dev-server/scripts-tmp/parent-diff-aliased.json', 'utf8'));
const rows = [['bucket','parent','title','rms_id','decision (keep/drop/merge)','merge_target_or_notes']];
for (const p of diff) {
  for (const t of p.liveOnly || []) rows.push(['live-only-(missing-from-RMS)', p.parent, t, '', '', '']);
  for (const t of p.oursOnly || []) {
    const m = t.match(/^(.*?) \[rms(\d+)\]$/);
    rows.push(['ours-only-(not-on-Squarespace)', p.parent, m?m[1]:t, m?m[2]:'', '', '']);
  }
}
const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
fs.writeFileSync('/mnt/documents/owner-catalog-review.csv', csv);
console.log(`wrote ${rows.length-1} rows`);

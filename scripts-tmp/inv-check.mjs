import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Pull all public products
const all = [];
let from = 0;
while(true){
  const {data,error} = await sb.from('inventory_items')
    .select('rms_id,title,slug,category,quantity,quantity_label,dimensions_raw,images,description,status')
    .neq('status','draft').range(from,from+999).order('category').order('title');
  if(error) throw error;
  if(!data.length) break;
  all.push(...data); from += data.length;
  if(data.length<1000) break;
}

// Pull live harvest
const live = JSON.parse(fs.readFileSync('scripts/audit/live-products.json','utf8'));
const liveByTitle = new Map();
for (const p of (live.products||live)) {
  const k = (p.title||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  if (k) liveByTitle.set(k, p);
}

// Catalog (baked)
const catalog = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json','utf8'));
const byCat = {};
for (const c of catalog.collections||[]) {
  byCat[c.slug] = c.products?.length || 0;
}

// Per-product-image report (hero binding analysis)
let imgReport = null;
try { imgReport = JSON.parse(fs.readFileSync('scripts-tmp/per-product-image-report.json','utf8')); } catch {}

const total = all.length;
const imageless = all.filter(r => !Array.isArray(r.images) || r.images.length===0);
const singleImg = all.filter(r => Array.isArray(r.images) && r.images.length===1);
const richImg   = all.filter(r => Array.isArray(r.images) && r.images.length>=3);
const noDesc    = all.filter(r => !r.description || r.description.trim().length<20);

// Status_class buckets from imgReport
const cls = { UNIQUE:0, SHARED_KEEP:0, SHARED_BREAK:0, IMAGELESS:0 };
const sharedBreakRows = [];
const u404 = [];
if (imgReport) {
  for (const p of imgReport.products||imgReport) {
    if (p.status_class && cls[p.status_class] !== undefined) cls[p.status_class]++;
    if (p.status_class === 'SHARED_BREAK') sharedBreakRows.push(p);
    if (p.flags && p.flags.includes('current_url_404')) u404.push(p);
  }
}

// By-category breakdown
const catStats = {};
for (const r of all) {
  const c = r.category || 'unknown';
  catStats[c] ||= { total:0, imageless:0, single:0, rich:0, noDesc:0 };
  catStats[c].total++;
  if (!Array.isArray(r.images) || r.images.length===0) catStats[c].imageless++;
  else if (r.images.length===1) catStats[c].single++;
  else if (r.images.length>=3) catStats[c].rich++;
  if (!r.description || r.description.trim().length<20) catStats[c].noDesc++;
}

// Live coverage: how many DB titles have a live match
let liveMatches = 0;
for (const r of all) {
  const k = (r.title||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  // try strip trailing variant tokens
  if (liveByTitle.has(k)) { liveMatches++; continue; }
  const tokens = k.split(' ');
  for (let i=tokens.length-1; i>=2; i--) {
    if (liveByTitle.has(tokens.slice(0,i).join(' '))) { liveMatches++; break; }
  }
}

// Build markdown
let md = `# Inventory & Image Health — Pre-Meeting Snapshot\n\n`;
md += `_Generated ${new Date().toISOString()}_\n\n`;
md += `## Headline numbers\n\n`;
md += `| Metric | Count | % of public catalog |\n|---|---:|---:|\n`;
md += `| Public products (live on /collection) | **${total}** | 100% |\n`;
md += `| ✅ Have ≥1 image | ${total - imageless.length} | ${((1-imageless.length/total)*100).toFixed(1)}% |\n`;
md += `| ✅ Rich gallery (≥3 images) | ${richImg.length} | ${(richImg.length/total*100).toFixed(1)}% |\n`;
md += `| ⚠️ Single image only | ${singleImg.length} | ${(singleImg.length/total*100).toFixed(1)}% |\n`;
md += `| 🔴 Zero images (hidden until photo arrives) | **${imageless.length}** | ${(imageless.length/total*100).toFixed(1)}% |\n`;
md += `| ⚠️ Missing/short description | ${noDesc.length} | ${(noDesc.length/total*100).toFixed(1)}% |\n`;
md += `| ✅ Has live OG-site match (description, gallery) | ${liveMatches} | ${(liveMatches/total*100).toFixed(1)}% |\n\n`;

if (imgReport) {
  md += `## Image binding health (hero photo trust)\n\n`;
  md += `From the deep image-audit run on ${imgReport.generated || 'recent'}:\n\n`;
  md += `| Bucket | Count | What it means |\n|---|---:|---|\n`;
  md += `| 🟢 UNIQUE hero | ${cls.UNIQUE} | Hero image is unique to that product — trustworthy |\n`;
  md += `| 🟢 SHARED but legitimate | ${cls.SHARED_KEEP} | Same hero across a real variant family (e.g. Carlisle set) — keep |\n`;
  md += `| 🟠 SHARED falsely | ${cls.SHARED_BREAK} | Multiple unrelated SKUs share one hero — needs unique photo or unbind |\n`;
  md += `| 🔴 IMAGELESS | ${cls.IMAGELESS} | Tracked as missing |\n`;
  md += `| ⚠️ Hero URL returns 404 | ${u404.length} | Storage URL broken, photo gone or moved |\n\n`;
}

md += `## By category\n\n`;
md += `| Category | Total | ✅ Imaged | 🔴 Missing | ⚠️ Single-img | ✅ Rich | ⚠️ No desc |\n|---|---:|---:|---:|---:|---:|---:|\n`;
for (const c of Object.keys(catStats).sort()) {
  const s = catStats[c];
  md += `| ${c} | ${s.total} | ${s.total-s.imageless} | ${s.imageless} | ${s.single} | ${s.rich} | ${s.noDesc} |\n`;
}

// Categories scoring
md += `\n## Category report card\n\n`;
const grade = (s) => {
  const imgPct = (s.total-s.imageless)/s.total;
  if (imgPct >= 0.95 && s.rich/s.total >= 0.5) return '🟢 SOLID';
  if (imgPct >= 0.85) return '🟡 MOSTLY GOOD';
  if (imgPct >= 0.5)  return '🟠 NEEDS WORK';
  return '🔴 BROKEN';
};
md += `| Category | Grade | Notes |\n|---|---|---|\n`;
for (const c of Object.keys(catStats).sort()) {
  const s = catStats[c];
  const notes = [];
  if (s.imageless>0) notes.push(`${s.imageless} no photo`);
  if (s.single > s.total*0.4) notes.push(`many single-img`);
  if (s.noDesc > s.total*0.5) notes.push(`descriptions thin`);
  md += `| ${c} | ${grade(s)} | ${notes.join('; ') || 'looks healthy'} |\n`;
}

// Specific lists
md += `\n## 🔴 Products with ZERO images (${imageless.length})\n\n`;
md += `These are hidden from the public collection until a photo lands.\n\n`;
const grouped = {};
for (const r of imageless) (grouped[r.category]=grouped[r.category]||[]).push(r);
for (const c of Object.keys(grouped).sort()) {
  md += `\n### ${c} — ${grouped[c].length}\n`;
  for (const r of grouped[c].sort((a,b)=>a.title.localeCompare(b.title))) {
    md += `- ${r.title} (rms ${r.rms_id})\n`;
  }
}

if (sharedBreakRows.length) {
  md += `\n## 🟠 Products with FALSELY shared hero photo (${sharedBreakRows.length})\n\n`;
  md += `These show the same image as another unrelated product. Reset or rebind.\n\n`;
  const sg = {};
  for (const p of sharedBreakRows) (sg[p.category]=sg[p.category]||[]).push(p);
  for (const c of Object.keys(sg).sort()) {
    md += `\n### ${c} — ${sg[c].length}\n`;
    for (const p of sg[c].slice(0,30)) md += `- ${p.title} (rms ${p.rms_id})\n`;
    if (sg[c].length>30) md += `- _…and ${sg[c].length-30} more_\n`;
  }
}

// confident green list
md += `\n## ✅ Confidently in good shape\n\n`;
md += `Categories where 95%+ of products have photos AND most have rich galleries:\n\n`;
for (const c of Object.keys(catStats).sort()) {
  const s = catStats[c];
  if ((s.total-s.imageless)/s.total >= 0.95 && s.rich/s.total >= 0.5) {
    md += `- **${c}** — ${s.total} products, ${s.rich} with rich galleries\n`;
  }
}

fs.writeFileSync('/mnt/documents/inventory-health-report.md', md);
console.log('wrote', md.length, 'chars');
console.log('imageless:', imageless.length, 'shared_break:', sharedBreakRows.length, 'u404:', u404.length);

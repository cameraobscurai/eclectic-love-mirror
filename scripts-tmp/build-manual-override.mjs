#!/usr/bin/env node
// Monroe + 2-conflict manual override sheet — human review required.
// READ-ONLY. Writes scripts-tmp/manual-override-monroe.json + .md
import fs from 'node:fs';

const SITE = JSON.parse(fs.readFileSync('scripts-tmp/owner-site-products.json', 'utf8'));
const MONROE = JSON.parse(fs.readFileSync('scripts-tmp/reconcile-monroe.json', 'utf8'));
const CONFLICTS = JSON.parse(fs.readFileSync('scripts-tmp/reconcile-conflicts.json', 'utf8'));

const STORAGE_BASE = 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/';
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

// --- Monroe site product (real images) ---
const monroeSite = SITE.find((p) => /monroe/i.test(p.title) || /monroe/i.test(p.slug || ''));
const siteImages = monroeSite ? monroeSite.cdn_image_urls.map((u) => `${u.split('?')[0]}?format=2500w`) : [];

// Map storage filenames to size tokens (Single 5', 5', etc.)
function sizeKey(s) {
  const m = s.match(/(single|double|triple)[\s_-]*(\d+)/i);
  if (!m) return null;
  return `${m[1].toLowerCase()}-${m[2]}`;
}

const storageBySize = new Map();
for (const path of MONROE.storage_files) {
  if (!/MONROE/.test(path)) continue;
  const k = sizeKey(path);
  if (k) storageBySize.set(k, STORAGE_BASE + enc(path));
}

// Map site CDN images to size tokens (filename portion after last /)
const siteBySize = new Map(); // size -> array
for (const url of siteImages) {
  const fname = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
  const k = sizeKey(fname);
  if (!k) continue;
  if (!siteBySize.has(k)) siteBySize.set(k, []);
  siteBySize.get(k).push(url);
}

const monroeRows = MONROE.rms_rows.map((row) => {
  const k = sizeKey(row.title);
  const storage = k ? storageBySize.get(k) : null;
  const sitePerSize = k ? (siteBySize.get(k) || []) : [];
  // Recommended primary: storage exact size match if exists, else first site image of same size, else first site image overall
  const primary = storage || sitePerSize[0] || siteImages[0] || null;
  const gallery = [
    ...(storage ? [] : []),
    ...sitePerSize.filter((u) => u !== primary),
    ...siteImages.filter((u) => u !== primary && !sitePerSize.includes(u)),
  ];
  return {
    product_id: row.rms_id,
    rms_title: row.title,
    rms_category: row.category,
    csv_image_filename: row.csv_image_filename,
    storage_candidate_url: storage,
    squarespace_candidate_urls: siteImages,
    recommended_primary_image: primary,
    recommended_gallery_images: gallery,
    confidence: storage && sitePerSize.length ? 'high (size match in both sources)'
      : storage ? 'medium (storage size match only)'
      : sitePerSize.length ? 'medium (site filename size match only)'
      : 'low (fallback to generic site image)',
    notes: 'CSV labels filenames as "Astaire" but RMS title is "Monroe — Black Slat Tambour". Storage filenames already use correct "MONROE" naming. Visual review required: confirm size labels (5\'/8\'/10\'/16\'/15\') match physical bar.',
  };
});

// --- Two conflicts (Iraja, Gideon) ---
const conflictRows = CONFLICTS.map((c) => {
  const siteMatches = SITE.filter((p) => p.title.toLowerCase().includes(c.product_name.split(' ')[0].toLowerCase()));
  return {
    product_id: c.product_id,
    rms_title: c.product_name,
    rms_category: c.category,
    csv_image_filename: c.csv_original_filename,
    csv_filename_concern: c.conflict_reason,
    storage_candidate_url: c.storage_candidate,
    squarespace_candidates: siteMatches.map((s) => ({
      site_title: s.title,
      detail_url: s.detail_url,
      first_image: s.cdn_image_urls[0] ? `${s.cdn_image_urls[0].split('?')[0]}?format=2500w` : null,
      image_count: s.cdn_image_urls.length,
    })),
    recommended_primary_image: siteMatches[0]?.cdn_image_urls[0]
      ? `${siteMatches[0].cdn_image_urls[0].split('?')[0]}?format=2500w`
      : c.storage_candidate,
    recommended_gallery_images: (siteMatches[0]?.cdn_image_urls || []).slice(1).map((u) => `${u.split('?')[0]}?format=2500w`),
    confidence: c.product_id === '2864'
      ? 'low — storage candidate URL is a totally unrelated bar image (BARS/ARCUS-BEVIN…); do NOT use storage. Site product "Gideon Bamboo Pendant Light" looks like the correct visual binding but verify before applying.'
      : 'medium — IRJA filename almost certainly = Iraja; verify storage image is the same physical bar as the site listing.',
    notes: 'Visual review required by Adrienne/Darian before binding.',
  };
});

const out = {
  generated_at: new Date().toISOString(),
  monroe_cluster: {
    site_product_url: monroeSite?.detail_url || null,
    site_image_count: siteImages.length,
    storage_filename_count: MONROE.storage_files.filter((p) => /MONROE/.test(p)).length,
    rows: monroeRows,
  },
  conflicts: conflictRows,
};
fs.writeFileSync('scripts-tmp/manual-override-sheet.json', JSON.stringify(out, null, 2));

// Markdown view
let md = `# Manual Override Sheet — Monroe + 2 Conflicts\n\n_Generated ${out.generated_at}_\n\nDo NOT apply automatically. For Adrienne/Darian visual review.\n\n`;
md += `## Monroe cluster (5 RMS rows)\n\n`;
md += `- Site product: ${monroeSite?.detail_url}\n- Site images: ${siteImages.length}\n- Storage MONROE files: ${MONROE.storage_files.filter((p) => /MONROE/.test(p)).length}\n\n`;
for (const r of monroeRows) {
  md += `### ${r.product_id} — ${r.rms_title}\n`;
  md += `- CSV filename: \`${r.csv_image_filename}\`\n`;
  md += `- Storage candidate: ${r.storage_candidate_url ? `\n  ![](${r.storage_candidate_url})\n  ${r.storage_candidate_url}` : '_none_'}\n`;
  md += `- Recommended primary: ${r.recommended_primary_image ? `\n  ![](${r.recommended_primary_image})\n  ${r.recommended_primary_image}` : '_none_'}\n`;
  md += `- Gallery candidates: ${r.recommended_gallery_images.length}\n`;
  md += `- Confidence: ${r.confidence}\n\n`;
}
md += `\n## Conflicts (2)\n\n`;
for (const c of conflictRows) {
  md += `### ${c.product_id} — ${c.rms_title}\n`;
  md += `- CSV filename: \`${c.csv_image_filename}\`\n`;
  md += `- Concern: ${c.csv_filename_concern}\n`;
  md += `- Storage candidate: ${c.storage_candidate_url ? `\n  ![](${c.storage_candidate_url})\n  ${c.storage_candidate_url}` : '_none_'}\n`;
  md += `- Squarespace candidates:\n`;
  for (const s of c.squarespace_candidates) {
    md += `  - **${s.site_title}** (${s.image_count} images) — ${s.detail_url}\n`;
    if (s.first_image) md += `    ![](${s.first_image})\n`;
  }
  md += `- Recommended primary: ${c.recommended_primary_image ? `\n  ![](${c.recommended_primary_image})\n  ${c.recommended_primary_image}` : '_none_'}\n`;
  md += `- Confidence: ${c.confidence}\n\n`;
}
fs.writeFileSync('scripts-tmp/manual-override-sheet.md', md);
console.log('Wrote scripts-tmp/manual-override-sheet.json and .md');
console.log(`Monroe rows: ${monroeRows.length}, conflict rows: ${conflictRows.length}`);
console.log(`Site images for Monroe: ${siteImages.length}, storage MONROE files: ${MONROE.storage_files.filter((p) => /MONROE/.test(p)).length}`);

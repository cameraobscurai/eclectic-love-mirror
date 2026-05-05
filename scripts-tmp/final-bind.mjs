// Read-only fresh binder: RMS rows -> storage files -> CDN fallback
import { readFileSync, writeFileSync } from 'node:fs';
import xlsx from 'xlsx';

const wb = xlsx.readFile('/tmp/current_inventory.xlsx');
const rmsRows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const catalog = JSON.parse(readFileSync('src/data/inventory/current_catalog.json','utf8')).products;
const catBySlug = new Map(catalog.map(p=>[p.id,p])); // RMS id is string in catalog
const manifest = JSON.parse(readFileSync('scripts-tmp/storage-filetree-manifest.json','utf8'));
const ownerSite = JSON.parse(readFileSync('scripts-tmp/owner-site-products.json','utf8'));

// Category slug -> set of folder names
const CAT2FOLDERS = {
  bars:['BARS'], candlelight:['CANDLELIGHT'], 'furs-pelts':['FURS-PELTS'],
  'large-decor':['LARGE-DECOR'], lighting:['LIGHTING'], chandeliers:['LIGHTING'],
  'pillows-throws':['PILLOWS','THROWS'], rugs:['RUGS'], seating:['SEATING'],
  serveware:['SERVEWARE'], storage:['STORAGE'], styling:['STYLING'],
  tables:['TABLES'], tableware:['TABLEWEAR'],
};

// ---- normalization ----
function normKey(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i,'')          // ext
    .replace(/[\(\)\[\]'"]/g,' ')
    .replace(/[_\-]+/g,' ')
    .replace(/[^a-z0-9 ]+/g,' ')
    .replace(/\s+/g,' ')
    .replace(/\s+\d{1,2}\s*$/,'')         // trailing standalone digits
    .trim();
}
// Aliases applied to both sides
function applyAliases(k) {
  return k
    .replace(/\bgwnenvere\b/g,'gweneverre')
    .replace(/\bgwenevere\b/g,'gweneverre')
    .replace(/\birja\b/g,'iraja')
    .replace(/(\d+)ft\b/g,"$1");          // 5ft -> 5 (for matching against 5')
}
function normTitleForMatch(t) {
  // For RMS titles: drop apostrophes that mark feet
  return applyAliases(normKey(String(t).replace(/'/g,'')));
}
function normFilename(fn) {
  return applyAliases(normKey(fn));
}

// Extract filename from RMS Image Url
function extractFilename(url) {
  if (!url) return null;
  const m = url.match(/\/original\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ---- index storage by folder ----
const filesByFolder = {};
for (const f of manifest) {
  (filesByFolder[f.parent_folder] ??= []).push({
    ...f,
    norm: normFilename(f.raw_filename),
  });
}
const allFiles = manifest.map(f=>({...f, norm: normFilename(f.raw_filename)}));

// ---- build owner-site title index ----
function ownerTitleNorm(t){ return applyAliases(normKey(t)); }
const siteByNorm = new Map();
for (const s of ownerSite) {
  const k = ownerTitleNorm(s.title);
  if (!siteByNorm.has(k)) siteByNorm.set(k,[]);
  siteByNorm.get(k).push(s);
}

// ---- per-row binding ----
const RENDER_RX = /\b(unavailable|render|needs)\b/i;

function pickPrimaryAndGallery(files) {
  if (!files.length) return { primary:null, gallery:[] };
  const renders = files.filter(f=>RENDER_RX.test(f.raw_filename));
  const real = files.filter(f=>!RENDER_RX.test(f.raw_filename));
  const setFile = real.find(f=>/\bset\b/i.test(f.raw_filename));
  const sorted = [...real].sort((a,b)=>a.raw_filename.localeCompare(b.raw_filename));
  let primary, rest;
  if (setFile) { primary = setFile; rest = sorted.filter(f=>f!==setFile); }
  else if (sorted.length) { primary = sorted[0]; rest = sorted.slice(1); }
  else { primary = renders[0]; rest = renders.slice(1); }
  const gallery = [...rest, ...renders.filter(r=>r!==primary && !rest.includes(r))];
  return {
    primary: primary?.public_url ?? null,
    gallery: gallery.map(f=>f.public_url),
  };
}

const out = [];
const stats = { filename_key:0, stem_match:0, squarespace:0, unbound:0 };
const filenameKeyHits = new Map(); // for diagnostics

for (const r of rmsRows) {
  const rms_id = String(r.Id);
  const name = String(r.Name).trim();
  const cat = catBySlug.get(rms_id);
  if (!cat || !cat.publicReady) continue; // only public 835
  const folders = CAT2FOLDERS[cat.categorySlug] || [];
  const folderFiles = folders.flatMap(f => filesByFolder[f] || []);

  const titleNorm = normTitleForMatch(name);
  const titleTokens = titleNorm.split(' ').filter(Boolean);

  let primary=null, gallery=[], method='unbound';

  // ---- Step 1: filename-key match ----
  const rmsFn = extractFilename(r['Image Url']);
  const rmsFnNorm = rmsFn ? normFilename(rmsFn) : null;
  if (rmsFnNorm) {
    // exact match (try in-folder first, then anywhere)
    let hit = folderFiles.find(f=>f.norm === rmsFnNorm);
    if (!hit) hit = allFiles.find(f=>f.norm === rmsFnNorm);
    if (hit) {
      // Bind primary; pull stem-related siblings as gallery
      primary = hit.public_url;
      method = 'filename_key';
      // gallery = same folder, same stem (first 1-2 tokens of file)
      const stemTokens = hit.norm.split(' ').slice(0,2).join(' ');
      const sibs = folderFiles
        .filter(f => f!==hit && f.norm.startsWith(stemTokens))
        .sort((a,b)=>a.raw_filename.localeCompare(b.raw_filename));
      gallery = sibs.map(s=>s.public_url);
    }
  }

  // ---- Step 2: stem match in category folder ----
  if (!primary && titleTokens.length && folderFiles.length) {
    const stem1 = titleTokens[0];
    const stem2 = titleTokens.slice(0,2).join(' ');
    // candidate set: files whose normalized starts with stem2 OR stem1
    let cand = folderFiles.filter(f => f.norm.startsWith(stem2));
    if (cand.length === 0) cand = folderFiles.filter(f => f.norm.startsWith(stem1+' ') || f.norm === stem1);
    if (cand.length) {
      // For pieces (tableware/serveware/pillows): try to bind only the file that matches piece tokens
      const pieceWords = titleTokens.slice(1).filter(t=>t.length>=3);
      let pieceHit = null;
      if (pieceWords.length) {
        // best file = one whose norm contains ALL piece words
        const scored = cand.map(f=>{
          const fwords = f.norm.split(' ');
          const hits = pieceWords.filter(w=>fwords.includes(w)).length;
          return { f, hits };
        }).sort((a,b)=>b.hits-a.hits);
        if (scored[0].hits >= Math.min(2, pieceWords.length)) pieceHit = scored[0].f;
      }
      if (pieceHit) {
        primary = pieceHit.public_url;
        // Set file as alt primary if it exists in cand
        const setF = cand.find(f=>/\bset\b/i.test(f.raw_filename));
        if (setF && setF !== pieceHit) {
          // primary stays as piece-specific; set goes into gallery
          gallery = [setF.public_url, ...cand.filter(f=>f!==pieceHit && f!==setF).map(f=>f.public_url)];
        } else {
          gallery = cand.filter(f=>f!==pieceHit).map(f=>f.public_url);
        }
      } else {
        const pg = pickPrimaryAndGallery(cand);
        primary = pg.primary;
        gallery = pg.gallery;
      }
      if (primary) method = 'stem_match';
    }
  }

  // ---- Step 3: squarespace fallback ----
  if (!primary) {
    // exact title match
    let site = siteByNorm.get(titleNorm)?.[0];
    if (!site) {
      // family fuzzy: find any site product whose normTitle starts with stem1+stem2 of RMS
      const stem2 = titleTokens.slice(0,2).join(' ');
      for (const [k,v] of siteByNorm) {
        if (k.startsWith(stem2)) { site = v[0]; break; }
      }
    }
    if (site && site.cdn_image_urls?.length) {
      const clean = site.cdn_image_urls.filter(u=>!u.includes('&amp;url=') && !u.includes('?'));
      const cdn = clean.length? clean : site.cdn_image_urls.slice(0,1);
      primary = cdn[0];
      gallery = cdn.slice(1);
      method = 'squarespace';
    }
  }

  if (!primary) method = 'unbound';
  stats[method]++;

  out.push({
    rms_id,
    title: name,
    category: cat.categorySlug,
    primary_image: primary,
    gallery_images: gallery,
    bind_method: method,
  });
}

writeFileSync('scripts-tmp/final-apply-manifest.json', JSON.stringify(out,null,2));

// summary
const total = out.length;
const bound = total - stats.unbound;
const unboundByCat = {};
for (const r of out) {
  if (r.bind_method==='unbound') {
    (unboundByCat[r.category] ??= []).push({rms_id:r.rms_id, title:r.title});
  }
}

const lines = [];
lines.push('# Final binding summary (READ-ONLY, no DB writes)');
lines.push('');
lines.push(`Total RMS rows (public):  ${total}`);
lines.push(`Total bound (any method): ${bound}`);
lines.push(`  via filename_key:       ${stats.filename_key}`);
lines.push(`  via stem_match:         ${stats.stem_match}`);
lines.push(`  via squarespace only:   ${stats.squarespace}`);
lines.push(`Unbound:                  ${stats.unbound}`);
lines.push('');
lines.push('## Unbound by category');
for (const [cat, rows] of Object.entries(unboundByCat).sort((a,b)=>b[1].length-a[1].length)) {
  lines.push(`\n### ${cat}  (${rows.length})`);
  for (const row of rows) lines.push(`  ${row.rms_id}  ${row.title}`);
}

const summary = lines.join('\n');
writeFileSync('scripts-tmp/final-apply-summary.txt', summary);
console.log(summary);

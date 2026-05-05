// Read-only storage manifest + hard-file reconciliation against the RMS catalog.
// Inputs:
//   /tmp/storage-raw.ndjson         (one JSON object per storage file)
//   src/data/inventory/current_catalog.json
// Outputs into scripts-tmp/. Writes NOTHING to DB or to public.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

const SUPABASE_URL = "https://wdyfavzfquegrxklcpmq.supabase.co";
const PUBLIC_BASE  = `${SUPABASE_URL}/storage/v1/object/public/inventory`;

// ----- Folder → site category mapping (per spec) -----
const FOLDER_MAP = {
  BARS:        { category: "bars",           certainty: "exact" },
  CANDLELIGHT: { category: "candlelight",    certainty: "exact" },
  COMPONENTS:  { category: "__review__",     certainty: "uncertain" },
  "FURS-PELTS":{ category: "furs-pelts",     certainty: "uncertain" }, // RMS owns furs-pelts; spec says check
  "LARGE-DECOR":{category: "large-decor",    certainty: "exact" },
  LIGHTING:    { category: "lighting",       certainty: "exact" },
  PILLOWS:     { category: "pillows-throws", certainty: "exact" },
  RUGS:        { category: "rugs",           certainty: "exact" },
  SEATING:     { category: "seating",        certainty: "exact" },
  SERVEWARE:   { category: "serveware",      certainty: "exact" },
  STORAGE:     { category: "storage",        certainty: "exact" },
  STYLING:     { category: "styling",        certainty: "exact" },
  TABLES:      { category: "tables",         certainty: "exact" },
  TABLEWEAR:   { category: "tableware",      certainty: "exact" }, // misspelled in storage
  THROWS:      { category: "pillows-throws", certainty: "exact" },
};

// Smallware categories — strict matching only.
const STRICT_CATEGORIES = new Set([
  "tableware","serveware","styling","pillows-throws","candlelight",
]);
const SMALLWARE_TOKENS = new Set([
  "fork","spoon","knife","bowl","plate","napkin","pillow","throw",
  "candle","lantern","cup","mug","glass","saucer","tray",
]);

// ----- helpers -----
const norm = (s) => (s||"")
  .toString().toLowerCase()
  .replace(/[._\-]+/g," ")
  .replace(/[^a-z0-9 ]+/g," ")
  .replace(/\s+/g," ").trim();

const tokens = (s) => norm(s).split(" ").filter(t => t.length>=3);
const tokenSet = (s) => new Set(tokens(s));

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Strip trailing image-index numbers and angle/detail descriptors from filename stem
function fileStemKey(stem) {
  let s = stem
    .replace(/\.[a-z0-9]+$/i, "")              // ext
    .replace(/[\(\)\[\]]/g, " ")                // parens
    .replace(/\b(\d{1,2})\b\s*$/i, "")          // trailing 0/1/2…
    .replace(/\b(front|back|side|detail|angle|hero|alt|top|bottom)\b/gi," ")
    .trim();
  return norm(s);
}

// ----- load inputs -----
const ndjson = readFileSync("/tmp/storage-raw.ndjson","utf8")
  .split("\n").filter(Boolean).map(l => JSON.parse(l));

const catalog = JSON.parse(
  readFileSync("src/data/inventory/current_catalog.json","utf8"),
).products;

// ----- STEP 1: build manifest + folder counts -----
const manifest = [];
const folderStats = new Map();

for (const o of ndjson) {
  const fullPath = o.name; // "inventory/BARS/AMISA Blue Bar 1.png"
  const parts = fullPath.split("/");
  // Real layout in storage is "inventory/<FOLDER>/<file>"
  const parent = parts.length >= 3 ? parts[1] : "(root)";
  const filename = parts[parts.length-1];
  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
  const stem = filename.replace(/\.[a-z0-9]+$/i,"");

  const map = FOLDER_MAP[parent] ?? { category: null, certainty: "uncertain" };

  manifest.push({
    bucket: "inventory",
    full_storage_path: fullPath,
    parent_folder: parent,
    raw_filename: filename,
    file_extension: ext,
    file_size: o.size,
    created_at: o.created_at,
    public_url: `${PUBLIC_BASE}/${fullPath.replace(/^inventory\//,"")}`,
    normalized_filename_key: fileStemKey(stem),
    normalized_folder_key: parent.toLowerCase(),
    mapped_category: map.category,
    category_certainty: map.certainty,
  });

  if (!folderStats.has(parent)) {
    folderStats.set(parent, {
      folder: parent,
      mapped_category: map.category,
      category_certainty: map.certainty,
      image_count: 0,
      total_bytes: 0,
      examples: [],
    });
  }
  const fs = folderStats.get(parent);
  fs.image_count++;
  fs.total_bytes += o.size || 0;
  if (fs.examples.length < 10) fs.examples.push(filename);
}

const folderCounts = [...folderStats.values()]
  .sort((a,b)=>b.image_count - a.image_count);

writeFileSync("scripts-tmp/storage-filetree-manifest.json",
  JSON.stringify(manifest, null, 2));
writeFileSync("scripts-tmp/storage-folder-counts.json",
  JSON.stringify(folderCounts, null, 2));

// txt versions
const ftLines = ["# Storage filetree manifest","",
  `Total images: ${manifest.length}`,
  `Total folders: ${folderCounts.length}`,"",
  "FOLDER\tIMAGES\tBYTES\tMAPPED_CATEGORY\tCERTAINTY",
  ...folderCounts.map(f =>
    `${f.folder}\t${f.image_count}\t${f.total_bytes}\t${f.mapped_category||"-"}\t${f.category_certainty}`),
];
writeFileSync("scripts-tmp/storage-filetree-manifest.txt", ftLines.join("\n"));

const fcLines = ["# Folder counts",""];
for (const f of folderCounts) {
  fcLines.push(`## ${f.folder}  →  ${f.mapped_category||"(unmapped)"}  [${f.category_certainty}]`);
  fcLines.push(`   images: ${f.image_count}    bytes: ${(f.total_bytes/1e6).toFixed(2)} MB`);
  fcLines.push(`   examples:`);
  for (const e of f.examples) fcLines.push(`     - ${e}`);
  fcLines.push("");
}
writeFileSync("scripts-tmp/storage-folder-counts.txt", fcLines.join("\n"));

// ----- STEP 3+4: matching against RMS catalog -----
// RMS rows: prefer those without images (most-needed). Then everyone.
const rmsRows = catalog.map(p => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  category: p.categorySlug,
  hasImage: Array.isArray(p.images) && p.images.length>0,
  primary: p.primaryImage,
  norm_title: norm(p.title),
  title_tokens: tokenSet(p.title),
  // Identify rows likely to be PRIORITY for hard-files
  isImageless: !(Array.isArray(p.images) && p.images.length>0),
}));

const byCategory = new Map();
for (const r of rmsRows) {
  if (!byCategory.has(r.category)) byCategory.set(r.category, []);
  byCategory.get(r.category).push(r);
}

function findMatchesForFile(file) {
  const cat = file.mapped_category;
  const stemKey = file.normalized_filename_key;
  const stemTokens = tokenSet(stemKey);
  const isStrict = cat && STRICT_CATEGORIES.has(cat);

  // candidate pool: prefer same category if mapping is exact; else all rows
  let pool = (cat && file.category_certainty==="exact" && byCategory.get(cat)) || rmsRows;

  const scored = [];
  for (const r of pool) {
    let method = null, confidence = 0;

    // 1. exact filename stem == normalized title
    if (stemKey && stemKey === r.norm_title) {
      method = "exact_filename_eq_title"; confidence = 1.0;
    }
    // 2. one fully contains the other
    else if (stemKey && r.norm_title &&
             (r.norm_title.includes(stemKey) || stemKey.includes(r.norm_title))) {
      method = "title_contains"; confidence = 0.92;
    }
    // 3. token overlap
    else {
      const j = jaccard(stemTokens, r.title_tokens);
      if (j >= 0.66) { method = "token_overlap_strong"; confidence = j; }
      else if (j >= 0.45) { method = "token_overlap_medium"; confidence = j; }
    }

    if (!method) continue;

    // strict gate for smallwares: require at least one shared NON-smallware
    // distinguishing token (i.e., a name/brand token, not "fork"/"bowl"/etc.)
    if (isStrict) {
      const sharedNonGeneric = [...stemTokens].some(t =>
        r.title_tokens.has(t) && !SMALLWARE_TOKENS.has(t));
      if (!sharedNonGeneric) continue;
      // demand higher floor for smallwares
      if (confidence < 0.85) continue;
    }

    scored.push({ row: r, method, confidence });
  }

  scored.sort((a,b)=>b.confidence-a.confidence);
  return scored;
}

// Run matching
const fileMatches = []; // per-file decision
for (const file of manifest) {
  const cands = findMatchesForFile(file).slice(0, 5);
  const top = cands[0];
  let bucket;
  if (!top) bucket = "UNMATCHED";
  else if (top.confidence >= 0.95) bucket = "APPLY_SAFE";
  else if (top.confidence >= 0.85) bucket = "REVIEW";
  else bucket = "UNMATCHED";

  fileMatches.push({
    file: file.full_storage_path,
    public_url: file.public_url,
    folder: file.parent_folder,
    mapped_category: file.mapped_category,
    file_size: file.file_size,
    bucket,
    top_match: top ? {
      rms_id: top.row.id, slug: top.row.slug, title: top.row.title,
      category: top.row.category, method: top.method,
      confidence: +top.confidence.toFixed(3),
      already_has_image: top.row.hasImage,
      category_match: top.row.category === file.mapped_category,
    } : null,
    other_candidates: cands.slice(1).map(c => ({
      rms_id: c.row.id, slug: c.row.slug, title: c.row.title,
      method: c.method, confidence: +c.confidence.toFixed(3),
    })),
  });
}

// ----- STEP 4: group multi-image product candidates -----
const byRmsId = new Map();
for (const m of fileMatches) {
  if (!m.top_match || m.bucket === "UNMATCHED") continue;
  const id = m.top_match.rms_id;
  if (!byRmsId.has(id)) byRmsId.set(id, { rms_id: id, slug: m.top_match.slug, title: m.top_match.title, category: m.top_match.category, files: [] });
  byRmsId.get(id).files.push(m);
}

const productGroups = [...byRmsId.values()].map(g => {
  // primary heuristic: highest confidence, then "0" or no number suffix preferred,
  // then lowest numeric suffix
  const ranked = [...g.files].sort((a,b) => {
    const ca = a.top_match.confidence, cb = b.top_match.confidence;
    if (cb !== ca) return cb - ca;
    const na = parseInt(a.file.match(/\b(\d{1,2})\b\s*\.[a-z]+$/i)?.[1] ?? "9999",10);
    const nb = parseInt(b.file.match(/\b(\d{1,2})\b\s*\.[a-z]+$/i)?.[1] ?? "9999",10);
    return na - nb;
  });
  return {
    rms_id: g.rms_id, slug: g.slug, title: g.title, category: g.category,
    image_count: g.files.length,
    primary_image_url: ranked[0].public_url,
    gallery_image_urls: ranked.map(r => r.public_url),
    confidence: ranked[0].top_match.confidence,
    review_status: ranked[0].bucket,
  };
});

// ----- STEP 5: bucket outputs -----
const APPLY_SAFE = fileMatches.filter(m => m.bucket==="APPLY_SAFE" && !m.top_match.already_has_image);
const REVIEW     = fileMatches.filter(m => m.bucket==="REVIEW");
const UNMATCHED  = fileMatches.filter(m => m.bucket==="UNMATCHED");
const POTENTIAL_DUPLICATES = fileMatches.filter(m => m.bucket==="APPLY_SAFE" && m.top_match.already_has_image);
// CONFLICTS: files where top match already taken by another file at equal/higher confidence
const conflictMap = new Map();
for (const m of fileMatches) {
  if (!m.top_match) continue;
  const id = m.top_match.rms_id;
  if (!conflictMap.has(id)) conflictMap.set(id, []);
  conflictMap.get(id).push(m);
}
const CONFLICTS = [];
for (const [id, ms] of conflictMap) {
  if (ms.length > 1) {
    // if the assigned product has many files but they're across folders/categories, flag it
    const folders = new Set(ms.map(m => m.folder));
    if (folders.size > 1) CONFLICTS.push({ rms_id: id, files: ms });
  }
}
const CATEGORY_MISMATCHES = fileMatches.filter(m =>
  m.top_match && m.mapped_category && m.top_match.category &&
  m.mapped_category !== m.top_match.category &&
  m.bucket !== "UNMATCHED");

// STILL_IMAGELESS = RMS rows that had no image AND are not picked up here
const matchedIds = new Set([...byRmsId.keys()]);
const STILL_IMAGELESS = rmsRows
  .filter(r => !r.hasImage && !matchedIds.has(r.id))
  .map(r => ({ rms_id: r.id, slug: r.slug, title: r.title, category: r.category }));

// Revised totals
const totalRmsRows = rmsRows.length;
const previouslyHadImage = rmsRows.filter(r => r.hasImage).length;
const newlyResolvable = [...byRmsId.keys()].filter(id => {
  const r = rmsRows.find(rr => rr.id===id);
  return r && !r.hasImage;
}).length;
const revisedWithImages = previouslyHadImage + newlyResolvable;
const revisedUnresolved = totalRmsRows - revisedWithImages;

// Top remaining missing categories
const missingByCat = new Map();
for (const r of STILL_IMAGELESS) missingByCat.set(r.category, (missingByCat.get(r.category)||0)+1);
const topMissingCats = [...missingByCat.entries()].sort((a,b)=>b[1]-a[1]);

// Write outputs
writeFileSync("scripts-tmp/reconcile-hard-files.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  totals: {
    folders_scanned: folderCounts.length,
    image_files: manifest.length,
    apply_safe: APPLY_SAFE.length,
    review: REVIEW.length,
    unmatched: UNMATCHED.length,
    still_imageless: STILL_IMAGELESS.length,
    potential_duplicates: POTENTIAL_DUPLICATES.length,
    conflicts: CONFLICTS.length,
    category_mismatches: CATEGORY_MISMATCHES.length,
    rms_total: totalRmsRows,
    rms_previously_with_images: previouslyHadImage,
    rms_revised_with_images: revisedWithImages,
    rms_revised_unresolved: revisedUnresolved,
    product_groups: productGroups.length,
  },
  folder_counts: folderCounts,
  product_groups: productGroups.slice(0, 50),  // sample
  top_missing_categories: topMissingCats,
}, null, 2));

writeFileSync("scripts-tmp/apply-safe-hard-files.json", JSON.stringify(APPLY_SAFE, null, 2));
writeFileSync("scripts-tmp/review-hard-files.json",     JSON.stringify(REVIEW, null, 2));
writeFileSync("scripts-tmp/unmatched-hard-files.json",  JSON.stringify(UNMATCHED, null, 2));
writeFileSync("scripts-tmp/still-imageless-after-hard-files.json", JSON.stringify(STILL_IMAGELESS, null, 2));
writeFileSync("scripts-tmp/potential-duplicates-hard-files.json",  JSON.stringify(POTENTIAL_DUPLICATES, null, 2));
writeFileSync("scripts-tmp/category-mismatches-hard-files.json",   JSON.stringify(CATEGORY_MISMATCHES, null, 2));

// summary text
const sum = [
  "# Hard-file reconciliation summary  (READ-ONLY)",
  `Generated: ${new Date().toISOString()}`, "",
  "## STEP 1 — Storage manifest",
  `Total folders scanned: ${folderCounts.length}`,
  `Total image files:     ${manifest.length}`,
  "",
  "Folder counts (mapped category, certainty):",
  ...folderCounts.map(f =>
    `  ${f.folder.padEnd(14)} ${String(f.image_count).padStart(4)}  →  ${(f.mapped_category||"-").padEnd(16)} [${f.category_certainty}]   ${(f.total_bytes/1e6).toFixed(1)} MB`),
  "",
  "## STEP 5 — Result buckets",
  `APPLY_SAFE_HARD_FILES:       ${APPLY_SAFE.length}`,
  `REVIEW_HARD_FILES:           ${REVIEW.length}`,
  `UNMATCHED_HARD_FILES:        ${UNMATCHED.length}`,
  `STILL_IMAGELESS:             ${STILL_IMAGELESS.length}`,
  `POTENTIAL_DUPLICATES:        ${POTENTIAL_DUPLICATES.length}`,
  `CONFLICTS:                   ${CONFLICTS.length}`,
  `CATEGORY_MISMATCHES:         ${CATEGORY_MISMATCHES.length}`,
  "",
  "## RMS coverage (revised)",
  `RMS rows total:                            ${totalRmsRows}`,
  `RMS rows previously with images:           ${previouslyHadImage}`,
  `RMS rows newly resolvable (this pass):     ${newlyResolvable}`,
  `RMS rows revised WITH images:              ${revisedWithImages}`,
  `RMS rows still UNRESOLVED:                 ${revisedUnresolved}`,
  "",
  "## Top remaining missing categories",
  ...topMissingCats.map(([c,n]) => `  ${(c||"(none)").padEnd(20)} ${n}`),
  "",
  "## Files written",
  "  scripts-tmp/storage-filetree-manifest.json",
  "  scripts-tmp/storage-filetree-manifest.txt",
  "  scripts-tmp/storage-folder-counts.json",
  "  scripts-tmp/storage-folder-counts.txt",
  "  scripts-tmp/reconcile-hard-files.json",
  "  scripts-tmp/reconcile-hard-files-summary.txt  (this file)",
  "  scripts-tmp/apply-safe-hard-files.json",
  "  scripts-tmp/review-hard-files.json",
  "  scripts-tmp/unmatched-hard-files.json",
  "  scripts-tmp/still-imageless-after-hard-files.json",
  "  scripts-tmp/potential-duplicates-hard-files.json",
  "  scripts-tmp/category-mismatches-hard-files.json",
  "",
  "NOTE: nothing has been written to the database, no images mirrored, no",
  "bindings overwritten, no rebake performed. Review APPLY_SAFE before",
  "any apply pass.",
].join("\n");
writeFileSync("scripts-tmp/reconcile-hard-files-summary.txt", sum);

console.log(sum);

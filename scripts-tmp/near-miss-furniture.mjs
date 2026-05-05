#!/usr/bin/env node
// NEAR_MISS_FURNITURE_PASS — recover unmatched Squarespace site products
// against unmatched/review RMS rows in furniture-class categories only.
// READ-ONLY. Writes scripts-tmp/reconcile-near-miss-furniture.json + summary.

import fs from 'node:fs';

const SITE = JSON.parse(fs.readFileSync('scripts-tmp/owner-site-products.json', 'utf8'));
const MANIFEST = JSON.parse(fs.readFileSync('scripts-tmp/image-binding-manifest.json', 'utf8'));
const REVIEW = JSON.parse(fs.readFileSync('scripts-tmp/reconcile-review-required.json', 'utf8'));
const UNMATCHED_SITE = JSON.parse(fs.readFileSync('scripts-tmp/reconcile-unmatched-site.json', 'utf8'));
const RMS_ROWS = fs.readFileSync('/tmp/rms_items.tsv', 'utf8')
  .split('\n').filter(Boolean)
  .map((l) => { const [rms_id, title, category] = l.split('\t'); return { rms_id, title, category }; });

// ---- Scope ----
const FURNITURE_CATS = new Set(['bars', 'tables', 'seating', 'lounge', 'lighting', 'rugs', 'storage', 'large-decor']);
// Site category_path -> RMS category (best-effort mapping; only furniture-side matters)
const SITE_TO_RMS_CAT = {
  'cocktail-bar': 'bars',
  'lounge-tables': 'tables',
  'dining': 'tables',
  'lounge': 'lounge',
  'seating': 'seating',
  'light': 'lighting',
  'rugs': 'rugs',
  'large-decor': 'large-decor',
  'storage': 'storage',
};

const boundIds = new Set(Object.keys(MANIFEST.bindings || {}));

// Site products still unmatched (use reconcile-unmatched-site.json scope)
const unmatchedSite = UNMATCHED_SITE.filter((u) => {
  const rmsCat = SITE_TO_RMS_CAT[u.site_category_path];
  return FURNITURE_CATS.has(rmsCat);
});

// All RMS rows in furniture cats — even already-bound rows can show up
// as the correct site->rms mapping (in which case we report binding state
// so reviewer can decide whether new images replace/extend the gallery).
const reviewByRms = new Map(REVIEW.map((r) => [r.product_id, r]));
const candidateRms = RMS_ROWS.filter((r) => FURNITURE_CATS.has(r.category));

// ---- Normalization ----
const FILLER_DESCRIPTORS = new Set([
  'cast', 'stone', 'oak', 'weathered', 'flat', 'slat', 'slatted', 'mesh', 'bamboo',
  'wood', 'wooden', 'marble', 'antique', 'top', 'with', 'and', '&amp;', '&', 'the',
  'silk', 'cotton', 'linen', 'velvet', 'leather', 'metal', 'brass', 'gold', 'iron',
  'birch', 'concrete', 'acrylic', 'glass', 'whitewash', 'whitewashed', 'black', 'white',
  'grey', 'gray', 'natural', 'light', 'dark', 'small', 'large', 'medium', 'mini', 'big',
  'finish', 'finished', 'tone', 'toned', 'style', 'styled', 'modern', 'rustic',
  'convertible', 'square', 'round', 'rectangular', 'tambour', 'ceramic',
]);
const SIZE_TOKEN_RE = /(\d+(?:\.\d+)?\s*(?:'|ft|feet|"|in|inch|cm|m)\b|\b\d+\b)/gi;

function decodeEntities(s) { return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'); }
function normalizeFeetInches(s) {
  return s
    .replace(/(\d)\s*(?:feet|ft|′|’)/gi, "$1'")
    .replace(/(\d)\s*(?:inches|inch|in|″|”)/gi, '$1"');
}
function tokenize(title) {
  const decoded = decodeEntities(title || '').toLowerCase();
  const norm = normalizeFeetInches(decoded);
  const sizes = (norm.match(SIZE_TOKEN_RE) || []).map((t) => t.replace(/\s+/g, '').toLowerCase());
  const stripped = norm
    .replace(SIZE_TOKEN_RE, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = stripped.split(' ').filter(Boolean);
  const family = words.filter((w) => !FILLER_DESCRIPTORS.has(w));
  const fillers = words.filter((w) => FILLER_DESCRIPTORS.has(w));
  return { all: words, family, fillers, sizes: new Set(sizes), familyKey: family.join(' ') };
}

// ---- Matching ----
function scorePair(siteTok, rmsTok) {
  if (!siteTok.family.length || !rmsTok.family.length) return null;
  // Family head must match (first family word, typically the product name like "boulder", "iraja")
  const siteHead = siteTok.family[0];
  const rmsHead = rmsTok.family[0];
  if (siteHead !== rmsHead) return null;

  const siteFam = new Set(siteTok.family);
  const rmsFam = new Set(rmsTok.family);
  const inter = [...siteFam].filter((w) => rmsFam.has(w)).length;
  const union = new Set([...siteFam, ...rmsFam]).size;
  const jaccard = inter / union;

  // Allow up to one missing filler descriptor on either side; family heads must match.
  const onlyDiffs = [...new Set([...siteFam, ...rmsFam])].filter((w) => !(siteFam.has(w) && rmsFam.has(w)));

  // Size compatibility: if both sides have sizes, at least one shared
  const siteSz = siteTok.sizes;
  const rmsSz = rmsTok.sizes;
  let sizeCompat = true;
  if (siteSz.size && rmsSz.size) {
    sizeCompat = [...siteSz].some((s) => rmsSz.has(s));
  }

  return { jaccard, familyDiff: onlyDiffs.length, sizeCompat, siteHead };
}

const records = [];
const usedRms = new Set();
const usedSite = new Set();

// Sort site by category then title for determinism
unmatchedSite.sort((a, b) => (a.site_category_path + a.site_title).localeCompare(b.site_category_path + b.site_title));

for (const s of unmatchedSite) {
  const rmsCat = SITE_TO_RMS_CAT[s.site_category_path];
  const sTok = tokenize(s.site_title);
  if (!sTok.family.length) continue;

  // Candidate RMS rows in same RMS category, same family head, not already bound
  const cands = candidateRms
    .filter((r) => r.category === rmsCat && !usedRms.has(r.rms_id))
    .map((r) => ({ r, tok: tokenize(r.title) }))
    .filter((c) => c.tok.family[0] === sTok.family[0])
    .map((c) => ({ ...c, score: scorePair(sTok, c.tok) }))
    .filter((c) => c.score && c.score.sizeCompat)
    .sort((a, b) => b.score.jaccard - a.score.jaccard);

  if (!cands.length) {
    records.push({
      site_title: s.site_title,
      site_category: s.site_category_path,
      site_slug: s.site_slug,
      rms_product_id: null,
      rms_title: null,
      rms_category: rmsCat || null,
      match_reason: 'no candidate with matching family head in same category',
      confidence: 'none',
      image_count: 0,
      recommended_action: 'REJECTED_NEAR_MISS',
    });
    continue;
  }

  // Find site product entry to get image count
  const siteProduct = SITE.find((p) => p.detail_url === s.detail_url);
  const imageCount = siteProduct ? siteProduct.cdn_image_urls.length : 0;

  // Multiple equally-strong candidates -> review (variant-family or ambiguous)
  const top = cands[0];
  const peers = cands.filter((c) => Math.abs(c.score.jaccard - top.score.jaccard) < 0.05);

  const variantFamily = peers.length > 1 && rmsCat === 'bars';
  let action = 'REVIEW_NEAR_MISS';
  let confidence = 'medium';
  let reason = `family head "${top.score.siteHead}" matches; jaccard=${top.score.jaccard.toFixed(2)}; family diff=${top.score.familyDiff}`;

  if (peers.length === 1 && top.score.familyDiff <= 2 && top.score.jaccard >= 0.4) {
    action = 'APPLY_SAFE_NEAR_MISS';
    confidence = top.score.familyDiff <= 1 ? 'high' : 'medium';
  } else if (variantFamily) {
    // Variant-family binding for bars: Single/Double/Triple
    action = 'APPLY_SAFE_NEAR_MISS';
    confidence = 'medium';
    reason += ` (variant-family binding across ${peers.length} bar variants)`;
  } else if (peers.length > 1) {
    reason += ` (ambiguous: ${peers.length} equally-scored candidates)`;
  }

  // CSV filename / Squarespace conflict checks (Iraja / Gideon-style)
  const reviewEntry = peers.flatMap((p) => reviewByRms.get(p.r.rms_id) ? [reviewByRms.get(p.r.rms_id)] : []);
  const csvFilenames = reviewEntry.map((e) => e.rms_image_filename).filter(Boolean);
  let flagged = false;
  for (const fn of csvFilenames) {
    const fnNorm = fn.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (fnNorm.length && !fnNorm.some((w) => sTok.family.includes(w) || w.startsWith(top.score.siteHead.slice(0, 3)))) {
      flagged = true;
      reason += ` (FLAG: CSV filename "${fn}" disagrees with site title)`;
      action = 'REVIEW_NEAR_MISS';
    }
  }

  // If recommended candidate is already bound, downgrade to REVIEW
  // (we don't auto-overwrite an existing high-confidence binding).
  const anyAlreadyBound = peers.some((p) => boundIds.has(p.r.rms_id));
  if (action === 'APPLY_SAFE_NEAR_MISS' && anyAlreadyBound) {
    action = 'REVIEW_NEAR_MISS';
    reason += ` (target already bound — would replace existing images, send to review)`;
  }

  if (action === 'APPLY_SAFE_NEAR_MISS') {
    for (const p of peers) usedRms.add(p.r.rms_id);
    usedSite.add(s.detail_url);
  }

  for (const p of peers) {
    records.push({
      site_title: s.site_title,
      site_category: s.site_category_path,
      site_slug: s.site_slug,
      detail_url: s.detail_url,
      rms_product_id: p.r.rms_id,
      rms_title: p.r.title,
      rms_category: p.r.category,
      rms_already_bound: boundIds.has(p.r.rms_id),
      rms_existing_image_count: boundIds.has(p.r.rms_id) ? (MANIFEST.bindings[p.r.rms_id].all_images?.length ?? 0) : 0,
      match_reason: reason,
      confidence,
      image_count: imageCount,
      recommended_action: action,
      variant_family: variantFamily,
      flagged,
    });
  }
}

// ---- Stats / revised totals ----
const safeCount = records.filter((r) => r.recommended_action === 'APPLY_SAFE_NEAR_MISS').length;
const reviewCount = records.filter((r) => r.recommended_action === 'REVIEW_NEAR_MISS').length;
const rejectCount = records.filter((r) => r.recommended_action === 'REJECTED_NEAR_MISS').length;
const newSafeRmsRows = new Set(records.filter((r) => r.recommended_action === 'APPLY_SAFE_NEAR_MISS').map((r) => r.rms_product_id)).size;

const prevApply = 484, prevReview = 349;
const revisedApply = prevApply + newSafeRmsRows;
const revisedReview = prevReview - newSafeRmsRows;
const prevImageless = 835 - 713; // 122
const revisedImageless = Math.max(0, prevImageless - newSafeRmsRows);
const remainingUnmatchedSite = unmatchedSite.length - new Set(records.filter((r) => r.recommended_action === 'APPLY_SAFE_NEAR_MISS').map((r) => r.detail_url)).size;
const flaggedConflicts = records.filter((r) => r.flagged).length;

const out = {
  generated_at: new Date().toISOString(),
  scope: {
    furniture_categories: [...FURNITURE_CATS],
    excluded: ['tableware', 'serveware', 'styling', 'pillows-throws', 'candlelight', 'chandeliers', 'furs-pelts'],
    site_unmatched_in_scope: unmatchedSite.length,
    rms_unmatched_in_scope: candidateRms.length,
  },
  counts: {
    APPLY_SAFE_NEAR_MISS: safeCount,
    REVIEW_NEAR_MISS: reviewCount,
    REJECTED_NEAR_MISS: rejectCount,
    new_safe_rms_rows: newSafeRmsRows,
    flagged_conflicts: flaggedConflicts,
  },
  revised_totals: {
    apply_safe_combined: revisedApply,
    review_required: revisedReview,
    imageless_rms_rows: revisedImageless,
    remaining_unmatched_site_in_scope: remainingUnmatchedSite,
  },
  records,
};

fs.writeFileSync('scripts-tmp/reconcile-near-miss-furniture.json', JSON.stringify(out, null, 2));

const summary = `NEAR_MISS_FURNITURE_PASS — ${out.generated_at}

Scope (furniture-class only):
  site unmatched in scope: ${unmatchedSite.length}
  rms unmatched in scope:  ${candidateRms.length}
  excluded: tableware, serveware, styling, pillows-throws, candlelight, chandeliers, furs-pelts

Bucketed records:
  APPLY_SAFE_NEAR_MISS: ${safeCount} site->rms records
  REVIEW_NEAR_MISS:     ${reviewCount}
  REJECTED_NEAR_MISS:   ${rejectCount}
  new safe rms rows:    ${newSafeRmsRows}
  new flagged conflicts:${flaggedConflicts}

Revised combined totals (no DB writes performed):
  APPLY_SAFE total:        ${prevApply} -> ${revisedApply}
  REVIEW_REQUIRED total:   ${prevReview} -> ${revisedReview}
  Imageless RMS rows:      ${prevImageless} -> ${revisedImageless}
  Remaining unmatched site (in furniture scope): ${remainingUnmatchedSite}

Flagged conflicts (CSV filename disagrees with site title): ${flaggedConflicts}
`;
fs.writeFileSync('scripts-tmp/reconcile-near-miss-furniture.txt', summary);
console.log(summary);

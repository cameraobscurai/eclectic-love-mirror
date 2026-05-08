#!/usr/bin/env node
/**
 * Three-signal color tagger for inventory items.
 *
 *   Signal A — title prior:   curated lexicon (scripts/lib/title-color-prior.mjs)
 *   Signal B — pixel extract: sharp + corner-bg masked k-means
 *   Signal C — AI vision:     Lovable AI Gateway (gemini-3-flash-preview),
 *                              few-shot prompt, structured tool-calling
 *
 * Reconcile:
 *   - If title prior fires (≥0.75) AND pixel OR AI agrees on family →
 *     write title family. Pull L*/hex from the agreeing signal.
 *   - If title prior fires but neither pixel nor AI agrees → write title
 *     family with AI hex; mark color_needs_review=true.
 *   - If title prior is null/low → fall back to AI family.
 *   - For patterned items (title prior isPattern OR AI family=multi):
 *     write color_hex (dominant) + color_hex_secondary.
 *
 * Pixel signal is suppressed when the hero is a cutout/seamless background
 * (>60% of pixels match the corner reference) — the corner mask eats the
 * product and the result is meaningless.
 *
 * Default mode is DRY-RUN — writes /tmp/color-tag-manifest.json and exits.
 * Pass --apply to write to inventory_items. Skips rows where color_locked=true
 * and rows where color_tagged_at is non-null (pass --retag to override).
 *
 *   bun scripts/tag-colors.mjs                                  # dry-run, all eligible
 *   bun scripts/tag-colors.mjs --category=pillows-throws        # scope to one category
 *   bun scripts/tag-colors.mjs --limit 10                       # dry-run, first 10
 *   bun scripts/tag-colors.mjs --apply                          # commit results
 *   bun scripts/tag-colors.mjs --retag --slug some-product      # force re-tag one row
 *
 * After --apply, runs a self-validation pass that exits non-zero if family
 * distribution looks broken (e.g. AI overrode title >15% of the time, or a
 * family's L* range spans >70 covering dark→light).
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import { titleColorPrior } from './lib/title-color-prior.mjs';

const args = process.argv.slice(2);
const APPLY  = args.includes('--apply');
const RETAG  = args.includes('--retag');
const LIMIT  = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i+1]) : null; })();
const ONLY_SLUG = (() => { const i = args.indexOf('--slug'); return i >= 0 ? args[i+1] : null; })();
const CATEGORY  = (() => {
  const flag = args.find(a => a.startsWith('--category='));
  if (flag) return flag.split('=')[1];
  const i = args.indexOf('--category');
  return i >= 0 ? args[i+1] : null;
})();
const CONCURRENCY = 4;

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.LOVABLE_API_KEY;
if (!SB_URL || !SB_KEY) { console.error('SUPABASE_URL / SERVICE_ROLE_KEY required'); process.exit(1); }
if (!AI_KEY) { console.error('LOVABLE_API_KEY required'); process.exit(1); }

const sb = createClient(SB_URL, SB_KEY);

// ---------- color math ----------
function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
function rgbToLab([r,g,b]) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = (R*0.4124 + G*0.3576 + B*0.1805) / 0.95047;
  const Y = (R*0.2126 + G*0.7152 + B*0.0722) / 1.00000;
  const Z = (R*0.0193 + G*0.1192 + B*0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787*t + 16/116;
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116*fy - 16, 500*(fx-fy), 200*(fy-fz)];
}
function labDeltaE([L1,a1,b1],[L2,a2,b2]) {
  return Math.sqrt((L1-L2)**2 + (a1-a2)**2 + (b1-b2)**2);
}
function labToLch([L,a,b]) {
  const C = Math.sqrt(a*a + b*b);
  let H = Math.atan2(b,a) * 180/Math.PI; if (H<0) H+=360;
  return [L, C, H];
}
function hexFromRgb([r,g,b]) {
  return '#' + [r,g,b].map(x => Math.round(x).toString(16).padStart(2,'0')).join('');
}
function rgbFromHex(hex) {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

// Map a hex to one of the 16 families using L*/C/H — used to compare AI/pixel
// against the title prior's family.
function familyFromLab([L,a,b]) {
  const C = Math.sqrt(a*a + b*b);
  let H = Math.atan2(b,a) * 180/Math.PI; if (H<0) H+=360;
  // Neutrals: low chroma → split by lightness.
  if (C < 8) {
    if (L < 18) return 'black';
    if (L < 35) return 'charcoal';
    if (L < 75) return 'grey';
    if (L < 92) return 'cream';
    return 'white';
  }
  // Low-chroma warm browns/tans
  if (C < 22 && a > 0) {
    if (L < 35) return 'brown';
    if (L < 65) return 'tan';
    return 'cream';
  }
  // Chromatic — bucket by hue, then split warm/cool browns
  if (H >= 20 && H < 50) {
    // orange/brown band
    if (L < 35) return 'brown';
    if (L < 60 && C < 35) return 'tan';
    return 'orange';
  }
  if (H >= 50 && H < 75) return 'yellow';
  if (H >= 75 && H < 165) return 'green';
  if (H >= 165 && H < 260) return 'blue';
  if (H >= 260 && H < 320) return 'purple';
  if (H >= 320 || H < 10) return L < 60 ? 'red' : 'pink';
  if (H >= 10 && H < 20) return 'red';
  return 'multi';
}

// ---------- pixel extract ----------
async function pixelExtract(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf).resize(96, 96, { fit: 'inside' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const corner = (x,y) => [data[(y*W+x)*3], data[(y*W+x)*3+1], data[(y*W+x)*3+2]];
  const corners = [corner(0,0), corner(W-1,0), corner(0,H-1), corner(W-1,H-1)];
  const cornerLabs = corners.map(rgbToLab);
  const EDGE = 4;
  const buckets = new Map();
  let totalKept = 0, totalSeen = 0;
  for (let y = EDGE; y < H-EDGE; y++) {
    for (let x = EDGE; x < W-EDGE; x++) {
      totalSeen++;
      const i = (y*W+x)*3;
      const rgb = [data[i], data[i+1], data[i+2]];
      const lab = rgbToLab(rgb);
      let isBg = false;
      for (const cl of cornerLabs) { if (labDeltaE(lab, cl) < 8) { isBg = true; break; } }
      if (isBg) continue;
      totalKept++;
      // 5-bit quantization (32 levels/channel) so champagne ≠ ivory.
      const qx = (rgb[0]>>3)<<3, qy = (rgb[1]>>3)<<3, qz = (rgb[2]>>3)<<3;
      const k = `${qx},${qy},${qz}`;
      const cur = buckets.get(k) || { sum:[0,0,0], count:0 };
      cur.sum[0]+=rgb[0]; cur.sum[1]+=rgb[1]; cur.sum[2]+=rgb[2]; cur.count++;
      buckets.set(k, cur);
    }
  }
  // Cutout/seamless detection: if <40% of pixels survived corner masking,
  // the product itself was eaten by the mask. Suppress this signal.
  const keepRatio = totalSeen > 0 ? totalKept / totalSeen : 0;
  if (keepRatio < 0.4 || buckets.size === 0) {
    return { suppressed: true, reason: 'cutout-or-seamless', keepRatio };
  }
  const sorted = Array.from(buckets.values()).sort((a,b) => b.count - a.count);
  const top = sorted[0];
  const avg = top.sum.map(s => s/top.count);
  return { suppressed: false, rgb: avg, hex: hexFromRgb(avg), pixelCount: top.count, keepRatio };
}

// ---------- AI vision ----------
const FAMILIES = ['black','charcoal','grey','brown','tan','cream','white','red','orange','yellow','green','blue','purple','pink','metallic-warm','metallic-cool','multi'];
const TOOL_SCHEMA = {
  type: 'function',
  function: {
    name: 'tag_color',
    description: 'Return the dominant material color of the primary object.',
    parameters: {
      type: 'object',
      properties: {
        hex: { type: 'string', description: 'Primary color as #rrggbb' },
        hex_secondary: { type: 'string', description: 'Secondary color hex if patterned/multi' },
        family: { type: 'string', enum: FAMILIES },
        temperature: { type: 'string', enum: ['warm','neutral','cool'] },
        confidence: { type: 'number', description: '0..1' },
        title_color_word: { type: 'string', description: 'The first color word in the title, or empty if none' },
        overrode_title: { type: 'boolean', description: 'true if you chose a family different from the title color word' },
        reasoning: { type: 'string' },
      },
      required: ['hex','family','temperature','confidence','overrode_title'],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are a textile and furniture stylist tagging items for a tonal merchandising grid that sorts darkest → lightest.

RULES:
1. Identify the MATERIAL color of the primary object (upholstery, wood, ceramic, metal, fur). Ignore background, props, shadows, reflections, packaging.
2. The FIRST color word in the product title names the dominant tone unless visually impossible. Override only with strong evidence and explain in 'reasoning'. Set 'overrode_title': true when you do.
3. For patterned items (plaid, stripe, leopard, mud cloth, geo print, etc.), return the color that covers the largest area as 'hex' and the next-largest as 'hex_secondary'. Pick a single family for 'family' — only use 'multi' if no single tone covers >50% AND there is no clear primary color word in the title.

REFERENCE EXAMPLES:
- "Ivory Black Geo Print Pillow" → family=cream, hex=ivory tone, hex_secondary=black tone (ivory dominates the field, black is the geo print)
- "Brown Cognac Leather Lumbar" → family=brown, hex=cognac brown
- "Champagne Crushed Velvet Pillow" → family=tan (champagne is a warm light tan, NOT cream/ivory)
- "Black White Abstract Fur Pillow" → family=black, hex=black, hex_secondary=white (black-first means black dominates)
- "Greige Textured Lumbar" → family=tan (greige is a warm grey-beige)
- "Leopard Fur Pillow" → family=tan (leopard base is tan, not multi — pattern words alone don't trigger multi)
- "Alpaca Linear Grey/Black Throw" → family=grey (first color wins on slash-separated lists)`;

async function aiVision(imageUrl, title, prior) {
  const userText = prior.primaryWord
    ? `Tag the dominant material color of: "${title}"\n\nThe first color word in this title is: "${prior.primaryWord}". Unless you have strong visual evidence otherwise, family should reflect this word.`
    : `Tag the dominant material color of: "${title}"\n\nThe title contains no recognized color word — judge purely from the image.`;
  const body = {
    model: 'google/gemini-3-flash-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: imageUrl } },
      ]},
    ],
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'function', function: { name: 'tag_color' } },
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.status === 429) { await new Promise(r => setTimeout(r, 2000 * (attempt+1))); continue; }
    if (r.status === 402) throw new Error('Lovable AI credits exhausted');
    if (!r.ok) { const t = await r.text(); throw new Error(`AI ${r.status}: ${t.slice(0,200)}`); }
    const j = await r.json();
    const tc = j.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error('no tool call in response');
    return JSON.parse(tc.function.arguments);
  }
  throw new Error('rate-limited after retries');
}

// ---------- per-item pipeline ----------
async function processOne(row) {
  const heroUrl = (row.images && row.images[0]) ? row.images[0] : null;
  if (!heroUrl) return { rms_id: row.rms_id, slug: row.slug, title: row.title, skip: 'no-image' };

  const prior = titleColorPrior(row.title);
  let pixel = null, ai = null, error = null;
  try { pixel = await pixelExtract(heroUrl); } catch (e) { error = `pixel: ${e.message}`; }
  try { ai = await aiVision(heroUrl, row.title, prior); } catch (e) { error = (error ? error + '; ' : '') + `ai: ${e.message}`; }
  if (!ai) return { rms_id: row.rms_id, slug: row.slug, title: row.title, error };

  const aiRgb = rgbFromHex(ai.hex);
  const aiLab = rgbToLab(aiRgb);
  const aiFamily = ai.family;

  const pixelUsable = pixel && !pixel.suppressed;
  const pixelLab = pixelUsable ? rgbToLab(pixel.rgb) : null;
  const pixelFamily = pixelLab ? familyFromLab(pixelLab) : null;
  const deltaE = pixelLab ? labDeltaE(aiLab, pixelLab) : null;

  // ---- Reconcile ----
  let chosenFamily, chosenHex, chosenLab, source, needsReview = false, reason = '';
  let confidence = ai.confidence ?? 0.7;

  if (prior.primaryFamily && prior.confidence >= 0.75) {
    const aiAgrees = aiFamily === prior.primaryFamily;
    const pixelAgrees = pixelFamily === prior.primaryFamily;
    if (aiAgrees || pixelAgrees) {
      chosenFamily = prior.primaryFamily;
      // Take hex from whichever signal agreed; prefer AI for chromatic accuracy.
      if (aiAgrees) { chosenHex = ai.hex; chosenLab = aiLab; source = 'merged'; }
      else { chosenHex = pixel.hex; chosenLab = pixelLab; source = 'pixel-extract'; }
      reason = `title=${prior.primaryWord} agreed by ${aiAgrees?'ai':''}${aiAgrees&&pixelAgrees?'+':''}${pixelAgrees?'pixel':''}`;
    } else {
      // Title fired but neither corroborated — trust title for family, AI for hex.
      chosenFamily = prior.primaryFamily;
      chosenHex = ai.hex;
      chosenLab = aiLab;
      source = 'merged';
      needsReview = true;
      confidence *= 0.6;
      reason = `title=${prior.primaryWord} disagreed by ai=${aiFamily}${pixelFamily?` pixel=${pixelFamily}`:''}`;
    }
  } else {
    // No title prior — fall back to AI.
    chosenFamily = aiFamily;
    chosenHex = ai.hex;
    chosenLab = aiLab;
    source = 'ai-vision';
    if (pixelLab && deltaE !== null) {
      if (deltaE >= 25) { needsReview = true; confidence *= 0.5; reason = `no title, ΔE=${deltaE.toFixed(1)}`; }
    }
  }

  const [L, C, H] = labToLch(chosenLab);
  // Secondary hex when patterned or AI returned multi.
  const secondaryHex = (prior.isPattern || aiFamily === 'multi') ? (ai.hex_secondary || null) : null;

  return {
    rms_id: row.rms_id,
    slug: row.slug,
    title: row.title,
    heroUrl,
    prior,
    ai_family: aiFamily,
    ai_hex: ai.hex,
    ai_overrode_title: ai.overrode_title,
    ai_reasoning: ai.reasoning,
    pixel_family: pixelFamily,
    pixel_suppressed: pixel?.suppressed || false,
    pixel_suppressed_reason: pixel?.reason || null,
    deltaE,
    decision_reason: reason,
    write: {
      color_hex: chosenHex,
      color_hex_secondary: secondaryHex,
      color_lightness: Number(L.toFixed(2)),
      color_chroma: Number(C.toFixed(2)),
      color_hue: C < 8 ? null : Number(H.toFixed(2)),
      color_family: chosenFamily,
      color_temperature: ai.temperature,
      color_confidence: Number(confidence.toFixed(3)),
      color_source: source,
      color_needs_review: needsReview,
      color_tagged_at: new Date().toISOString(),
    },
  };
}

// ---------- main ----------
let q = sb.from('inventory_items')
  .select('rms_id,slug,title,category,images,color_tagged_at,color_locked')
  .neq('status','draft')
  .eq('color_locked', false);
if (CATEGORY)  q = q.eq('category', CATEGORY);
if (!RETAG)    q = q.is('color_tagged_at', null);
if (ONLY_SLUG) q = q.eq('slug', ONLY_SLUG);
if (LIMIT)     q = q.limit(LIMIT);

const { data: rows, error } = await q;
if (error) { console.error(error); process.exit(1); }
const eligible = rows.filter(r => r.images && r.images.length > 0);
console.log(`[tag-colors] eligible: ${eligible.length} / ${rows.length}  category=${CATEGORY||'(all)'}  apply=${APPLY}  retag=${RETAG}`);

const results = [];
let idx = 0;
async function worker() {
  while (idx < eligible.length) {
    const i = idx++;
    const row = eligible[i];
    try {
      const r = await processOne(row);
      results.push(r);
      const tag = r.skip
        ? `SKIP(${r.skip})`
        : r.error
        ? `ERR(${r.error.slice(0,40)})`
        : `${r.write.color_family.padEnd(14)} L=${r.write.color_lightness.toFixed(1).padStart(5)} prior=${r.prior?.primaryFamily||'-'} ai=${r.ai_family} ${r.ai_overrode_title?'⨯':''}${r.write.color_needs_review?' ⚠':''}`;
      console.log(`[${(i+1).toString().padStart(4,' ')}/${eligible.length}] ${row.title.slice(0,42).padEnd(42,' ')} ${tag}`);
    } catch (e) {
      results.push({ rms_id: row.rms_id, slug: row.slug, title: row.title, error: e.message });
      console.error(`[${i+1}/${eligible.length}] ${row.title}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 250));
  }
}
await Promise.all(Array.from({length: CONCURRENCY}, worker));

// ---------- self-validation ----------
function selfValidate(rs) {
  const ok = rs.filter(r => r.write);
  const byFamily = new Map();
  for (const r of ok) {
    const f = r.write.color_family;
    if (!byFamily.has(f)) byFamily.set(f, []);
    byFamily.get(f).push(r);
  }
  const overrides = ok.filter(r => r.ai_overrode_title).length;
  const overrideRate = ok.length ? overrides / ok.length : 0;
  const pixelSuppressed = ok.filter(r => r.pixel_suppressed).length;
  const needsReview = ok.filter(r => r.write.color_needs_review).length;

  const familyReport = Array.from(byFamily.entries()).map(([fam, items]) => {
    const Ls = items.map(r => r.write.color_lightness);
    const minL = Math.min(...Ls), maxL = Math.max(...Ls);
    const samples = items.slice(0, 3).map(r => r.title);
    return { family: fam, count: items.length, lRange: [minL.toFixed(1), maxL.toFixed(1)], lSpread: +(maxL-minL).toFixed(1), samples };
  }).sort((a,b) => b.count - a.count);

  const anomalies = [];
  // Family spread anomaly: a single family covering >70 L*.
  for (const f of familyReport) {
    if (f.count >= 5 && f.lSpread > 70) {
      anomalies.push(`family "${f.family}" has L* spread ${f.lSpread} (${f.count} items) — likely mistagged outliers`);
    }
  }
  // AI override rate anomaly.
  if (overrideRate > 0.15) {
    anomalies.push(`AI overrode title family on ${(overrideRate*100).toFixed(1)}% of items (>${15}% threshold) — title prior may be misaligned with AI`);
  }
  return { familyReport, overrideRate, overrides, pixelSuppressed, needsReview, anomalies };
}

const validation = selfValidate(results);

const manifest = {
  generatedAt: new Date().toISOString(),
  apply: APPLY,
  category: CATEGORY,
  total: results.length,
  successful: results.filter(r => r.write).length,
  needsReview: validation.needsReview,
  errors: results.filter(r => r.error).length,
  validation,
  results,
};
fs.writeFileSync('/tmp/color-tag-manifest.json', JSON.stringify(manifest, null, 2));

console.log(`\n[manifest] /tmp/color-tag-manifest.json`);
console.log(`           ${manifest.successful} ok · ${manifest.needsReview} needsReview · ${manifest.errors} errors`);
console.log(`           AI overrode title on ${validation.overrides}/${manifest.successful} (${(validation.overrideRate*100).toFixed(1)}%)  ·  pixel suppressed: ${validation.pixelSuppressed}`);
console.log(`\n[family distribution]`);
for (const f of validation.familyReport) {
  console.log(`  ${f.family.padEnd(15)} ${f.count.toString().padStart(3)}  L* ${f.lRange[0].padStart(5)}–${f.lRange[1].padStart(5)}  e.g. ${f.samples.join(' · ')}`);
}
if (validation.anomalies.length) {
  console.log(`\n[ANOMALIES]`);
  for (const a of validation.anomalies) console.log('  ⚠ ' + a);
}

if (!APPLY) {
  console.log('\n[dry-run] no DB writes. Re-run with --apply to commit.');
  process.exit(0);
}

console.log('\n[apply] writing to inventory_items…');
let written = 0;
for (const r of results) {
  if (!r.write) continue;
  const { error } = await sb.from('inventory_items').update(r.write).eq('rms_id', r.rms_id);
  if (error) { console.error(`update ${r.rms_id}: ${error.message}`); continue; }
  written++;
}
console.log(`[apply] wrote ${written}/${manifest.successful} rows.`);

if (validation.anomalies.length) {
  console.error(`\n[self-check FAILED] ${validation.anomalies.length} anomalies — review manifest before baking.`);
  process.exit(2);
}
console.log(`\n[self-check OK] now run: bun scripts/bake-catalog.mjs`);

#!/usr/bin/env node
/**
 * Two-signal color tagger for inventory items.
 *
 *   Phase 1 — pixel extract: download hero image, mask edges + corner background,
 *             k-means top cluster via sharp.
 *   Phase 2 — AI vision:    Lovable AI Gateway, gemini-3-flash-preview, structured
 *             tool-calling for shape safety.
 *   Phase 3 — reconcile:    compare ΔE in CIELAB; flag if AI/pixel disagree.
 *
 * Default mode is DRY-RUN — writes /tmp/color-tag-manifest.json and exits.
 * Pass --apply to write to inventory_items. Skips rows where color_locked=true
 * and rows where color_tagged_at is non-null (pass --retag to override).
 *
 *   bun scripts/tag-colors.mjs                # dry-run, all untagged eligible rows
 *   bun scripts/tag-colors.mjs --limit 10     # dry-run, first 10
 *   bun scripts/tag-colors.mjs --apply        # commit results
 *   bun scripts/tag-colors.mjs --retag --slug some-product   # force re-tag one row
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';

const args = process.argv.slice(2);
const APPLY  = args.includes('--apply');
const RETAG  = args.includes('--retag');
const LIMIT  = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i+1]) : null; })();
const ONLY_SLUG = (() => { const i = args.indexOf('--slug'); return i >= 0 ? args[i+1] : null; })();
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

// ---------- pixel extract ----------
async function pixelExtract(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Resize to 96px wide for speed; raw RGBA pixels.
  const { data, info } = await sharp(buf).resize(96, 96, { fit: 'inside' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  // Sample 4 corners as background reference.
  const corner = (x,y) => [data[(y*W+x)*3], data[(y*W+x)*3+1], data[(y*W+x)*3+2]];
  const corners = [corner(0,0), corner(W-1,0), corner(0,H-1), corner(W-1,H-1)];
  const cornerLabs = corners.map(rgbToLab);
  // Mask: drop pixels matching any corner within ΔE<8, drop edge band of 4px.
  const EDGE = 4;
  const buckets = new Map(); // quantized hex → {sum:[r,g,b], count}
  for (let y = EDGE; y < H-EDGE; y++) {
    for (let x = EDGE; x < W-EDGE; x++) {
      const i = (y*W+x)*3;
      const rgb = [data[i], data[i+1], data[i+2]];
      const lab = rgbToLab(rgb);
      let isBg = false;
      for (const cl of cornerLabs) { if (labDeltaE(lab, cl) < 8) { isBg = true; break; } }
      if (isBg) continue;
      const qx = (rgb[0]>>4)<<4, qy = (rgb[1]>>4)<<4, qz = (rgb[2]>>4)<<4;
      const k = `${qx},${qy},${qz}`;
      const cur = buckets.get(k) || { sum:[0,0,0], count:0 };
      cur.sum[0]+=rgb[0]; cur.sum[1]+=rgb[1]; cur.sum[2]+=rgb[2]; cur.count++;
      buckets.set(k, cur);
    }
  }
  if (buckets.size === 0) return null;
  const sorted = Array.from(buckets.values()).sort((a,b) => b.count - a.count);
  const top = sorted[0];
  const avg = top.sum.map(s => s/top.count);
  return { rgb: avg, hex: hexFromRgb(avg), pixelCount: top.count };
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
        hex_secondary: { type: 'string', description: 'Optional secondary color hex for patterned/multi items' },
        family: { type: 'string', enum: FAMILIES },
        temperature: { type: 'string', enum: ['warm','neutral','cool'] },
        confidence: { type: 'number', description: '0..1' },
        reasoning: { type: 'string' },
      },
      required: ['hex','family','temperature','confidence'],
      additionalProperties: false,
    },
  },
};

async function aiVision(imageUrl, title) {
  const body = {
    model: 'google/gemini-3-flash-preview',
    messages: [
      { role: 'system', content: 'You are a textile and furniture stylist tagging items for a tonal merchandising grid. Identify the MATERIAL color of the primary object — upholstery, wood, ceramic, metal — that a designer would key off when styling. Ignore: background, props, shadows, reflections, packaging. If the item is patterned or multi-color and no single tone covers >50%, set family=multi and return both hex and hex_secondary.' },
      { role: 'user', content: [
        { type: 'text', text: `Tag the dominant material color of: ${title}` },
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
  let pixel = null, ai = null, error = null;
  try { pixel = await pixelExtract(heroUrl); } catch (e) { error = `pixel: ${e.message}`; }
  try { ai = await aiVision(heroUrl, row.title); } catch (e) { error = (error ? error + '; ' : '') + `ai: ${e.message}`; }
  if (!ai) return { rms_id: row.rms_id, slug: row.slug, title: row.title, error };

  const aiRgb = rgbFromHex(ai.hex);
  const aiLab = rgbToLab(aiRgb);
  const [L, C, H] = labToLch(aiLab);
  let deltaE = null, source = 'ai-vision', needsReview = false;
  let confidence = ai.confidence ?? 0.7;
  if (pixel) {
    deltaE = labDeltaE(aiLab, rgbToLab(pixel.rgb));
    if (deltaE < 10) { source = 'merged'; }
    else if (deltaE < 25) { needsReview = true; confidence *= 0.7; }
    else { needsReview = true; confidence *= 0.4; }
  }

  return {
    rms_id: row.rms_id,
    slug: row.slug,
    title: row.title,
    heroUrl,
    ai_hex: ai.hex,
    ai_hex_secondary: ai.hex_secondary || null,
    ai_family: ai.family,
    ai_temperature: ai.temperature,
    ai_confidence: ai.confidence,
    ai_reasoning: ai.reasoning,
    pixel_hex: pixel?.hex || null,
    deltaE,
    write: {
      color_hex: ai.hex,
      color_hex_secondary: ai.hex_secondary || null,
      color_lightness: Number(L.toFixed(2)),
      color_chroma: Number(C.toFixed(2)),
      color_hue: C < 8 ? null : Number(H.toFixed(2)),
      color_family: ai.family,
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
  .select('rms_id,slug,title,images,color_tagged_at,color_locked')
  .neq('status','draft')
  .eq('color_locked', false);
if (!RETAG) q = q.is('color_tagged_at', null);
if (ONLY_SLUG) q = q.eq('slug', ONLY_SLUG);
if (LIMIT) q = q.limit(LIMIT);

const { data: rows, error } = await q;
if (error) { console.error(error); process.exit(1); }
const eligible = rows.filter(r => r.images && r.images.length > 0);
console.log(`[tag-colors] eligible: ${eligible.length} / ${rows.length}  apply=${APPLY}  retag=${RETAG}`);

const results = [];
let idx = 0;
async function worker() {
  while (idx < eligible.length) {
    const i = idx++;
    const row = eligible[i];
    try {
      const r = await processOne(row);
      results.push(r);
      const tag = r.skip ? `SKIP(${r.skip})` : r.error ? `ERR(${r.error.slice(0,40)})` : `${r.write.color_family} L=${r.write.color_lightness} ΔE=${r.deltaE?.toFixed(1) ?? '-'}${r.write.color_needs_review?' ⚠':''}`;
      console.log(`[${(i+1).toString().padStart(4,' ')}/${eligible.length}] ${row.title.slice(0,50).padEnd(50,' ')} ${tag}`);
    } catch (e) {
      results.push({ rms_id: row.rms_id, slug: row.slug, title: row.title, error: e.message });
      console.error(`[${i+1}/${eligible.length}] ${row.title}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 250)); // pace
  }
}
await Promise.all(Array.from({length: CONCURRENCY}, worker));

const manifest = {
  generatedAt: new Date().toISOString(),
  apply: APPLY,
  total: results.length,
  successful: results.filter(r => r.write).length,
  needsReview: results.filter(r => r.write?.color_needs_review).length,
  errors: results.filter(r => r.error).length,
  results,
};
fs.writeFileSync('/tmp/color-tag-manifest.json', JSON.stringify(manifest, null, 2));
console.log(`\n[manifest] /tmp/color-tag-manifest.json — ${manifest.successful} ok, ${manifest.needsReview} need review, ${manifest.errors} errors`);

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
console.log(`[apply] wrote ${written}/${manifest.successful} rows. Now run: bun scripts/bake-catalog.mjs`);

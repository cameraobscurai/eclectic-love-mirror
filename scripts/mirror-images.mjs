#!/usr/bin/env node
/**
 * scripts/mirror-images.mjs
 *
 * Strictly additive mirror: for each product image currently rendering,
 * copy the EXACT file (no rename, no case change, no NN- prefix) into
 *   squarespace-mirror/{categorySlug}/{slug}/{exactFilename}
 *
 * Phase 1 (default): emits /tmp/mirror-manifest.json — no writes.
 * Phase 2 (--apply): performs uploads + DB rewrite.
 *
 * Run smoke test for styling + tableware:
 *   node scripts/mirror-images.mjs --categories=styling,tableware
 *   node scripts/mirror-images.mjs --categories=styling,tableware --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const argv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const APPLY = !!argv.apply;
const CATS = (argv.categories || '').split(',').map(s => s.trim()).filter(Boolean);
const TARGET_BUCKET = argv.bucket || 'collection';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const catalog = JSON.parse(fs.readFileSync('src/data/inventory/current_catalog.json', 'utf8'));

function classify(url) {
  if (url.includes(`/${TARGET_BUCKET}/`)) return 'already-in-target';
  if (url.includes('/squarespace-mirror/')) return 'squarespace-mirror-bucket';
  if (url.includes('squarespace-cdn.com') || url.includes('static1.squarespace.com')) return 'squarespace-cdn';
  if (url.includes('/storage/v1/object/public/inventory/')) return 'inventory-bucket';
  if (url.includes('/storage/v1/object/public/')) return 'other-supabase';
  return 'unknown';
}

function exactFilename(url) {
  // Take the last path segment, URL-decode %20 etc but keep + as-is (Squarespace stores literal +)
  const noQuery = url.split('?')[0];
  const last = noQuery.substring(noQuery.lastIndexOf('/') + 1);
  try { return decodeURIComponent(last); } catch { return last; }
}

function targetPath(cat, slug, filename) {
  return `${cat}/${slug}/${filename}`;
}

const manifest = [];
const claimed = new Map();          // targetPath -> sourceUrl that owns it
const suffixResolutions = [];        // collision audit log
const exactDupes = [];               // same source URL appearing twice in one product

function withSuffix(filename, n) {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return `${filename}__${n}`;
  return `${filename.slice(0, dot)}__${n}${filename.slice(dot)}`;
}

for (const p of catalog.products) {
  if (CATS.length && !CATS.includes(p.categorySlug)) continue;
  for (const img of (p.images || [])) {
    const url = img.url || '';
    const kind = classify(url);
    const baseFilename = exactFilename(url);
    let filename = baseFilename;
    let target = targetPath(p.categorySlug, p.slug, filename);

    // Resolve collisions: same target path claimed by a DIFFERENT source URL?
    if (claimed.has(target) && claimed.get(target) !== url) {
      let n = 2;
      while (true) {
        const candidate = withSuffix(baseFilename, n);
        const candidateTarget = targetPath(p.categorySlug, p.slug, candidate);
        if (!claimed.has(candidateTarget)) {
          suffixResolutions.push({
            slug: p.slug,
            categorySlug: p.categorySlug,
            originalTarget: target,
            resolvedTarget: candidateTarget,
            originalSource: claimed.get(target),
            thisSource: url,
            position: img.position,
          });
          filename = candidate;
          target = candidateTarget;
          break;
        }
        n++;
        if (n > 20) throw new Error(`runaway suffix collision at ${target}`);
      }
    } else if (claimed.has(target) && claimed.get(target) === url) {
      // Same exact source URL referenced twice in this product's array — keep one, skip the other
      exactDupes.push({ slug: p.slug, position: img.position, sourceUrl: url, targetPath: target });
      continue;
    }
    claimed.set(target, url);

    manifest.push({
      itemId: p.id,
      slug: p.slug,
      categorySlug: p.categorySlug,
      position: img.position,
      isHero: img.isHero,
      altText: img.altText ?? null,
      sourceUrl: url,
      sourceKind: kind,
      filename,
      targetBucket: TARGET_BUCKET,
      targetPath: target,
      newPublicUrl: `${SUPABASE_URL}/storage/v1/object/public/${TARGET_BUCKET}/${target.split('/').map(encodeURIComponent).join('/')}`,
      action: kind === 'already-in-target' ? 'skip' : 'copy',
    });
  }
}


const summary = {
  generatedAt: new Date().toISOString(),
  categories: CATS.length ? CATS : 'ALL',
  targetBucket: TARGET_BUCKET,
  totalImages: manifest.length,
  byAction: manifest.reduce((a, e) => ((a[e.action] = (a[e.action] || 0) + 1), a), {}),
  bySourceKind: manifest.reduce((a, e) => ((a[e.sourceKind] = (a[e.sourceKind] || 0) + 1), a), {}),
  uniqueProducts: new Set(manifest.map(e => e.slug)).size,
  suffixResolutionsCount: suffixResolutions.length,
  exactDupesDropped: exactDupes.length,
};

const manifestPath = '/tmp/mirror-manifest-final.json';
fs.writeFileSync(manifestPath, JSON.stringify({ summary, suffixResolutions, exactDupes, entries: manifest }, null, 2));
console.log('=== DRY RUN MANIFEST ===');
console.log(JSON.stringify(summary, null, 2));
console.log(`\nFull manifest: ${manifestPath} (${manifest.length} entries)`);
console.log(`Suffix resolutions: ${suffixResolutions.length}, exact dupes dropped: ${exactDupes.length}`);


if (!APPLY) {
  console.log('\n(no --apply flag, exiting before any writes)');
  process.exit(0);
}

// ---- APPLY PHASE ----
console.log('\n=== APPLY PHASE ===');
const CONCURRENCY = Number(argv.concurrency || 8);
const HALT_ON_FAIL = argv.haltOnFail !== false && argv['halt-on-fail'] !== false;
let ok = 0, skipped = 0;
const failed = [];
const applied = [];

async function processOne(e) {
  if (e.action === 'skip') { skipped++; return; }
  try {
    const head = await fetch(e.newPublicUrl, { method: 'HEAD' });
    if (head.ok) { skipped++; applied.push(e); return; }

    const res = await fetch(e.sourceUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const { error } = await supa.storage.from(TARGET_BUCKET).upload(e.targetPath, buf, {
      contentType, upsert: false,
    });
    if (error && !/already exists/i.test(error.message)) throw error;
    ok++;
    applied.push(e);
    if (ok % 50 === 0) console.log(`  uploaded ${ok}…`);
  } catch (err) {
    failed.push({ ...e, error: String(err.message || err) });
  }
}

// simple worker pool
const queue = [...manifest];
async function worker() {
  while (queue.length) {
    const e = queue.shift();
    await processOne(e);
    if (HALT_ON_FAIL && failed.length) return;
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\nuploads: ok=${ok} skipped=${skipped} failed=${failed.length}`);
fs.writeFileSync('/tmp/mirror-applied.json', JSON.stringify(applied, null, 2));
if (failed.length) {
  fs.writeFileSync('/tmp/mirror-failed.json', JSON.stringify(failed, null, 2));
  console.log('see /tmp/mirror-failed.json — apply HALTED' + (HALT_ON_FAIL ? '' : ' (continued)'));
  process.exit(2);
}
console.log('\nApply complete. Next: rewrite inventory_items.images[] from /tmp/mirror-applied.json (separate step).');


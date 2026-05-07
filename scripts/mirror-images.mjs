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
const collisions = new Map(); // targetPath -> [sources]

for (const p of catalog.products) {
  if (CATS.length && !CATS.includes(p.categorySlug)) continue;
  for (const img of (p.images || [])) {
    const url = img.url || '';
    const kind = classify(url);
    const filename = exactFilename(url);
    const target = targetPath(p.categorySlug, p.slug, filename);

    const entry = {
      itemId: p.id,
      slug: p.slug,
      categorySlug: p.categorySlug,
      position: img.position,
      isHero: img.isHero,
      sourceUrl: url,
      sourceKind: kind,
      filename,
      targetBucket: TARGET_BUCKET,
      targetPath: target,
      newPublicUrl: `${SUPABASE_URL}/storage/v1/object/public/${TARGET_BUCKET}/${target.split('/').map(encodeURIComponent).join('/')}`,
      action: kind === 'already-mirrored' ? 'skip' : 'copy',
    };
    manifest.push(entry);

    const arr = collisions.get(target) || [];
    arr.push(url);
    collisions.set(target, arr);
  }
}

// Detect filename collisions inside the same product folder
const collidingTargets = [...collisions.entries()].filter(([, srcs]) => new Set(srcs).size > 1);

const summary = {
  generatedAt: new Date().toISOString(),
  categories: CATS.length ? CATS : 'ALL',
  totalImages: manifest.length,
  byAction: manifest.reduce((a, e) => ((a[e.action] = (a[e.action] || 0) + 1), a), {}),
  bySourceKind: manifest.reduce((a, e) => ((a[e.sourceKind] = (a[e.sourceKind] || 0) + 1), a), {}),
  uniqueProducts: new Set(manifest.map(e => e.slug)).size,
  collisions: collidingTargets.map(([t, srcs]) => ({ targetPath: t, distinctSources: [...new Set(srcs)] })),
};

const manifestPath = '/tmp/mirror-manifest.json';
fs.writeFileSync(manifestPath, JSON.stringify({ summary, entries: manifest }, null, 2));
console.log('=== DRY RUN MANIFEST ===');
console.log(JSON.stringify(summary, null, 2));
console.log(`\nFull manifest: ${manifestPath} (${manifest.length} entries)`);

if (!APPLY) {
  console.log('\n(no --apply flag, exiting before any writes)');
  process.exit(0);
}

// ---- APPLY PHASE ----
console.log('\n=== APPLY PHASE ===');
let ok = 0, skipped = 0, failed = [];
for (const e of manifest) {
  if (e.action === 'skip') { skipped++; continue; }
  try {
    // HEAD check: if already exists at target, skip (idempotent)
    const head = await fetch(e.newPublicUrl, { method: 'HEAD' });
    if (head.ok) { skipped++; continue; }

    const res = await fetch(e.sourceUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const { error } = await supa.storage.from(TARGET_BUCKET).upload(e.targetPath, buf, {
      contentType, upsert: false,
    });
    if (error && !/already exists/i.test(error.message)) throw error;
    ok++;
    if (ok % 25 === 0) console.log(`  uploaded ${ok}…`);
  } catch (err) {
    failed.push({ ...e, error: String(err.message || err) });
  }
}
console.log(`\nuploads: ok=${ok} skipped=${skipped} failed=${failed.length}`);
if (failed.length) {
  fs.writeFileSync('/tmp/mirror-failed.json', JSON.stringify(failed, null, 2));
  console.log('see /tmp/mirror-failed.json');
}
console.log('\nNext step (separate command): rewrite inventory_items.images[] using this manifest. Not executed here.');

#!/usr/bin/env node
/**
 * sync-product-covers.mjs
 * 
 * Reads files staged in private bucket `product-covers/{category}/{slug}.png`,
 * copies them to public bucket `squarespace-mirror/covers/{category}/{slug}.png`,
 * and updates inventory_items.images[0] (hero) to the new public URL.
 * 
 * Run modes:
 *   --dry-run        list what would change, write no DB
 *   --category=bars  limit to one category (repeatable)
 *   --apply          actually write
 * 
 * Existing hero is archived to images_archive[] before replacement.
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(URL, KEY);

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const cats = [...args].filter(a => a.startsWith('--category=')).map(a => a.split('=')[1]);
const CATEGORY_FILTER = cats.length ? new Set(cats) : null;
const STAGING = 'product-covers';
const PUBLIC = 'squarespace-mirror';
const PUBLIC_PREFIX = 'covers';

async function listStaged() {
  // list top-level folders (categories)
  const { data: cats, error } = await sb.storage.from(STAGING).list('', { limit: 1000 });
  if (error) throw error;
  const out = [];
  for (const c of cats.filter(c => !c.name.startsWith('.'))) {
    if (CATEGORY_FILTER && !CATEGORY_FILTER.has(c.name)) continue;
    const { data: files } = await sb.storage.from(STAGING).list(c.name, { limit: 5000 });
    for (const f of (files || [])) {
      if (!f.name.match(/\.(png|jpg|jpeg|webp)$/i)) continue;
      const slug = f.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
      out.push({ category: c.name, slug, path: `${c.name}/${f.name}`, filename: f.name });
    }
  }
  return out;
}

async function publicUrl(path) {
  const { data } = sb.storage.from(PUBLIC).getPublicUrl(path);
  return data.publicUrl;
}

async function copyToPublic(stagingPath, publicPath) {
  // download from staging, upload to public
  const { data: blob, error: dlErr } = await sb.storage.from(STAGING).download(stagingPath);
  if (dlErr) throw dlErr;
  const buf = Buffer.from(await blob.arrayBuffer());
  const { error: upErr } = await sb.storage.from(PUBLIC).upload(publicPath, buf, {
    contentType: 'image/png', upsert: true,
  });
  if (upErr) throw upErr;
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN ===');
  const staged = await listStaged();
  console.log(`staged files: ${staged.length}`);

  let updated = 0, missing = 0, skipped = 0;
  for (const s of staged) {
    const { data: row, error } = await sb
      .from('inventory_items')
      .select('id, slug, images, images_archive')
      .eq('slug', s.slug)
      .maybeSingle();
    if (error) { console.log(`  ERR ${s.slug}: ${error.message}`); continue; }
    if (!row) { console.log(`  NO MATCH ${s.slug}`); missing++; continue; }

    const publicPath = `${PUBLIC_PREFIX}/${s.category}/${s.filename}`;
    const newUrl = await publicUrl(publicPath);
    const oldHero = (row.images || [])[0] || null;
    if (oldHero === newUrl) { skipped++; continue; }

    console.log(`  ${APPLY ? '→' : '·'} ${s.slug}  hero -> ${publicPath}`);
    if (APPLY) {
      await copyToPublic(s.path, publicPath);
      const archive = [...(row.images_archive || []), ...(oldHero ? [oldHero] : [])];
      const newImages = [newUrl, ...(row.images || []).slice(1)];
      const { error: upErr } = await sb
        .from('inventory_items')
        .update({ images: newImages, images_archive: archive })
        .eq('id', row.id);
      if (upErr) { console.log(`    DB ERR: ${upErr.message}`); continue; }
    }
    updated++;
  }
  console.log(`\nstaged: ${staged.length}  to_update: ${updated}  missing_slug: ${missing}  unchanged: ${skipped}`);
  if (!APPLY) console.log('\nrun with --apply to write');
}
main().catch(e => { console.error(e); process.exit(1); });

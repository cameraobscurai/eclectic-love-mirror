#!/usr/bin/env node
/**
 * supabase-orphans.mjs
 * ------------------------------------------------------------------
 * Defensive sweep. Lists every object in our buckets and diffs against
 * every URL referenced anywhere in the database / repo. Anything in the
 * bucket but unreferenced is reported.
 *
 * REPORT ONLY. Does not move, rename, or delete a single byte.
 *
 *   node scripts/backup/supabase-orphans.mjs
 *
 * Outputs:
 *   scripts/backup/out/orphans.json
 *   scripts/backup/out/orphans.csv
 *   scripts/backup/out/orphans-summary.txt
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(2);
}

const OUT_DIR = "scripts/backup/out";
const BUCKETS = [
  "squarespace-mirror",
  "inventory",
  "collection",
  "category-covers",
  "image-galleries",
  "team-photos",
  "videos",
  "editorial",
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;

async function listBucketRecursive(bucket) {
  const out = [];
  async function walk(prefix) {
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error) {
        console.warn(`  ! list ${bucket}/${prefix} failed: ${error.message}`);
        return;
      }
      if (!data || data.length === 0) break;
      for (const entry of data) {
        // Folders show up with id===null and no metadata in supabase-js
        const isFolder = entry.id === null || (!entry.metadata && !entry.updated_at);
        if (isFolder) {
          await walk(prefix ? `${prefix}/${entry.name}` : entry.name);
        } else {
          const key = prefix ? `${prefix}/${entry.name}` : entry.name;
          out.push({
            bucket,
            key,
            size: entry.metadata?.size ?? null,
            content_type: entry.metadata?.mimetype ?? null,
            updated_at: entry.updated_at ?? null,
            public_url: `${PUBLIC_PREFIX}${bucket}/${key}`,
          });
        }
      }
      if (data.length < PAGE) break;
      offset += PAGE;
    }
  }
  await walk("");
  return out;
}

async function fetchReferencedFromDb() {
  const refs = new Set();

  // inventory_items.images (text[])
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("images, og_image")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) {
        for (const u of r.images || []) {
          if (typeof u === "string") refs.add(u);
        }
        if (typeof r.og_image === "string") refs.add(r.og_image);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  // scraped_product_images.image_url (historical, but a reference is a reference)
  try {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("scraped_product_images")
        .select("image_url")
        .range(from, from + PAGE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      for (const r of data) if (typeof r.image_url === "string") refs.add(r.image_url);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  } catch {}

  // scraped_products.hero_image_url
  try {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("scraped_products")
        .select("hero_image_url")
        .range(from, from + PAGE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      for (const r of data) if (typeof r.hero_image_url === "string") refs.add(r.hero_image_url);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  } catch {}

  return refs;
}

async function fetchReferencedFromRepo() {
  // Catch hardcoded references in JSON content (category covers, gallery manifests).
  // Cheap text scan; we only care that the URL substring exists somewhere.
  const refs = new Set();
  const candidates = [
    "src/data/inventory/current_catalog.json",
    "src/content/gallery-manifests.ts",
    "src/content/gallery-projects.ts",
    "src/lib/category-covers.ts",
  ];
  for (const f of candidates) {
    try {
      const txt = await readFile(f, "utf8");
      const matches = txt.match(/https?:\/\/[^\s"'`)<>]+/g) || [];
      for (const m of matches) refs.add(m);
    } catch {}
  }
  return refs;
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("→ Listing buckets…");
  const all = [];
  for (const b of BUCKETS) {
    process.stdout.write(`  ${b}… `);
    const items = await listBucketRecursive(b);
    console.log(`${items.length} files`);
    all.push(...items);
  }
  console.log(`  total ${all.length} storage objects`);

  console.log("→ Building reference set from DB + repo…");
  const dbRefs = await fetchReferencedFromDb();
  const repoRefs = await fetchReferencedFromRepo();
  const refs = new Set([...dbRefs, ...repoRefs]);
  console.log(`  ${dbRefs.size} db refs · ${repoRefs.size} repo refs · ${refs.size} unique`);

  // Build a lookup: also accept references that contain the bucket key suffix
  // (some places store relative paths). Cheap O(n) — string includes per object.
  const refsArr = [...refs];
  const orphans = [];
  for (const obj of all) {
    if (refs.has(obj.public_url)) continue;
    // fallback: any reference containing this bucket+key suffix
    const suffix = `${obj.bucket}/${obj.key}`;
    let referenced = false;
    for (const r of refsArr) {
      if (r.includes(suffix)) {
        referenced = true;
        break;
      }
    }
    if (!referenced) orphans.push(obj);
  }

  // Group counts
  const byBucket = {};
  let totalBytes = 0;
  for (const o of orphans) {
    byBucket[o.bucket] = (byBucket[o.bucket] || 0) + 1;
    totalBytes += o.size || 0;
  }

  await writeFile(join(OUT_DIR, "orphans.json"), JSON.stringify(orphans, null, 2));

  const csv = [
    "bucket,key,size_bytes,content_type,updated_at,public_url",
    ...orphans.map((o) =>
      [o.bucket, o.key, o.size, o.content_type, o.updated_at, o.public_url]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");
  await writeFile(join(OUT_DIR, "orphans.csv"), csv);

  const lines = [
    `supabase-orphans.mjs summary`,
    `---------------------------`,
    `total storage objects scanned: ${all.length}`,
    `total references (db+repo):    ${refs.size}`,
    `orphans (unreferenced):        ${orphans.length}`,
    `total orphan bytes:            ${totalBytes}`,
    ``,
    `by bucket:`,
    ...Object.entries(byBucket)
      .sort((a, b) => b[1] - a[1])
      .map(([b, c]) => `  ${b.padEnd(20)} ${c}`),
    ``,
  ].join("\n");
  await writeFile(join(OUT_DIR, "orphans-summary.txt"), lines);
  console.log("\n" + lines);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

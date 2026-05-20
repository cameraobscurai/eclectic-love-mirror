// scripts/archive-backfill.mjs
//
// One-shot: mirror every file in the owner-original buckets
// (`incoming-photos`, `inventory`) into the private `inventory-photo-archive`
// bucket. Idempotent — already-archived paths are skipped via HEAD check.
//
// Usage:
//   bun scripts/archive-backfill.mjs            # both source buckets
//   bun scripts/archive-backfill.mjs --bucket incoming-photos
//   bun scripts/archive-backfill.mjs --dry-run
//
// Never deletes from source. Failures are logged and the script keeps going.

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const ARCHIVE = "inventory-photo-archive";
const DEFAULT_SOURCES = ["incoming-photos", "inventory"];
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const bucketArgIdx = args.indexOf("--bucket");
const SOURCES =
  bucketArgIdx >= 0 ? [args[bucketArgIdx + 1]] : DEFAULT_SOURCES;

async function listAll(bucket, prefix = "") {
  const out = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data?.length) break;
    for (const f of data) {
      if (!f.name) continue;
      // folder placeholder (no id) → recurse
      if (!f.id && !f.metadata) {
        const sub = prefix ? `${prefix}/${f.name}` : f.name;
        const nested = await listAll(bucket, sub);
        out.push(...nested);
      } else {
        out.push(prefix ? `${prefix}/${f.name}` : f.name);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function archiveExists(path) {
  // Cheap exists check: try a 0-byte download. Storage returns 404 if missing.
  const { data, error } = await sb.storage
    .from(ARCHIVE)
    .createSignedUrl(path, 60);
  if (error) return false;
  if (!data?.signedUrl) return false;
  const head = await fetch(data.signedUrl, { method: "HEAD" });
  return head.ok;
}

async function copyOne(srcBucket, path) {
  const archivePath = `${srcBucket}/${path}`;
  if (await archiveExists(archivePath)) return { skipped: true };
  if (DRY) return { dry: true, archivePath };
  const { data: blob, error: dlErr } = await sb.storage
    .from(srcBucket)
    .download(path);
  if (dlErr || !blob) return { error: dlErr?.message || "download failed" };
  const { error: upErr } = await sb.storage
    .from(ARCHIVE)
    .upload(archivePath, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
      cacheControl: "31536000",
    });
  if (upErr && !/already exists|duplicate/i.test(upErr.message)) {
    return { error: upErr.message };
  }
  return { ok: true };
}

const totals = { copied: 0, skipped: 0, failed: 0, dry: 0 };
const failures = [];

for (const src of SOURCES) {
  console.log(`\n[archive-backfill] scanning ${src}…`);
  const paths = await listAll(src);
  console.log(`[archive-backfill] ${src}: ${paths.length} files`);
  let done = 0;
  const CONCURRENCY = 6;
  for (let i = 0; i < paths.length; i += CONCURRENCY) {
    const slice = paths.slice(i, i + CONCURRENCY);
    const results = await Promise.all(slice.map((p) => copyOne(src, p)));
    results.forEach((r, j) => {
      if (r.ok) totals.copied++;
      else if (r.skipped) totals.skipped++;
      else if (r.dry) totals.dry++;
      else {
        totals.failed++;
        failures.push(`${src}/${slice[j]}: ${r.error}`);
      }
    });
    done += slice.length;
    if (done % 200 === 0 || done === paths.length) {
      console.log(
        `  …${done}/${paths.length}  copied:${totals.copied} skipped:${totals.skipped} failed:${totals.failed}${DRY ? ` dry:${totals.dry}` : ""}`,
      );
    }
  }
}

console.log("\n[archive-backfill] DONE");
console.log(JSON.stringify(totals, null, 2));
if (failures.length) {
  console.log("\nFAILURES (first 20):");
  failures.slice(0, 20).forEach((f) => console.log("  " + f));
}

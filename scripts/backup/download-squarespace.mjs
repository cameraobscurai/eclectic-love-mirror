#!/usr/bin/env node
/**
 * download-squarespace.mjs
 * ------------------------------------------------------------------
 * URGENT defensive backup. Pulls a cold copy of every image in
 * inventory_items.images whose host is Squarespace, writes it both
 * to a local archive AND to our own squarespace-mirror bucket.
 *
 * Touches NO database rows. Idempotent / resumable.
 *
 *   node scripts/backup/download-squarespace.mjs
 *
 * Outputs:
 *   /mnt/documents/squarespace-backup/<key>          (cold copy)
 *   storage://squarespace-mirror/<key>               (hot copy)
 *   scripts/backup/out/download-manifest.json
 *   scripts/backup/out/download-failed.json
 *   scripts/backup/out/download-summary.txt
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join, basename } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(2);
}

const BUCKET = "squarespace-mirror";
const COLD_ROOT = "/mnt/documents/squarespace-backup";
const OUT_DIR = "scripts/backup/out";
const SQS_HOSTS = new Set([
  "images.squarespace-cdn.com",
  "static1.squarespace.com",
]);
const CONCURRENCY = 8;
const MAX_RETRIES = 4;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (s) => createHash("sha1").update(s).digest("hex");

function isSquarespace(url) {
  try {
    return SQS_HOSTS.has(new URL(url).host);
  } catch {
    return false;
  }
}

function keyFor(rmsId, url) {
  const u = new URL(url);
  // basename without query, scrub anything weird
  const base =
    basename(u.pathname).replace(/[^\w.\-]+/g, "_").slice(0, 80) ||
    "image.jpg";
  const id = (rmsId || "unknown").toString().replace(/[^\w\-]+/g, "_");
  return `squarespace/${id}/${sha1(url).slice(0, 12)}-${base}`;
}

function publicUrlFor(key) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
}

async function fetchAllItems() {
  // Service role: no RLS. Page through to be safe past 1000 row limit.
  const all = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("rms_id, slug, images")
      .order("rms_id", { ascending: true, nullsFirst: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function bucketObjectInfo(key) {
  // returns { exists: bool, size: number|null }
  const dir = dirname(key);
  const name = basename(key);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(dir, { limit: 1000, search: name });
  if (error) return { exists: false, size: null };
  const hit = (data || []).find((o) => o.name === name);
  if (!hit) return { exists: false, size: null };
  return {
    exists: true,
    size: hit.metadata?.size ?? null,
  };
}

async function downloadOnce(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "EclecticHive-Backup/1.0 (+defensive mirror; contact admin)",
      Accept: "image/*,*/*;q=0.8",
    },
    redirect: "follow",
  });
  return res;
}

async function downloadWithRetry(url) {
  let attempt = 0;
  let lastErr = null;
  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const res = await downloadOnce(url);
      if (res.status === 404) {
        const text = await res.text().catch(() => "");
        const err = new Error(`404 Not Found`);
        err.status = 404;
        err.body = text.slice(0, 200);
        throw err;
      }
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        const wait = Math.min(2000 * attempt, 8000);
        await sleep(wait);
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return { buf, contentType };
    } catch (e) {
      lastErr = e;
      if (e.status === 404) throw e;
      if (attempt >= MAX_RETRIES) throw e;
      await sleep(Math.min(1500 * attempt, 6000));
    }
  }
  throw lastErr || new Error("download failed");
}

async function processOne(job, manifest, failed, counters) {
  const { rmsId, url } = job;
  const key = keyFor(rmsId, url);
  const coldPath = join(COLD_ROOT, key);
  const publicUrl = publicUrlFor(key);

  // Skip-if-already-done short circuit (idempotent / resumable)
  let existsLocal = false;
  let localSize = 0;
  try {
    const st = await stat(coldPath);
    existsLocal = true;
    localSize = st.size;
  } catch {}
  const remote = await bucketObjectInfo(key);

  if (existsLocal && remote.exists && (remote.size == null || remote.size === localSize)) {
    counters.skipped++;
    manifest.push({
      rms_id: rmsId,
      original_url: url,
      bucket_key: key,
      public_url: publicUrl,
      bytes: localSize,
      sha1: null, // not recomputed on skip
      skipped: true,
    });
    return;
  }

  try {
    const { buf, contentType } = await downloadWithRetry(url);
    await mkdir(dirname(coldPath), { recursive: true });
    await writeFile(coldPath, buf);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buf, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });
    if (upErr) throw upErr;

    counters.ok++;
    manifest.push({
      rms_id: rmsId,
      original_url: url,
      bucket_key: key,
      public_url: publicUrl,
      bytes: buf.length,
      content_type: contentType,
      sha1: sha1(buf),
      skipped: false,
    });
  } catch (e) {
    counters.failed++;
    failed.push({
      rms_id: rmsId,
      original_url: url,
      bucket_key: key,
      error: String(e?.message || e),
      status: e?.status ?? null,
    });
  }
}

async function runPool(jobs, worker) {
  const queue = jobs.slice();
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      await worker(job);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const t0 = Date.now();
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(COLD_ROOT, { recursive: true });

  console.log("→ Reading inventory_items…");
  const items = await fetchAllItems();
  console.log(`  ${items.length} rows`);

  const jobs = [];
  for (const row of items) {
    for (const url of row.images || []) {
      if (typeof url !== "string") continue;
      if (isSquarespace(url)) jobs.push({ rmsId: row.rms_id, url });
    }
  }
  // Dedupe identical URLs (some products share images)
  const seen = new Set();
  const dedup = [];
  for (const j of jobs) {
    const key = `${j.rmsId}::${j.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(j);
  }
  console.log(`→ ${dedup.length} Squarespace URLs to mirror`);

  const manifest = [];
  const failed = [];
  const counters = { ok: 0, skipped: 0, failed: 0 };

  let done = 0;
  await runPool(dedup, async (job) => {
    await processOne(job, manifest, failed, counters);
    done++;
    if (done % 25 === 0 || done === dedup.length) {
      process.stdout.write(
        `\r  ${done}/${dedup.length}  ok=${counters.ok} skip=${counters.skipped} fail=${counters.failed}  `
      );
    }
  });
  process.stdout.write("\n");

  await writeFile(
    join(OUT_DIR, "download-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  await writeFile(
    join(OUT_DIR, "download-failed.json"),
    JSON.stringify(failed, null, 2)
  );

  const totalBytes = manifest.reduce((a, m) => a + (m.bytes || 0), 0);
  const summary = [
    `download-squarespace.mjs summary`,
    `--------------------------------`,
    `inventory rows scanned: ${items.length}`,
    `squarespace urls found: ${dedup.length}`,
    `downloaded ok:          ${counters.ok}`,
    `skipped (already mirrored): ${counters.skipped}`,
    `failed:                 ${counters.failed}`,
    `total bytes (this run): ${totalBytes}`,
    `elapsed:                ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    `cold archive:           ${COLD_ROOT}`,
    `bucket:                 ${BUCKET}`,
    ``,
  ].join("\n");
  await writeFile(join(OUT_DIR, "download-summary.txt"), summary);
  console.log("\n" + summary);
  if (counters.failed > 0) {
    console.log(`⚠  ${counters.failed} failures — see download-failed.json`);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * mirror-catalog-extras.mjs
 * --------------------------------------------------------------------
 * After bake-catalog.mjs runs, the resulting current_catalog.json may
 * contain Squarespace CDN URLs that were injected by the live-overlay
 * step (rolled-family hero images, gallery seeding). Those URLs were
 * never in inventory_items.images, so the swap-urls pass didn't see
 * them — they're still pointing at images.squarespace-cdn.com.
 *
 * This script:
 *   1. Walks current_catalog.json and collects every squarespace URL.
 *   2. Downloads each one → squarespace-mirror bucket (idempotent).
 *   3. Rewrites the JSON in place to point at the bucket.
 *
 * Safe to re-run. Cold copies also land in /mnt/documents/squarespace-backup.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { dirname, join, basename } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const BUCKET = "squarespace-mirror";
const COLD_ROOT = "/mnt/documents/squarespace-backup";
const CATALOG = "src/data/inventory/current_catalog.json";
const SQS_HOSTS = new Set(["images.squarespace-cdn.com", "static1.squarespace.com"]);
const CONCURRENCY = 8;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (s) => createHash("sha1").update(s).digest("hex");

const isSqs = (u) => {
  try { return SQS_HOSTS.has(new URL(u).host); } catch { return false; }
};
const keyFor = (url) => {
  const u = new URL(url);
  const base = (basename(u.pathname).replace(/[^\w.\-]+/g, "_").slice(0, 80)) || "image.jpg";
  return `squarespace/_extras/${sha1(url).slice(0, 12)}-${base}`;
};
const publicUrlFor = (key) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;

// Collect every string URL from the JSON tree
function collectUrls(node, out) {
  if (node == null) return;
  if (typeof node === "string") { if (isSqs(node)) out.add(node); return; }
  if (Array.isArray(node)) { for (const v of node) collectUrls(v, out); return; }
  if (typeof node === "object") { for (const v of Object.values(node)) collectUrls(v, out); }
}
function rewriteUrls(node, map) {
  if (node == null) return node;
  if (typeof node === "string") return map.get(node) || node;
  if (Array.isArray(node)) return node.map((v) => rewriteUrls(v, map));
  if (typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = rewriteUrls(v, map);
    return out;
  }
  return node;
}

async function bucketHas(key) {
  const { data } = await supabase.storage.from(BUCKET).list(dirname(key), {
    limit: 1000, search: basename(key),
  });
  return (data || []).some((o) => o.name === basename(key));
}

async function downloadOne(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { "User-Agent": "EclecticHive-Backup/1.0", Accept: "image/*,*/*;q=0.8" },
    redirect: "follow",
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 4) throw new Error(`HTTP ${res.status}`);
    await sleep(Math.min(1500 * attempt, 6000));
    return downloadOne(url, attempt + 1);
  }
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, contentType: res.headers.get("content-type") || "image/jpeg" };
}

async function processOne(url, results, fail) {
  const key = keyFor(url);
  const cold = join(COLD_ROOT, key);
  const publicUrl = publicUrlFor(key);
  let exists = false;
  try { await stat(cold); exists = true; } catch {}
  const remote = await bucketHas(key);
  if (exists && remote) { results.set(url, publicUrl); return { skipped: true }; }
  try {
    const { buf, contentType } = await downloadOne(url);
    await mkdir(dirname(cold), { recursive: true });
    await writeFile(cold, buf);
    const { error } = await supabase.storage.from(BUCKET).upload(key, buf, {
      contentType, upsert: true, cacheControl: "31536000",
    });
    if (error) throw error;
    results.set(url, publicUrl);
    return { ok: true };
  } catch (e) {
    fail.push({ url, error: String(e?.message || e) });
    return { failed: true };
  }
}

async function pool(jobs, worker) {
  const q = jobs.slice();
  const ws = Array.from({ length: CONCURRENCY }, async () => {
    while (q.length) await worker(q.shift());
  });
  await Promise.all(ws);
}

async function main() {
  const raw = await readFile(CATALOG, "utf8");
  const json = JSON.parse(raw);
  const set = new Set();
  collectUrls(json, set);
  const urls = [...set];
  console.log(`→ ${urls.length} squarespace URLs in catalog`);
  if (!urls.length) { console.log("nothing to do"); return; }

  const map = new Map();
  const fail = [];
  let ok = 0, skip = 0, done = 0;
  await pool(urls, async (u) => {
    const r = await processOne(u, map, fail);
    if (r.ok) ok++;
    if (r.skipped) skip++;
    done++;
    if (done % 25 === 0 || done === urls.length) {
      process.stdout.write(`\r  ${done}/${urls.length}  ok=${ok} skip=${skip} fail=${fail.length}  `);
    }
  });
  process.stdout.write("\n");

  if (fail.length) {
    console.log(`⚠  ${fail.length} downloads failed — keeping original URLs for those`);
    await mkdir("scripts/backup/out", { recursive: true });
    await writeFile("scripts/backup/out/catalog-extras-failed.json", JSON.stringify(fail, null, 2));
  }

  const rewritten = rewriteUrls(json, map);
  await writeFile(CATALOG, JSON.stringify(rewritten, null, 2));
  console.log(`✓ rewrote ${CATALOG} — ${map.size} URLs replaced`);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });

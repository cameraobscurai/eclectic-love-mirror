#!/usr/bin/env node
// Perceptual gallery audit: scan all multi-image, non-draft inventory_items,
// compute dHash for each image, flag broken (HTTP/decoding) and near-duplicates.
//
// Output: /tmp/gallery-audit.json
//
// Usage: node scripts/audit-gallery.mjs

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const CONCURRENCY = 24;
const DUP_THRESHOLD = 5; // hamming distance cutoff for "near duplicate"

// ---- pull items from DB ----
console.error("loading items from DB…");
const raw = execSync(
  `psql -At -F$'\\t' -c "SELECT rms_id, slug, title, array_to_string(images, '|||') FROM inventory_items WHERE array_length(images,1) >= 2 AND status <> 'draft' ORDER BY slug"`,
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);
const items = raw
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [rms_id, slug, title, imagesJoined] = line.split("\t");
    return { rms_id, slug, title, images: (imagesJoined || "").split("|||").filter(Boolean) };
  });
console.error(`loaded ${items.length} multi-image items`);

// ---- dHash + fetch ----
async function fetchAndHash(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { url, ok: false, status: res.status, reason: "http" };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2048) return { url, ok: false, status: res.status, bytes: buf.length, reason: "tiny" };
    let raw;
    try {
      raw = await sharp(buf, { failOn: "none" })
        .greyscale()
        .resize(9, 8, { fit: "fill" })
        .raw()
        .toBuffer();
    } catch (e) {
      return { url, ok: false, status: res.status, bytes: buf.length, reason: "decode", error: e.message };
    }
    // dHash: compare each pixel to the next horizontally → 64 bits
    let hash = 0n;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = raw[y * 9 + x];
        const right = raw[y * 9 + x + 1];
        hash = (hash << 1n) | (left > right ? 1n : 0n);
      }
    }
    return { url, ok: true, status: res.status, bytes: buf.length, hash: hash.toString(16).padStart(16, "0") };
  } catch (e) {
    return { url, ok: false, reason: "network", error: e.message };
  }
}

function hamming(aHex, bHex) {
  let a = BigInt("0x" + aHex);
  let b = BigInt("0x" + bHex);
  let x = a ^ b;
  let count = 0;
  while (x) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

// ---- worker pool ----
async function pool(tasks, n, fn) {
  const results = new Array(tasks.length);
  let cursor = 0;
  let done = 0;
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= tasks.length) return;
      results[i] = await fn(tasks[i]);
      done++;
      if (done % 50 === 0) process.stderr.write(`\r  hashed ${done}/${tasks.length}`);
    }
  });
  await Promise.all(workers);
  process.stderr.write(`\r  hashed ${done}/${tasks.length}\n`);
  return results;
}

// ---- flatten all (item, idx, url) tasks ----
const tasks = [];
for (const item of items) {
  item.images.forEach((url, idx) => tasks.push({ rms_id: item.rms_id, idx, url }));
}
console.error(`hashing ${tasks.length} images with ${CONCURRENCY} workers…`);
const hashed = await pool(tasks, CONCURRENCY, (t) => fetchAndHash(t.url));

// rebuild per-item map
const byItem = new Map(items.map((i) => [i.rms_id, { ...i, perImage: new Array(i.images.length) }]));
hashed.forEach((r, i) => {
  const t = tasks[i];
  byItem.get(t.rms_id).perImage[t.idx] = r;
});

// ---- analyze each item ----
const findings = [];
for (const item of byItem.values()) {
  const broken = [];
  const dupes = [];
  for (let i = 0; i < item.perImage.length; i++) {
    const r = item.perImage[i];
    if (!r.ok) broken.push({ idx: i, url: r.url, reason: r.reason, status: r.status, bytes: r.bytes });
  }
  for (let i = 0; i < item.perImage.length; i++) {
    for (let j = i + 1; j < item.perImage.length; j++) {
      const a = item.perImage[i];
      const b = item.perImage[j];
      if (!a.ok || !b.ok) continue;
      const d = hamming(a.hash, b.hash);
      if (d <= DUP_THRESHOLD) dupes.push({ i, j, distance: d, urlI: a.url, urlJ: b.url });
    }
  }
  if (broken.length || dupes.length) {
    findings.push({
      rms_id: item.rms_id,
      slug: item.slug,
      title: item.title,
      imageCount: item.images.length,
      broken,
      dupes,
    });
  }
}

// ---- summarize ----
const summary = {
  itemsScanned: items.length,
  imagesScanned: tasks.length,
  itemsWithFindings: findings.length,
  totalBroken: findings.reduce((s, f) => s + f.broken.length, 0),
  totalDupePairs: findings.reduce((s, f) => s + f.dupes.length, 0),
  byDistance: {},
};
for (const f of findings) for (const d of f.dupes) summary.byDistance[d.distance] = (summary.byDistance[d.distance] || 0) + 1;

const out = { summary, findings };
writeFileSync("/tmp/gallery-audit.json", JSON.stringify(out, null, 2));
console.error("\nsummary:", JSON.stringify(summary, null, 2));
console.error("→ /tmp/gallery-audit.json");

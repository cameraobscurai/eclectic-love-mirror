#!/usr/bin/env node
// CI guard: catalog public-ready product count must equal the number of
// /collection/<slug> entries the sitemap route emits.
//
// Mirrors the logic in src/routes/sitemap[.]xml.ts:
//   STATIC_ENTRIES (6) + one entry per publicReady product with a slug.
//
// If SITEMAP_URL is set, also fetches the live sitemap and counts <loc> tags
// to verify the deployed output matches.
//
// Exits non-zero on any mismatch so CI fails loudly.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(__dirname, "../src/data/inventory/current_catalog.json");
const STATIC_ENTRY_COUNT = 6; // keep in sync with STATIC_ENTRIES in sitemap[.]xml.ts

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
const products = Array.isArray(catalog.products) ? catalog.products : [];

const publicReady = products.filter((p) => p.publicReady !== false);
const withSlug = publicReady.filter((p) => typeof p.slug === "string" && p.slug.length > 0);
const withoutSlug = publicReady.filter((p) => !p.slug);
const expectedProductUrls = withSlug.length;
const expectedTotalUrls = STATIC_ENTRY_COUNT + expectedProductUrls;

console.log(`[check-sitemap] catalog products (total):        ${products.length}`);
console.log(`[check-sitemap] public-ready:                    ${publicReady.length}`);
console.log(`[check-sitemap] public-ready with slug:          ${withSlug.length}`);
console.log(`[check-sitemap] expected sitemap product URLs:   ${expectedProductUrls}`);
console.log(`[check-sitemap] expected sitemap total URLs:     ${expectedTotalUrls}`);

let failed = false;

if (withoutSlug.length > 0) {
  failed = true;
  console.error(`\n[check-sitemap] FAIL: ${withoutSlug.length} public-ready products have no slug:`);
  for (const p of withoutSlug.slice(0, 20)) {
    console.error(`  - ${p.id} | ${p.title}`);
  }
}

const slugSeen = new Map();
for (const p of withSlug) {
  slugSeen.set(p.slug, (slugSeen.get(p.slug) || 0) + 1);
}
const dupes = [...slugSeen.entries()].filter(([, n]) => n > 1);
if (dupes.length > 0) {
  failed = true;
  console.error(`\n[check-sitemap] FAIL: ${dupes.length} duplicate slug(s):`);
  for (const [slug, n] of dupes) console.error(`  - ${slug} (${n}×)`);
}

const liveUrl = process.env.SITEMAP_URL;
if (liveUrl) {
  console.log(`\n[check-sitemap] fetching ${liveUrl} …`);
  try {
    const res = await fetch(liveUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const liveLocCount = (xml.match(/<loc>/g) || []).length;
    const liveProductCount = (xml.match(/<loc>[^<]*\/collection\/[^<]+<\/loc>/g) || []).length;
    console.log(`[check-sitemap] live <loc> total:               ${liveLocCount}`);
    console.log(`[check-sitemap] live /collection/<slug> URLs:   ${liveProductCount}`);
    if (liveProductCount !== expectedProductUrls) {
      failed = true;
      console.error(
        `\n[check-sitemap] FAIL: live product URLs (${liveProductCount}) ≠ expected (${expectedProductUrls})`,
      );
    }
    if (liveLocCount !== expectedTotalUrls) {
      failed = true;
      console.error(
        `\n[check-sitemap] FAIL: live total URLs (${liveLocCount}) ≠ expected (${expectedTotalUrls})`,
      );
    }
  } catch (err) {
    failed = true;
    console.error(`\n[check-sitemap] FAIL: could not fetch live sitemap: ${err.message}`);
  }
}

if (failed) {
  console.error(`\n[check-sitemap] ❌ sitemap parity check FAILED`);
  process.exit(1);
}
console.log(`\n[check-sitemap] ✅ sitemap parity OK`);

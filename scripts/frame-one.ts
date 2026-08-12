#!/usr/bin/env bun
/**
 * Frame Studio 2.2 — single-product driver.
 *
 *   bun run scripts/frame-one.ts --slug <slug> [--apply]
 *   bun run scripts/frame-one.ts --rms <rms_id> [--apply]
 *
 * Dry run by default: renders, verifies, prints the recipe + hash, writes the
 * would-be derivative to /tmp. `--apply` uploads both sizes at the hashed path
 * and points `cover_framed_url` at the 1200w URL — the same hash and the same
 * path shape the `saveFramedCover` server function uses (shared module, so the
 * two can never drift). R1: 409 on upload = dedup success.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { renderCover } from "./lib/frame-render";
import { framedHash16, framedCoverPath } from "../src/lib/frame-hash";
import { RULE_VERSION, CANVAS_W, CANVAS_H } from "../src/lib/frame-engine";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL_, KEY);

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = args.includes("--apply");
const slug = flag("slug");
const rms = flag("rms");
if (!slug && !rms) {
  console.error("pass --slug <slug> or --rms <rms_id>");
  process.exit(1);
}

const q = sb
  .from("inventory_items")
  .select("id, rms_id, title, slug, images, collection_slug, category_slug, cover_framed_url")
  .limit(1);
const { data: rows, error } = await (slug ? q.eq("slug", slug) : q.eq("rms_id", rms!));
if (error) throw error;
const row = rows?.[0];
if (!row) {
  console.error("no matching row");
  process.exit(1);
}

const images = Array.isArray(row.images) ? (row.images as unknown[]) : [];
const first = images[0];
const srcUrl =
  typeof first === "string"
    ? first
    : first && typeof first === "object"
      ? String((first as Record<string, unknown>).url ?? "")
      : "";
if (!srcUrl) {
  console.error("row has no cover image");
  process.exit(1);
}

console.log(`▸ ${row.title}  [${row.collection_slug} / ${row.category_slug}]`);
console.log(`  src ${srcUrl}`);

const res = await fetch(srcUrl);
if (!res.ok) throw new Error(`source fetch ${res.status}`);
const sourceBytes = new Uint8Array(await res.arrayBuffer());

const out = await renderCover({
  sourceBytes,
  categorySlug: row.category_slug,
  collectionSlug: row.collection_slug,
});

console.log(`  measure  ${out.measurement.method} conf=${out.measurement.confidence} bbox=${JSON.stringify(out.bboxPx)}`);
console.log(`  recipe   ${JSON.stringify(out.recipe.placement)}  bg=${out.background}`);
console.log(`  resample ${out.resampleFactor.toFixed(3)}x  canvas ${CANVAS_W}x${CANVAS_H}`);
for (const a of out.verify.advisories) console.log(`  advisory ${a.code}: ${a.message}`);

if (!out.ok || !out.bytes) {
  console.log("  VERIFY FAIL — no bytes produced:");
  for (const f of out.verify.failures) console.log(`    ${f.code}: ${f.message}`);
  process.exit(2);
}

const hash16 = await framedHash16(out.srcHash, out.recipe, RULE_VERSION);
const folder = row.rms_id || row.id;
const p1200 = framedCoverPath(folder, hash16, 1200);
const p600 = framedCoverPath(folder, hash16, 600);
console.log(`  VERIFY PASS  hash ${hash16}`);
console.log(`  ${p1200}  ${out.bytes.w1200.byteLength}B`);
console.log(`  ${p600}   ${out.bytes.w600.byteLength}B`);

if (!APPLY) {
  writeFileSync("/tmp/frame-1200.webp", out.bytes.w1200);
  writeFileSync("/tmp/frame-600.webp", out.bytes.w600);
  console.log("  dry run — wrote /tmp/frame-1200.webp, /tmp/frame-600.webp");
  process.exit(0);
}

const bucket = sb.storage.from("squarespace-mirror");
let deduped = 0;
for (const [path, bytes] of [
  [p1200, out.bytes.w1200],
  [p600, out.bytes.w600],
] as const) {
  const { error: upErr } = await bucket.upload(path, bytes, {
    contentType: "image/webp",
    upsert: false,
    cacheControl: "31536000",
  });
  if (upErr) {
    const msg = upErr.message?.toLowerCase() ?? "";
    if (msg.includes("already exists") || msg.includes("duplicate")) deduped++;
    else throw upErr;
  }
}
const publicUrl = bucket.getPublicUrl(p1200).data.publicUrl;

const { error: updErr } = await sb
  .from("inventory_items")
  .update({
    cover_framed_url: publicUrl,
    cover_framed_meta: {
      srcUrl,
      srcHash: out.srcHash,
      hash16,
      recipe: out.recipe,
      bboxPx: out.bboxPx,
      method: out.measurement.method === "alpha" ? "auto-alpha" : "auto-color",
      canvas: [CANVAS_W, CANVAS_H],
      approved: true,
      ruleVersion: RULE_VERSION,
      generatedAt: new Date().toISOString(),
      advisories: out.verify.advisories.map((a) => a.code),
    },
  })
  .eq("id", row.id);
if (updErr) throw updErr;

console.log(`  APPLIED ${deduped ? `(deduped ${deduped}/2) ` : ""}→ ${publicUrl}`);

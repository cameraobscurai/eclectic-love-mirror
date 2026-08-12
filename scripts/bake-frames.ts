#!/usr/bin/env bun
/**
 * Frame Studio 2.4 — batch bake.
 *
 *   bun run scripts/bake-frames.ts --collection lighting \
 *     [--category chandeliers] [--limit N] [--force] [--apply]
 *
 * Renders, verifies, uploads and writes rows for one collection at a time —
 * then STOPS. R8: derivatives reach the live site only when a human clicks
 * Publish. This script never touches the overlay and never publishes.
 *
 * R7: dry run by default. Same modules as `frame-one` (frame-render for
 * pixels, frame-hash for identity, frame-engine for rules) — no second
 * composition path, because two paths could make one URL mean two images (R1).
 *
 * Advisories (SRC_UPSCALED, TIGHT_CROP) are recorded in cover_framed_meta and
 * the run continues. Verifier FAILs produce no bytes, no row write, and land
 * in docs/frame-queue-{collection}.md with a suggested action.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import catalog from "../src/data/inventory/current_catalog.json" with { type: "json" };
import { renderCover } from "./lib/frame-render";
import { resolveCoverSource, type CatalogProduct } from "./lib/frame-source";
import { framedCoverPath, framedHash16 } from "../src/lib/frame-hash";
import { CANVAS_H, CANVAS_W, RULE_VERSION } from "../src/lib/frame-engine";

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = args.includes("--apply");
/**
 * `--force` re-renders a row whose hash already matches. Note it can never
 * overwrite bytes: the hash is recomputed from the same inputs, so it resolves
 * to the same path and the upload dedups with a 409 (R1). It only re-verifies
 * and re-writes the DB row. Do NOT "fix" this into an upsert.
 */
const FORCE = args.includes("--force");
const COLLECTION = flag("collection");
const CATEGORY = flag("category");
const LIMIT = Number(flag("limit") ?? 0) || 0;
const CONCURRENCY = 4;

if (!COLLECTION) {
  console.error("usage: bake-frames.ts --collection <slug> [--category <slug>] [--limit N] [--force] [--apply]");
  process.exit(1);
}

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL_, KEY);
const bucket = sb.storage.from("squarespace-mirror");

// ---------------------------------------------------------------- rows
type Row = {
  id: string;
  rms_id: string | null;
  title: string | null;
  slug: string | null;
  images: string[] | null;
  collection_slug: string | null;
  category_slug: string | null;
  editorial_order: number | null;
  cover_framed_meta: Record<string, unknown> | null;
};

const { data: rowData, error: rowErr } = await sb
  .from("inventory_items")
  .select(
    "id, rms_id, title, slug, images, collection_slug, category_slug, editorial_order, cover_framed_meta",
  )
  .eq("collection_slug", COLLECTION);
if (rowErr) throw rowErr;
const rows = (rowData ?? []) as Row[];

// Live images keyed by rms_id — the merge's "live wins" side.
const liveImages = new Map<string, string[]>();
for (const r of rows) {
  if (r.rms_id) liveImages.set(String(r.rms_id), Array.isArray(r.images) ? r.images : []);
}
const rowByRms = new Map(rows.filter((r) => r.rms_id).map((r) => [String(r.rms_id), r]));

// Tiles = baked catalog products (variants already folded), filtered to this
// collection. Framing a variant row would frame something the site never shows.
const products = (catalog as { products: (CatalogProduct & Record<string, unknown>)[] }).products
  .filter((p) => (p as { collectionSlug?: string }).collectionSlug === COLLECTION)
  .filter((p) => !CATEGORY || (p as { declaredCategory?: string }).declaredCategory === CATEGORY)
  .filter((p) => !String(p.title ?? "").startsWith("ZZ"))
  .sort((a, b) => {
    const ra = rowByRms.get(a.id)?.editorial_order;
    const rb = rowByRms.get(b.id)?.editorial_order;
    const na = ra === null || ra === undefined ? Number.MAX_SAFE_INTEGER : ra;
    const nb = rb === null || rb === undefined ? Number.MAX_SAFE_INTEGER : rb;
    return na - nb || String(a.title ?? "").localeCompare(String(b.title ?? ""));
  });

const slice = LIMIT ? products.slice(0, LIMIT) : products;

console.log(
  `▸ ${COLLECTION}${CATEGORY ? ` / ${CATEGORY}` : ""} — ${slice.length} tiles  ` +
    `[${APPLY ? "APPLY" : "dry run"}${FORCE ? " --force" : ""}]  rule ${RULE_VERSION}`,
);

// ---------------------------------------------------------------- work
type Outcome =
  | { kind: "pass"; product: CatalogProduct; hash16: string; url: string; advisories: string[]; origin: string }
  | { kind: "unchanged"; product: CatalogProduct; hash16: string; url: string | null }
  | { kind: "queued"; product: CatalogProduct; codes: string[]; method: string; srcUrl: string; action: string }
  | { kind: "skipped"; product: CatalogProduct; reason: string };

const results: Outcome[] = [];
let deduped = 0;

const fetchTwice = async (url: string) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
      if (attempt) throw new Error(`fetch ${res.status}`);
    } catch (e) {
      if (attempt) throw e;
    }
  }
  throw new Error("fetch failed");
};

const suggestedAction = (codes: string[]) =>
  codes.includes("V4") ? "replace source photo" : "manual frame";

async function bakeOne(product: CatalogProduct & Record<string, unknown>): Promise<Outcome> {
  const row = rowByRms.get(product.id);
  if (!row) return { kind: "skipped", product, reason: "NO_ROW" };

  const { url: srcUrl, origin } = resolveCoverSource({ product, liveImages });
  if (!srcUrl) return { kind: "skipped", product, reason: "NO_SOURCE" };

  let sourceBytes: Uint8Array;
  try {
    sourceBytes = await fetchTwice(srcUrl);
  } catch (e) {
    return {
      kind: "queued",
      product,
      codes: ["FETCH"],
      method: "n/a",
      srcUrl,
      action: "replace source photo",
    };
  }

  const out = await renderCover({
    sourceBytes,
    categorySlug: row.category_slug,
    collectionSlug: row.collection_slug,
  });

  if (!out.ok || !out.bytes) {
    const codes = out.verify.failures.map((f) => f.code);
    return {
      kind: "queued",
      product,
      codes,
      method: out.measurement.method,
      srcUrl,
      action: suggestedAction(codes),
    };
  }

  const hash16 = await framedHash16(out.srcHash, out.recipe, RULE_VERSION);
  const prior = (row.cover_framed_meta ?? {}) as { hash16?: string };
  const p1200 = framedCoverPath(row.rms_id || row.id, hash16, 1200);
  const p600 = framedCoverPath(row.rms_id || row.id, hash16, 600);
  const publicUrl = bucket.getPublicUrl(p1200).data.publicUrl;

  if (prior.hash16 === hash16 && !FORCE) {
    return { kind: "unchanged", product, hash16, url: publicUrl };
  }

  const advisories = out.verify.advisories.map((a) => a.code);

  if (APPLY) {
    for (const [path, bytes] of [
      [p1200, out.bytes.w1200],
      [p600, out.bytes.w600],
    ] as const) {
      const { error } = await bucket.upload(path, bytes, {
        contentType: "image/webp",
        upsert: false, // R1
        cacheControl: "31536000",
      });
      if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("already exists") || msg.includes("duplicate")) deduped++;
        else throw error;
      }
    }
    const { error: updErr } = await sb
      .from("inventory_items")
      .update({
        cover_framed_url: publicUrl,
        cover_framed_meta: {
          srcUrl,
          srcOrigin: origin,
          srcHash: out.srcHash,
          hash16,
          recipe: out.recipe,
          bboxPx: out.bboxPx,
          method: out.measurement.method === "alpha" ? "auto-alpha" : "auto-color",
          canvas: [CANVAS_W, CANVAS_H],
          approved: true,
          ruleVersion: RULE_VERSION,
          generatedAt: new Date().toISOString(),
          advisories,
        },
      })
      .eq("id", row.id);
    if (updErr) throw updErr;
  }

  return { kind: "pass", product, hash16, url: publicUrl, advisories, origin };
}

// bounded concurrency; one bad row never aborts the run
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, slice.length) }, async () => {
    while (cursor < slice.length) {
      const p = slice[cursor++]!;
      try {
        const r = await bakeOne(p);
        results.push(r);
        const tag =
          r.kind === "pass"
            ? `PASS  ${r.hash16}${r.advisories.length ? `  (${r.advisories.join(",")})` : ""}`
            : r.kind === "unchanged"
              ? "UNCHANGED"
              : r.kind === "queued"
                ? `QUEUED ${r.codes.join(",")}`
                : `SKIP ${r.reason}`;
        console.log(`  ${tag}  ${p.title ?? p.slug ?? p.id}`);
      } catch (e) {
        results.push({ kind: "skipped", product: p, reason: `ERROR ${(e as Error).message}` });
        console.log(`  ERROR  ${p.title ?? p.id}: ${(e as Error).message}`);
      }
    }
  }),
);

// ---------------------------------------------------------------- reports
const date = new Date().toISOString().slice(0, 10);
const passed = results.filter((r) => r.kind === "pass") as Extract<Outcome, { kind: "pass" }>[];
const unchanged = results.filter((r) => r.kind === "unchanged");
const queued = results.filter((r) => r.kind === "queued") as Extract<Outcome, { kind: "queued" }>[];
const skipped = results.filter((r) => r.kind === "skipped") as Extract<Outcome, { kind: "skipped" }>[];

mkdirSync("docs/receipts", { recursive: true });

// 1. the queue — a dated file, not console output. Phase 3's studio reads this.
const queueDoc = [
  `# Frame queue — ${COLLECTION}`,
  ``,
  `Generated ${new Date().toISOString()} · rule ${RULE_VERSION} · ${queued.length} of ${slice.length} tiles queued.`,
  ``,
  `Verifier FAIL means no bytes were produced and no row was written. These are`,
  `photographs the machine declined to publish, not bake failures.`,
  ``,
  `| Title | rms_id | Category | Codes | Measure | Action | Source |`,
  `| --- | --- | --- | --- | --- | --- | --- |`,
  ...queued.map((q) => {
    const row = rowByRms.get(q.product.id);
    return `| ${q.product.title ?? ""} | ${q.product.id} | ${row?.category_slug ?? ""} | ${q.codes.join(" ")} | ${q.method} | ${q.action} | ${q.srcUrl} |`;
  }),
  ``,
  ...(skipped.length
    ? [`## Skipped`, ``, ...skipped.map((s) => `- ${s.product.title ?? s.product.id} — ${s.reason}`), ``]
    : []),
].join("\n");
writeFileSync(`docs/frame-queue-${COLLECTION}.md`, queueDoc);

// 2. advisory histogram + run receipt
const advHist = new Map<string, number>();
for (const p of passed) for (const a of p.advisories) advHist.set(a, (advHist.get(a) ?? 0) + 1);

const receipt = [
  `# Bake receipt — ${COLLECTION}${CATEGORY ? ` / ${CATEGORY}` : ""}`,
  ``,
  `${new Date().toISOString()} · rule ${RULE_VERSION} · ${APPLY ? "APPLIED" : "DRY RUN"}${FORCE ? " --force" : ""}`,
  ``,
  `| Outcome | Count |`,
  `| --- | --- |`,
  `| tiles | ${slice.length} |`,
  `| framed (verify PASS) | ${passed.length} |`,
  `| unchanged (hash match) | ${unchanged.length} |`,
  `| queued (verify FAIL) | ${queued.length} |`,
  `| skipped | ${skipped.length} |`,
  `| uploads deduped (R1 409) | ${deduped} |`,
  ``,
  `## Advisories`,
  ``,
  advHist.size
    ? [...advHist].map(([k, v]) => `- ${k}: ${v}`).join("\n")
    : "- none",
  ``,
  `Queue: [docs/frame-queue-${COLLECTION}.md](../frame-queue-${COLLECTION}.md)`,
  `Contact sheet: \`docs/receipts/contact-sheet-${COLLECTION}-${date}.html\``,
  ``,
  `Not live until a human clicks Publish (R8).`,
  ``,
].join("\n");
writeFileSync(`docs/receipts/bake-${COLLECTION}-${date}.md`, receipt);

// 3. contact sheet — the grid, at tile size, in editorial order. The review
//    question is "does the grid look right", so the review is the grid.
const cells = slice
  .map((p) => {
    const r = results.find((x) => x.product.id === p.id);
    if (!r) return "";
    const src =
      r.kind === "pass" || r.kind === "unchanged"
        ? (r.url ?? "").replace("-1200.webp", "-600.webp")
        : "";
    const state = r.kind === "queued" ? `QUEUED ${r.codes.join(" ")}` : r.kind === "skipped" ? r.reason : "";
    return `<figure class="${r.kind}">${
      src ? `<img loading="lazy" src="${src}" alt="">` : `<div class="ph">${state}</div>`
    }<figcaption>${p.title ?? p.id}${state ? ` — ${state}` : ""}</figcaption></figure>`;
  })
  .join("\n");
writeFileSync(
  `docs/receipts/contact-sheet-${COLLECTION}-${date}.html`,
  `<!doctype html><meta charset="utf-8"><title>${COLLECTION} contact sheet</title>
<style>
 body{background:#fff;color:#1a1a1a;font:12px/1.4 system-ui;margin:24px}
 h1{font-weight:400;letter-spacing:.08em;text-transform:uppercase;font-size:14px}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
 figure{margin:0}
 figure img{width:100%;aspect-ratio:5/4;object-fit:contain;background:#fff;display:block}
 .ph{aspect-ratio:5/4;display:grid;place-items:center;background:#f1f1f1;color:#8a8a8a;text-align:center;padding:8px}
 figcaption{margin-top:6px;text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:#6b6b6b}
 .queued figcaption,.skipped figcaption{color:#a33}
</style>
<h1>${COLLECTION} — ${passed.length} framed · ${queued.length} queued · ${new Date().toISOString().slice(0, 16)}</h1>
<div class="grid">
${cells}
</div>`,
);

console.log(
  `\n  ${slice.length} tiles · ${passed.length} framed · ${unchanged.length} unchanged · ` +
    `${queued.length} queued · ${skipped.length} skipped · ${deduped} deduped`,
);
console.log(`  queue    docs/frame-queue-${COLLECTION}.md`);
console.log(`  receipt  docs/receipts/bake-${COLLECTION}-${date}.md`);
console.log(`  sheet    docs/receipts/contact-sheet-${COLLECTION}-${date}.html`);
console.log(
  APPLY
    ? `\napplied ${passed.length} rows; NOT LIVE until a human clicks Publish`
    : `\ndry run — nothing uploaded, nothing written; NOT LIVE until a human clicks Publish`,
);

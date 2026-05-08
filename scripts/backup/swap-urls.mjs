#!/usr/bin/env node
/**
 * swap-urls.mjs
 * ------------------------------------------------------------------
 * Reads download-manifest.json. For every inventory_items row whose
 * images[] contains a Squarespace URL with a successful mirror, build
 * the new images[] (replacing each Squarespace URL with its bucket
 * public_url, preserving order, leaving non-Squarespace URLs untouched).
 *
 * Default = DRY RUN (writes swap-plan.json, no DB writes).
 * Pass --apply to actually update inventory_items.
 *
 *   node scripts/backup/swap-urls.mjs           # dry run
 *   node scripts/backup/swap-urls.mjs --apply   # write to DB
 *
 * Refuses to apply if download-failed.json is non-empty unless
 * --allow-partial is passed.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(2);
}

const APPLY = process.argv.includes("--apply");
const ALLOW_PARTIAL = process.argv.includes("--allow-partial");
const OUT_DIR = "scripts/backup/out";

const SQS_HOSTS = new Set([
  "images.squarespace-cdn.com",
  "static1.squarespace.com",
]);
function isSquarespace(url) {
  try {
    return SQS_HOSTS.has(new URL(url).host);
  } catch {
    return false;
  }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const manifest = JSON.parse(
    await readFile(join(OUT_DIR, "download-manifest.json"), "utf8")
  );
  let failed = [];
  try {
    failed = JSON.parse(
      await readFile(join(OUT_DIR, "download-failed.json"), "utf8")
    );
  } catch {}
  console.log(
    `→ manifest entries: ${manifest.length}  ·  failures: ${failed.length}`
  );

  if (APPLY && failed.length > 0 && !ALLOW_PARTIAL) {
    console.error(
      `\nRefusing to apply: ${failed.length} downloads failed. ` +
        `Re-run download-squarespace.mjs or pass --allow-partial.`
    );
    process.exit(3);
  }

  // url -> public_url map. If the same URL was downloaded multiple times
  // (different rms_id keys), the first wins; they all 200 to the same bytes.
  const remap = new Map();
  for (const m of manifest) {
    if (!m.original_url || !m.public_url) continue;
    if (!remap.has(m.original_url)) remap.set(m.original_url, m.public_url);
  }
  console.log(`→ unique URLs in remap: ${remap.size}`);

  // Load inventory rows that still have a Squarespace URL.
  const PAGE = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, rms_id, slug, images")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`→ scanned ${rows.length} inventory rows`);

  const plan = [];
  let urlsRewritten = 0;
  let urlsMissing = 0;
  for (const r of rows) {
    if (!Array.isArray(r.images) || r.images.length === 0) continue;
    let touched = false;
    const before = r.images.slice();
    const after = [];
    for (const u of before) {
      if (isSquarespace(u)) {
        const replacement = remap.get(u);
        if (replacement) {
          after.push(replacement);
          touched = true;
          urlsRewritten++;
        } else {
          // No mirror available — leave original in place, flag.
          after.push(u);
          urlsMissing++;
        }
      } else {
        after.push(u);
      }
    }
    if (!touched) continue;
    plan.push({
      id: r.id,
      rms_id: r.rms_id,
      slug: r.slug,
      before,
      after,
      changes: before
        .map((u, i) => (u !== after[i] ? { from: u, to: after[i] } : null))
        .filter(Boolean),
    });
  }

  const summary = [
    `swap-urls.mjs summary`,
    `---------------------`,
    `mode:                       ${APPLY ? "APPLY" : "dry-run"}`,
    `inventory rows scanned:     ${rows.length}`,
    `rows in plan (will change): ${plan.length}`,
    `urls rewritten:             ${urlsRewritten}`,
    `urls without mirror:        ${urlsMissing}`,
    `download failures present:  ${failed.length}`,
    ``,
  ].join("\n");

  await writeFile(
    join(OUT_DIR, "swap-plan.json"),
    JSON.stringify(plan, null, 2)
  );
  await writeFile(join(OUT_DIR, "swap-summary.txt"), summary);
  console.log("\n" + summary);

  if (!APPLY) {
    console.log(
      `Dry run only. Review swap-plan.json, then re-run with --apply.`
    );
    return;
  }

  console.log("→ Applying updates in batches of 50…");
  const applied = [];
  const failures = [];
  const BATCH = 50;
  for (let i = 0; i < plan.length; i += BATCH) {
    const chunk = plan.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (p) => {
        const { error } = await supabase
          .from("inventory_items")
          .update({ images: p.after })
          .eq("id", p.id);
        if (error) {
          failures.push({ id: p.id, rms_id: p.rms_id, error: error.message });
        } else {
          applied.push({ id: p.id, rms_id: p.rms_id, count: p.changes.length });
        }
      })
    );
    process.stdout.write(`\r  ${Math.min(i + BATCH, plan.length)}/${plan.length}`);
  }
  process.stdout.write("\n");

  await writeFile(
    join(OUT_DIR, "swap-applied.json"),
    JSON.stringify({ applied, failures }, null, 2)
  );
  console.log(`✓ applied ${applied.length}  ·  failed ${failures.length}`);
  if (failures.length) {
    console.log(`See swap-applied.json for details.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Phase 1 backfill — write the currently INFERRED family grouping into the
 * declared DB model, byte-identically.
 *
 *   bun scripts/backfill-families.mjs            # dry run, writes nothing
 *   bun scripts/backfill-families.mjs --apply    # commits
 *
 * Source of truth for this one-time run is src/data/inventory/family-map.json,
 * which bake-family-map.mjs derives from the baked catalog. Because that map is
 * catalog-derived and not DB-derived, this lives in a script rather than in the
 * migration: it can assert membership against the JSON before committing, and a
 * failed assert leaves the database untouched.
 *
 * What it writes:
 *   product_families(title, slug, lead_rms_id)
 *   inventory_items.family_id, .family_position
 *
 * What it deliberately leaves NULL:
 *   option_name, variant_label, variant_cover_url
 * Empty pointer = AUTO = today's behaviour, and the Phase 4 configurator gate
 * (option_name set) therefore starts closed on every family.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const raw = JSON.parse(fs.readFileSync("src/data/inventory/family-map.json", "utf8"));

// The map is keyed per-member, so every family appears once per row it holds.
// Collapse to one entry per family, keyed by slug (unique per family tile).
const families = new Map();
for (const entry of Object.values(raw.families)) {
  const prev = families.get(entry.slug);
  if (prev) {
    const same =
      prev.leadId === entry.leadId &&
      prev.members.length === entry.members.length &&
      prev.members.every((m, i) => m.id === entry.members[i].id);
    if (!same) {
      console.error(`ASSERT FAIL: slug "${entry.slug}" has conflicting entries`);
      process.exit(1);
    }
    continue;
  }
  families.set(entry.slug, entry);
}

console.log(
  `family-map generated ${raw.generatedAt}\n` +
    `families: ${families.size}  member rows: ${Object.keys(raw.families).length}`,
);

// ---- Preflight: every member row must exist in the DB -----------------------
const allRms = [...new Set([...families.values()].flatMap((f) => f.members.map((m) => m.id)))];
const found = new Set();
for (let i = 0; i < allRms.length; i += 500) {
  const chunk = allRms.slice(i, i + 500);
  const { data, error } = await sb.from("inventory_items").select("rms_id").in("rms_id", chunk);
  if (error) {
    console.error("Preflight select failed:", error.message);
    process.exit(1);
  }
  for (const r of data) found.add(r.rms_id);
}
const missing = allRms.filter((id) => !found.has(id));
if (missing.length) {
  console.error(
    `ASSERT FAIL: ${missing.length} member rms_ids are not in inventory_items:\n  ` +
      missing.slice(0, 20).join(", ") +
      (missing.length > 20 ? " …" : ""),
  );
  process.exit(1);
}

// Every family's lead must be one of its own members, or the bake would pick a
// cover from a row that isn't in the tile.
for (const f of families.values()) {
  if (!f.members.some((m) => m.id === f.leadId)) {
    console.error(`ASSERT FAIL: family "${f.slug}" lead ${f.leadId} is not among its members`);
    process.exit(1);
  }
}

// No row may belong to two families.
const owner = new Map();
for (const f of families.values()) {
  for (const m of f.members) {
    if (owner.has(m.id)) {
      console.error(
        `ASSERT FAIL: rms_id ${m.id} claimed by both "${owner.get(m.id)}" and "${f.slug}"`,
      );
      process.exit(1);
    }
    owner.set(m.id, f.slug);
  }
}

console.log(
  `preflight OK — ${allRms.length} member rows resolve, leads valid, no double membership`,
);

if (!APPLY) {
  const sample = [...families.values()].slice(0, 3);
  console.log("\nDRY RUN. Sample of what would be written:");
  for (const f of sample) {
    console.log(
      `  ${f.slug}  "${f.title}"  lead=${f.leadId}  members=${f.members.map((m) => m.id).join(",")}`,
    );
  }
  console.log("\nRe-run with --apply to commit.");
  process.exit(0);
}

// ---- Apply ------------------------------------------------------------------
let createdFamilies = 0;
let linkedRows = 0;

for (const f of families.values()) {
  const { data: fam, error: famErr } = await sb
    .from("product_families")
    .upsert({ title: f.title, slug: f.slug, lead_rms_id: f.leadId }, { onConflict: "slug" })
    .select("id")
    .single();
  if (famErr || !fam) {
    console.error(`FAIL creating family ${f.slug}:`, famErr?.message);
    process.exit(1);
  }
  createdFamilies++;

  for (let i = 0; i < f.members.length; i++) {
    const { error } = await sb
      .from("inventory_items")
      .update({ family_id: fam.id, family_position: i })
      .eq("rms_id", f.members[i].id);
    if (error) {
      console.error(`FAIL linking ${f.members[i].id}:`, error.message);
      process.exit(1);
    }
    linkedRows++;
  }
  if (createdFamilies % 20 === 0) {
    console.log(`  …${createdFamilies}/${families.size} families`);
  }
}

// ---- Post-assert: DB membership must match the JSON exactly ------------------
const { data: dbFams, error: vErr } = await sb
  .from("product_families")
  .select("id, slug, lead_rms_id");
if (vErr) {
  console.error("Verify select failed:", vErr.message);
  process.exit(1);
}
const idToSlug = new Map(dbFams.map((f) => [f.id, f.slug]));

const { data: dbRows, error: rErr } = await sb
  .from("inventory_items")
  .select("rms_id, family_id, family_position")
  .not("family_id", "is", null);
if (rErr) {
  console.error("Verify select failed:", rErr.message);
  process.exit(1);
}

let drift = 0;
const dbMembership = new Map();
for (const r of dbRows) {
  const slug = idToSlug.get(r.family_id);
  if (!dbMembership.has(slug)) dbMembership.set(slug, []);
  dbMembership.get(slug).push(r);
}
for (const f of families.values()) {
  const rows = (dbMembership.get(f.slug) ?? []).sort(
    (a, b) => a.family_position - b.family_position,
  );
  const expect = f.members.map((m) => m.id).join(",");
  const actual = rows.map((r) => r.rms_id).join(",");
  if (expect !== actual) {
    console.error(`DRIFT ${f.slug}: expected [${expect}] got [${actual}]`);
    drift++;
  }
}

console.log(`\nfamilies written: ${createdFamilies}  rows linked: ${linkedRows}  drift: ${drift}`);
process.exit(drift === 0 ? 0 : 1);

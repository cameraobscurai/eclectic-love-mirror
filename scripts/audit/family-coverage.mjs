#!/usr/bin/env node
/**
 * Family coverage audit — the worklist for Step A of the variant track.
 *
 * Read-only. Prints, per family, what still blocks the public configurator:
 *   - no option name (family stays a plain gallery)
 *   - variants with no label while an option name is set
 *   - photoless variants
 *   - two variants pinned to the same photo
 *   - duplicate variant labels
 *   - no landing piece (lead_rms_id) set
 *
 *   bun run scripts/audit/family-coverage.mjs          # summary + blockers
 *   bun run scripts/audit/family-coverage.mjs --all    # every family
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const showAll = process.argv.includes("--all");

const norm = (u) => String(u ?? "").split("?")[0];

const [{ data: families, error: fErr }, { data: items, error: iErr }] = await Promise.all([
  db.from("product_families").select("id, title, slug, option_name, lead_rms_id"),
  db
    .from("inventory_items")
    .select("id, rms_id, title, family_id, family_position, variant_label, variant_cover_url, images")
    .not("family_id", "is", null),
]);
if (fErr || iErr) {
  console.error(fErr?.message ?? iErr?.message);
  process.exit(1);
}

const byFamily = new Map();
for (const it of items ?? []) {
  if (!byFamily.has(it.family_id)) byFamily.set(it.family_id, []);
  byFamily.get(it.family_id).push(it);
}

const rows = [];
for (const f of families ?? []) {
  const members = (byFamily.get(f.id) ?? []).sort(
    (a, b) => (a.family_position ?? 9e9) - (b.family_position ?? 9e9),
  );
  const blockers = [];

  if (!f.option_name) blockers.push("no option name");
  if (!f.lead_rms_id) blockers.push("no landing piece");

  const photoless = members.filter((m) => !(m.images ?? []).length);
  if (photoless.length) blockers.push(`${photoless.length} photoless`);

  const labels = members.map((m) => (m.variant_label ?? "").trim().toLowerCase()).filter(Boolean);
  const dupes = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
  if (dupes.length) blockers.push(`duplicate label: ${dupes.join(", ")}`);

  if (f.option_name && labels.length < members.length) {
    blockers.push(`${members.length - labels.length} unlabelled`);
  }

  const pins = members.map((m) => norm(m.variant_cover_url)).filter(Boolean);
  if (new Set(pins).size !== pins.length) blockers.push("shared pinned photo");

  rows.push({ title: f.title, slug: f.slug, members: members.length, blockers });
}

rows.sort((a, b) => b.blockers.length - a.blockers.length || a.title.localeCompare(b.title));

const ready = rows.filter((r) => r.blockers.length === 0);
const configurable = rows.filter((r) => !r.blockers.includes("no option name"));

for (const r of rows) {
  if (!showAll && r.blockers.length === 0) continue;
  console.log(
    `${r.blockers.length ? "•" : "✓"} ${r.title}  (/collection/${r.slug}, ${r.members} pieces)` +
      (r.blockers.length ? `\n    ${r.blockers.join(" · ")}` : ""),
  );
}

console.log(
  `\n${rows.length} families · ${ready.length} fully ready · ${configurable.length} with an option axis · ` +
    `${rows.length - ready.length} still need a pass`,
);

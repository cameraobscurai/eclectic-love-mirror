// Intake-loop test — the one untested assumption in the taxonomy architecture.
//
// The whole declared-taxonomy design rests on a claim that has never actually
// been exercised: when a new RMS export is imported, owner-declared columns on
// existing rows survive untouched, and brand-new RMS products land with NULL
// taxonomy so they surface in the admin Unassigned queue.
//
// If that claim is false, Adrienne's assignments rot silently — products drop
// out of nav weeks before anyone notices, with no error anywhere.
//
// This drives the REAL scripts/import.mjs (not a copy of its logic) against a
// synthetic two-row workbook:
//
//   row A — a seeded row that already carries declared taxonomy + images,
//           with a changed title and stock in the workbook (the clobber test)
//   row B — an rms_id that does not exist (the unassigned-queue test)
//
// Both rows are created and removed by this script. It touches nothing else:
// import.mjs only writes rows whose rms_id appears in the workbook, plus a
// soft-delete pass scoped to rows where rms_id IS NULL.
//
//   node scripts/audit/intake-loop-test.mjs            # dry-run only
//   node scripts/audit/intake-loop-test.mjs --apply    # full round trip
//
// Exit code 0 = intake loop is safe. Non-zero = do not run an import.

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import xlsx from "xlsx";

const APPLY = process.argv.includes("--apply");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key);

// rms_ids far outside the real RMS range so a collision is impossible.
const EXISTING = "9990001";
const NEW = "9990002";

const DECLARED = {
  collection_slug: "lounge-seating",
  category_slug: "lounge-chairs",
  images: ["https://example.invalid/intake-test-cover.png"],
  taxonomy_review: { source: "human", ruledBy: "intake-loop-test" },
};

const failures = [];
const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function cleanup() {
  await sb.from("inventory_items").delete().in("rms_id", [EXISTING, NEW]);
}

async function main() {
  console.log("=== intake loop test ===\n");
  await cleanup(); // in case a prior run aborted

  // ---- seed row A with owner-declared data ------------------------------
  const { error: seedErr } = await sb.from("inventory_items").insert({
    rms_id: EXISTING,
    title: "INTAKE TEST — original title",
    slug: `intake-test-original-${EXISTING}`,
    category: "seating",
    status: "draft",
    quantity: 1,
    public_ready: false,
    ...DECLARED,
  });
  if (seedErr) {
    console.error("seed failed", seedErr);
    process.exit(1);
  }
  console.log(`seeded ${EXISTING} with declared taxonomy + images\n`);

  // ---- build the synthetic workbook --------------------------------------
  // Column names must match the real RMS export exactly.
  const sheet = xlsx.utils.json_to_sheet([
    {
      Id: EXISTING,
      Name: "INTAKE TEST — RMS renamed this",
      "Product Group": "Seating",
      "Current Stock": 4,
      '(W" x D" x H") Dims': '30"W x 32"D x 34"H',
    },
    {
      Id: NEW,
      Name: "INTAKE TEST — brand new product",
      "Product Group": "Tableware",
      "Current Stock": 12,
      '(W" x D" x H") Dims': '10"W x 10"D x 4"H',
    },
  ]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, sheet, "Sheet1");
  const bookPath = path.join(os.tmpdir(), "intake-loop-test.xlsx");
  xlsx.writeFile(wb, bookPath);

  const run = (args) =>
    execFileSync("node", ["scripts/import.mjs", ...args], {
      env: { ...process.env, RMS_WORKBOOK: bookPath },
      encoding: "utf8",
    });

  // ---- dry run -----------------------------------------------------------
  console.log("--- dry run ---");
  const dry = run(["--dry-run"]);
  process.stdout.write(dry.replace(/^/gm, "  "));
  check("dry run reports 1 new / 1 existing", /new: 1 existing: 1/.test(dry), null);
  check(
    "dry run names the protected columns",
    /collection_slug, category_slug, taxonomy_review, images/.test(dry),
  );

  if (!APPLY) {
    console.log("\n[dry-run] pass --apply to execute the real write path.");
    await cleanup();
    return report();
  }

  // ---- apply -------------------------------------------------------------
  console.log("\n--- apply ---");
  const out = run([]);
  process.stdout.write(out.replace(/^/gm, "  "));

  const { data: after } = await sb
    .from("inventory_items")
    .select(
      "rms_id,title,quantity,collection_slug,category_slug,images,taxonomy_review,dimensions_raw",
    )
    .in("rms_id", [EXISTING, NEW]);

  const a = after?.find((r) => String(r.rms_id) === EXISTING);
  const b = after?.find((r) => String(r.rms_id) === NEW);

  console.log("\n--- assertions ---");

  // R6: RMS owns its own fields.
  check("existing row: RMS title applied", a?.title === "INTAKE TEST — RMS renamed this", a?.title);
  check("existing row: RMS stock applied", a?.quantity === 4, String(a?.quantity));
  check("existing row: dimensions applied", !!a?.dimensions_raw, a?.dimensions_raw ?? "null");

  // R6: RMS never owns declared data. This is the clobber test.
  check(
    "existing row: collection_slug preserved",
    a?.collection_slug === DECLARED.collection_slug,
    String(a?.collection_slug),
  );
  check(
    "existing row: category_slug preserved",
    a?.category_slug === DECLARED.category_slug,
    String(a?.category_slug),
  );
  check(
    "existing row: images preserved",
    JSON.stringify(a?.images) === JSON.stringify(DECLARED.images),
    JSON.stringify(a?.images),
  );
  check(
    "existing row: taxonomy_review preserved",
    a?.taxonomy_review?.source === "human",
    JSON.stringify(a?.taxonomy_review),
  );

  // New rows land unassigned so a human classifies them in the studio queue.
  check("new row: inserted", !!b, b ? "" : "missing");
  check(
    "new row: collection_slug is NULL (unassigned queue)",
    b?.collection_slug == null,
    String(b?.collection_slug),
  );
  check(
    "new row: category_slug is NULL (unassigned queue)",
    b?.category_slug == null,
    String(b?.category_slug),
  );
  check("new row: no phantom images", (b?.images ?? []).length === 0, JSON.stringify(b?.images));

  await cleanup();
  console.log("\ncleaned up both test rows.");
  return report();
}

function report() {
  console.log(`\n=== ${checks.filter((c) => c.ok).length}/${checks.length} checks passed ===`);
  if (failures.length) {
    console.error("\nINTAKE LOOP IS UNSAFE — do not run an RMS import:");
    for (const f of failures) console.error(`  · ${f}`);
    process.exit(1);
  }
  console.log("Intake loop is safe: declared data survives, new products land unassigned.");
}

main().catch(async (e) => {
  console.error(e);
  await cleanup();
  process.exit(1);
});

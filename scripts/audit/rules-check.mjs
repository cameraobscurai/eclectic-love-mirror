// rules-check — the standing engineering rules, mechanised.
//
// Rules that live in prose degrade; rules that fail CI don't. Each violation
// message cites its id in docs/DECISIONS.md so the rule explains itself at the
// point of failure instead of needing a human to restate it in a plan review.
//
//   bun run rules:check
//
// Exit 0 = clean. Exit 1 = a rule is broken, with the id and the receipt.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const violations = [];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js|mts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [
  ...walk(path.join(ROOT, "scripts")),
  ...walk(path.join(ROOT, "src")),
].map((f) => ({ file: path.relative(ROOT, f), text: fs.readFileSync(f, "utf8") }));

// ---------------------------------------------------------------------------
// R1 — no new bytes at a published image URL
//
// Scoped to IMAGE uploads. Pointer/metadata writes are supposed to overwrite:
// the overlay snapshot and catalog manifest are pointers, not content. Each
// allowlist entry needs a reason, and the file must cite R1 in a comment.
// ---------------------------------------------------------------------------
const R1_ALLOWLIST = new Map([
  [
    "src/lib/photos-admin.functions.ts",
    "overlay/manifest pointer write — a pointer is supposed to overwrite (R1 exempts non-image bytes)",
  ],
  [
    "src/lib/boh/boh.server.ts",
    "back-of-house working scratch images, never a published catalog URL",
  ],
  [
    "scripts/backup/download-squarespace.mjs",
    "one-time archival mirror of the legacy CDN into cold storage; not a live cover path",
  ],
  [
    "scripts/backup/mirror-catalog-extras.mjs",
    "one-time archival mirror; not a live cover path",
  ],
]);

// An upload whose contentType is an image, or whose payload is clearly image
// bytes, is the thing R1 governs.
const IMAGE_UPSERT =
  /upsert:\s*true/;
const IMAGE_HINT = /image\/(png|jpe?g|webp|avif)|\.png|\.jpg|\.jpeg|\.webp|\.avif/i;

for (const { file, text } of files) {
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (!IMAGE_UPSERT.test(line)) return;
    // Look at the statement neighbourhood, not just the one line.
    const ctx = lines.slice(Math.max(0, i - 4), i + 3).join("\n");
    if (!IMAGE_HINT.test(ctx)) return; // pointer/JSON write — out of R1 scope
    if (R1_ALLOWLIST.has(file)) {
      if (!/R1/.test(text)) {
        violations.push({
          rule: "R1",
          file,
          line: i + 1,
          msg: `allowlisted for "${R1_ALLOWLIST.get(file)}" but the file does not cite R1 in a comment`,
        });
      }
      return;
    }
    violations.push({
      rule: "R1",
      file,
      line: i + 1,
      msg: "image upload with upsert:true — published image URLs never receive new bytes; write a content-hashed path and repoint the row",
    });
  });
}

// ---------------------------------------------------------------------------
// R2 — the public browser never measures pixels
//
// Baseline mode until Frame Studio Phase 5 lands: the count of public-surface
// importers of the live-measurement modules is frozen. It may fall, never rise.
// At Phase 5 this flips to a hard ban and the baseline is deleted.
// ---------------------------------------------------------------------------
const R2_MODULES = [
  "NormalizedProductImage",
  "categoryFit",
  "productPhysicalScale",
  "useImageSilhouette",
];
const R2_BASELINE_FILE = "scripts/audit/r2-baseline.json";
const isPublicSurface = (f) =>
  (f.startsWith("src/routes/collection") || f.startsWith("src/components/collection/")) &&
  !R2_MODULES.some((m) => path.basename(f).startsWith(m));

const r2Current = files
  .filter(({ file }) => isPublicSurface(file))
  .filter(({ text }) =>
    R2_MODULES.some((m) => new RegExp(`from\\s+["'][^"']*${m}["']`).test(text)),
  )
  .map(({ file }) => file)
  .sort();

const baselinePath = path.join(ROOT, R2_BASELINE_FILE);
if (process.argv.includes("--r2-baseline")) {
  fs.writeFileSync(baselinePath, JSON.stringify({ frozen: r2Current }, null, 2));
  console.log(`R2 baseline written: ${r2Current.length} files`);
  process.exit(0);
}
if (fs.existsSync(baselinePath)) {
  const frozen = new Set(JSON.parse(fs.readFileSync(baselinePath, "utf8")).frozen);
  for (const f of r2Current) {
    if (!frozen.has(f)) {
      violations.push({
        rule: "R2",
        file: f,
        line: 0,
        msg: "new public-surface import of a live pixel-measurement module — measurement happens once at ingest, never in the visitor's browser",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// R7 — destructive scripts default to dry-run
// Advisory: a script that writes must mention --apply or --dry-run somewhere.
// ---------------------------------------------------------------------------
const WRITES = /\.(update|insert|upsert|delete)\(|storage\.from\([^)]*\)\.(upload|remove)\(/;
const r7 = [];
for (const { file, text } of files) {
  if (!file.startsWith("scripts/")) continue;
  if (file.startsWith("scripts/audit/")) continue;
  if (!WRITES.test(text)) continue;
  if (/--apply|--dry-run|DRY_RUN|dryRun/.test(text)) continue;
  r7.push(file);
}

// ---------------------------------------------------------------------------
console.log("=== rules-check (docs/DECISIONS.md) ===\n");
for (const v of violations) {
  console.error(`  ${v.rule}  ${v.file}${v.line ? `:${v.line}` : ""}\n      ${v.msg}\n      see docs/DECISIONS.md#${v.rule.toLowerCase()}\n`);
}
console.log(`R1 image-byte overwrites: ${violations.filter((v) => v.rule === "R1").length} violation(s)`);
console.log(`R2 public pixel measurement: ${r2Current.length} importer(s), baseline ${fs.existsSync(baselinePath) ? "locked" : "not set"}`);
if (r7.length) {
  console.log(`\nR7 advisory — writing scripts with no dry-run flag (${r7.length}):`);
  for (const f of r7) console.log(`  · ${f}`);
  console.log("  see docs/DECISIONS.md#r7 — convert on next touch, not in a sweep");
}

if (violations.length) {
  console.error(`\nFAILED — ${violations.length} rule violation(s).`);
  process.exit(1);
}
console.log("\nAll enforced rules pass.");

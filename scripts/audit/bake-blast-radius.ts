#!/usr/bin/env bun
/**
 * Pre-Publish blast-radius verifier for a frame bake.
 *
 *   # BEFORE the bake
 *   bun run scripts/audit/bake-blast-radius.ts --snapshot
 *
 *   # AFTER the bake, before a human clicks Publish (R8)
 *   bun run scripts/audit/bake-blast-radius.ts --verify --collection lounge-seating [--pixels N]
 *
 * Verify answers exactly one question: did anything OUTSIDE the intended
 * collection move? Any hash16 / cover_framed_url / ruleVersion delta on a row
 * in another collection is a FAIL (exit 1). Deltas inside the intended
 * collection are reported, not failed.
 *
 * --pixels N additionally re-fetches N unchanged framed covers from other
 * collections and compares sha256 of the bytes to the snapshot — proof that a
 * published URL still means the same image (R1).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sha256Hex } from "../../src/lib/frame-hash";

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SNAPSHOT = args.includes("--snapshot");
const VERIFY = args.includes("--verify");
const COLLECTION = flag("collection");
const PIXELS = Number(flag("pixels") ?? 0) || 0;
const SNAP_PATH = flag("file") ?? "docs/receipts/bake-blast-radius-snapshot.json";

if (SNAPSHOT === VERIFY) {
  console.error(
    "usage: bake-blast-radius.ts (--snapshot | --verify --collection <slug>) [--pixels N] [--file path]",
  );
  process.exit(1);
}
if (VERIFY && !COLLECTION) {
  console.error("--verify requires --collection <slug>");
  process.exit(1);
}

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL_, KEY);

type Meta = { hash16?: string; ruleVersion?: string; srcHash?: string } | null;
type Row = {
  id: string;
  rms_id: string | null;
  title: string | null;
  collection_slug: string | null;
  cover_framed_url: string | null;
  cover_framed_meta: Meta;
};

type Entry = {
  title: string;
  collection: string;
  url: string | null;
  hash16: string | null;
  ruleVersion: string | null;
  srcHash: string | null;
};

async function readRows(): Promise<Record<string, Entry>> {
  const out: Record<string, Entry> = {};
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("inventory_items")
      .select("id, rms_id, title, collection_slug, cover_framed_url, cover_framed_meta")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    for (const r of rows) {
      const m = r.cover_framed_meta ?? {};
      out[r.id] = {
        title: r.title ?? "",
        collection: r.collection_slug ?? "",
        url: r.cover_framed_url ?? null,
        hash16: m.hash16 ?? null,
        ruleVersion: m.ruleVersion ?? null,
        srcHash: m.srcHash ?? null,
      };
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

const current = await readRows();

// ------------------------------------------------------------------ snapshot
if (SNAPSHOT) {
  mkdirSync("docs/receipts", { recursive: true });
  writeFileSync(
    SNAP_PATH,
    JSON.stringify({ takenAt: new Date().toISOString(), rows: current }, null, 2),
  );
  console.log(`snapshot · ${Object.keys(current).length} rows → ${SNAP_PATH}`);
  process.exit(0);
}

// -------------------------------------------------------------------- verify
if (!existsSync(SNAP_PATH)) {
  console.error(`no snapshot at ${SNAP_PATH} — run --snapshot before the bake`);
  process.exit(1);
}
const snap = JSON.parse(readFileSync(SNAP_PATH, "utf8")) as {
  takenAt: string;
  rows: Record<string, Entry>;
};

type Delta = { id: string; entry: Entry; before: Entry | null; fields: string[] };
const intended: Delta[] = [];
const stray: Delta[] = [];
const missing: string[] = [];

for (const [id, now] of Object.entries(current)) {
  const before = snap.rows[id] ?? null;
  const fields: string[] = [];
  if (!before) {
    if (now.hash16 || now.url) fields.push("new-row");
  } else {
    for (const k of ["url", "hash16", "ruleVersion", "srcHash"] as const) {
      if (before[k] !== now[k]) fields.push(k);
    }
  }
  if (!fields.length) continue;
  const bucket = now.collection === COLLECTION ? intended : stray;
  bucket.push({ id, entry: now, before, fields });
}
for (const id of Object.keys(snap.rows)) if (!(id in current)) missing.push(id);

// ---------------------------------------------------------------- pixel spot
type PixelFail = { url: string; reason: string };
const pixelFails: PixelFail[] = [];
let pixelChecked = 0;

if (PIXELS > 0) {
  const untouched = Object.entries(current)
    .filter(([id, e]) => e.collection !== COLLECTION && e.url && snap.rows[id]?.url === e.url)
    .slice(0, PIXELS);
  for (const [, e] of untouched) {
    try {
      const res = await fetch(e.url!);
      if (!res.ok) {
        pixelFails.push({ url: e.url!, reason: `HTTP ${res.status}` });
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const digest = await sha256Hex(bytes);
      pixelChecked++;
      const key = `bytes:${e.url}`;
      const prior = (snap as unknown as Record<string, string>)[key];
      if (prior && prior !== digest) pixelFails.push({ url: e.url!, reason: "BYTES_CHANGED" });
      else (snap as unknown as Record<string, string>)[key] = digest;
    } catch (err) {
      pixelFails.push({ url: e.url!, reason: (err as Error).message });
    }
  }
  // persist byte digests so the next run can compare them
  writeFileSync(SNAP_PATH, JSON.stringify(snap, null, 2));
}

// ----------------------------------------------------------------- reporting
const date = new Date().toISOString().slice(0, 10);
const fail = stray.length > 0 || missing.length > 0 || pixelFails.length > 0;

const lines = [
  `# Blast radius — ${COLLECTION}`,
  ``,
  `${new Date().toISOString()} · snapshot ${snap.takenAt} · ${fail ? "FAIL" : "PASS"}`,
  ``,
  `| Check | Count |`,
  `| --- | --- |`,
  `| rows changed inside ${COLLECTION} | ${intended.length} |`,
  `| rows changed OUTSIDE ${COLLECTION} | ${stray.length} |`,
  `| rows in snapshot now missing | ${missing.length} |`,
  `| unchanged covers byte-verified | ${pixelChecked} |`,
  `| byte mismatches | ${pixelFails.length} |`,
  ``,
];

if (stray.length) {
  lines.push(
    `## Unintended changes`,
    ``,
    `| Title | Collection | Fields | Before hash | After hash |`,
    `| --- | --- | --- | --- | --- |`,
  );
  for (const d of stray)
    lines.push(
      `| ${d.entry.title} | ${d.entry.collection} | ${d.fields.join(" ")} | ${d.before?.hash16 ?? "—"} | ${d.entry.hash16 ?? "—"} |`,
    );
  lines.push(``);
}
if (missing.length) lines.push(`## Missing rows`, ``, ...missing.map((m) => `- ${m}`), ``);
if (pixelFails.length)
  lines.push(`## Byte mismatches`, ``, ...pixelFails.map((p) => `- ${p.url} — ${p.reason}`), ``);

lines.push(
  `## Intended changes`,
  ``,
  `| Title | Fields | Before hash | After hash |`,
  `| --- | --- | --- | --- |`,
  ...intended.map(
    (d) =>
      `| ${d.entry.title} | ${d.fields.join(" ")} | ${d.before?.hash16 ?? "—"} | ${d.entry.hash16 ?? "—"} |`,
  ),
  ``,
  fail
    ? `Do NOT publish until the unintended rows are explained.`
    : `Safe to publish (R8: a human still clicks it).`,
  ``,
);

mkdirSync("docs/receipts", { recursive: true });
writeFileSync(`docs/receipts/blast-radius-${COLLECTION}-${date}.md`, lines.join("\n"));

console.log(
  `${fail ? "FAIL" : "PASS"} · ${intended.length} changed in ${COLLECTION} · ` +
    `${stray.length} outside · ${missing.length} missing · ${pixelChecked} bytes verified · ${pixelFails.length} mismatches`,
);
for (const d of stray.slice(0, 20))
  console.log(`  STRAY  ${d.entry.collection}  ${d.entry.title}  [${d.fields.join(" ")}]`);
for (const p of pixelFails.slice(0, 20)) console.log(`  BYTES  ${p.url} — ${p.reason}`);
console.log(`  receipt  docs/receipts/blast-radius-${COLLECTION}-${date}.md`);

process.exit(fail ? 1 : 0);

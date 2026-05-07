#!/usr/bin/env node
/**
 * extract-hero-posters.mjs
 * -----------------------
 * Pulls each MP4 from the public `videos` Lovable Cloud bucket and writes a
 * 3:4 cropped first-frame JPG to /public/media/home/<id>-poster.jpg.
 *
 * The clip manifest is the single source of truth — it mirrors
 * src/components/home/clips.ts so the two never drift.
 *
 * Usage:
 *   node scripts/extract-hero-posters.mjs            # all clips
 *   node scripts/extract-hero-posters.mjs 02 04      # subset by id
 *
 * Requirements: ffmpeg in PATH, network access to the Supabase storage URL.
 */
import { spawn } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(PROJECT_ROOT, "public", "media", "home");

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://wdyfavzfquegrxklcpmq.supabase.co";
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/videos`;

// Mirrors src/components/home/clips.ts → HERO_CLIPS
const CLIPS = [
  { id: "01", remote: "01SPRING" },
  { id: "02", remote: "02SUMMER" },
  { id: "03", remote: "03LATESUMER" },
  { id: "04", remote: "04AUTUMN" },
  { id: "05", remote: "05WINTER" },
];

const TARGET_W = 1080;
const TARGET_H = 1440; // 3:4
const SEEK_SECONDS = 0.1; // grab a frame just past t=0 to skip black leader

function run(cmd, args, opts = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { writeFile } = await import("node:fs/promises");
  await writeFile(dest, buf);
  return buf.length;
}

async function extractPoster(srcPath, outPath) {
  await run("ffmpeg", [
    "-y",
    "-loglevel", "error",
    "-ss", String(SEEK_SECONDS),
    "-i", srcPath,
    "-frames:v", "1",
    "-vf", `scale=${TARGET_W}:${TARGET_H}:force_original_aspect_ratio=increase,crop=${TARGET_W}:${TARGET_H}`,
    "-q:v", "3",
    outPath,
  ]);
}

async function main() {
  const wanted = process.argv.slice(2);
  const targets = wanted.length
    ? CLIPS.filter((c) => wanted.includes(c.id))
    : CLIPS;
  if (!targets.length) {
    console.error(`No matching clips for: ${wanted.join(", ")}`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const work = await mkdir(join(tmpdir(), `hero-posters-${Date.now()}`), {
    recursive: true,
  });
  const workDir = work ?? join(tmpdir(), `hero-posters-${Date.now()}`);

  console.log(`📥 Source : ${STORAGE_BASE}`);
  console.log(`📁 Output : ${OUT_DIR}`);
  console.log("");

  for (const clip of targets) {
    const url = `${STORAGE_BASE}/${clip.remote}`;
    const tmp = join(workDir, `${clip.id}.mp4`);
    const out = join(OUT_DIR, `${clip.id}-poster.jpg`);

    process.stdout.write(`• ${clip.id} ${clip.remote.padEnd(12)} `);
    const bytes = await downloadTo(url, tmp);
    process.stdout.write(`↓ ${(bytes / 1e6).toFixed(1)}MB  `);
    await extractPoster(tmp, out);
    const { size } = await stat(out);
    console.log(`→ ${(size / 1024).toFixed(0)}KB  ${out}`);
  }

  await rm(workDir, { recursive: true, force: true });
  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});

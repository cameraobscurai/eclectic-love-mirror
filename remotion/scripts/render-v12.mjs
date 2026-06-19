// Render v12 one-take. Uses --gl=swangle for software WebGL in headless Chromium.
//
// Render is split into TWO HALVES (frames 0–899 and 900–1799) so each invocation
// completes inside the sandbox's 600s code--exec window. The halves are then
// concatenated with ffmpeg.
//
// Usage:
//   node scripts/render-v12.mjs              # render BOTH halves if missing, then concat
//   node scripts/render-v12.mjs --half=1     # render only first half
//   node scripts/render-v12.mjs --half=2     # render only second half
//   node scripts/render-v12.mjs --concat     # concat only (halves must exist)

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const halfArg = args.find((a) => a.startsWith("--half="));
const concatOnly = args.includes("--concat");
const halfTarget = halfArg ? Number(halfArg.split("=")[1]) : null;

const OUT = process.env.OUT || "/mnt/documents/eclectic-hive-onetake-v12.mp4";
const HALF_A = "/tmp/v12-half-a.mp4";
const HALF_B = "/tmp/v12-half-b.mp4";
const SPLIT_FRAME = 900;
const TOTAL_FRAMES = 1800;

async function renderHalf(label, outPath, frameRange) {
  console.log(`[${label}] bundling…`);
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    webpackOverride: (c) => c,
  });

  console.log(`[${label}] launching chromium…`);
  const browser = await openBrowser("chrome", {
    browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
    chromiumOptions: {
      gl: "swangle",
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader"],
    },
    chromeMode: "chrome-for-testing",
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "onetake-v12",
    puppeteerInstance: browser,
  });

  console.log(`[${label}] rendering frames ${frameRange[0]}–${frameRange[1]} → ${outPath}`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outPath,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
    imageFormat: "jpeg",
    jpegQuality: 90,
    crf: 19,
    frameRange,
    chromiumOptions: { gl: "swangle" },
    timeoutInMilliseconds: 120000,
    onProgress: ({ progress }) => {
      const p = Math.round(progress * 100);
      if (p % 5 === 0) process.stdout.write(`  ${label} ${p}%\r`);
    },
  });

  await browser.close({ silent: false });
  console.log(`\n[${label}] done.`);
}

function concat() {
  if (!existsSync(HALF_A) || !existsSync(HALF_B)) {
    console.error("missing halves; cannot concat");
    process.exit(1);
  }
  console.log("[concat] joining halves with ffmpeg…");
  const listFile = "/tmp/v12-concat.txt";
  spawnSync("sh", ["-c", `printf "file '%s'\\nfile '%s'\\n" "${HALF_A}" "${HALF_B}" > ${listFile}`]);
  const r = spawnSync("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listFile,
    "-c", "copy", OUT,
  ], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log("[concat] done →", OUT);
}

if (concatOnly) {
  concat();
} else if (halfTarget === 1) {
  await renderHalf("A", HALF_A, [0, SPLIT_FRAME - 1]);
} else if (halfTarget === 2) {
  await renderHalf("B", HALF_B, [SPLIT_FRAME, TOTAL_FRAMES - 1]);
} else {
  if (!existsSync(HALF_A)) await renderHalf("A", HALF_A, [0, SPLIT_FRAME - 1]);
  if (!existsSync(HALF_B)) await renderHalf("B", HALF_B, [SPLIT_FRAME, TOTAL_FRAMES - 1]);
  concat();
}

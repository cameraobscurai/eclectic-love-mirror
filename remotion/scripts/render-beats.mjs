// Render the 3 MacroBeat variants (A/B/C). Each is 270 frames @ 30fps = 9s.
// Renders sequentially; reuses one bundle + one browser across all three.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].toLowerCase() : null;

const BEATS = [
  { id: "macro-beat-a", out: "/mnt/documents/eclectic-hive-beat-a.mp4" },
  { id: "macro-beat-b", out: "/mnt/documents/eclectic-hive-beat-b.mp4" },
  { id: "macro-beat-c", out: "/mnt/documents/eclectic-hive-beat-c.mp4" },
];
const targets = only ? BEATS.filter((b) => b.id.endsWith(only)) : BEATS;

console.log("bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

console.log("launching chromium…");
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    gl: "swangle",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader"],
  },
  chromeMode: "chrome-for-testing",
});

for (const beat of targets) {
  console.log(`[${beat.id}] selecting composition…`);
  const composition = await selectComposition({
    serveUrl: bundled,
    id: beat.id,
    puppeteerInstance: browser,
  });

  console.log(`[${beat.id}] rendering → ${beat.out}`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: beat.out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
    imageFormat: "jpeg",
    jpegQuality: 90,
    crf: 18,
    chromiumOptions: { gl: "swangle" },
    timeoutInMilliseconds: 120000,
    onProgress: ({ progress }) => {
      const p = Math.round(progress * 100);
      if (p % 10 === 0) process.stdout.write(`  ${beat.id} ${p}%\r`);
    },
  });
  console.log(`\n[${beat.id}] done.`);
}

await browser.close({ silent: false });
console.log("all beats complete.");

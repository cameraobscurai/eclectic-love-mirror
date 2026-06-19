import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "site-reel",
  puppeteerInstance: browser,
});

const out = process.env.OUT || "/mnt/documents/stylebrief-site-v11-wide.mp4";
console.log("rendering →", out);

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: out,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  imageFormat: "jpeg",
  jpegQuality: 92,
  crf: 18,
  onProgress: ({ progress }) => {
    if (Math.round(progress * 100) % 5 === 0) process.stdout.write(`  ${Math.round(progress * 100)}%\r`);
  },
});

await browser.close({ silent: false });
console.log("\ndone:", out);

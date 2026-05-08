#!/usr/bin/env node
/**
 * Visual regression runner.
 *
 *   node scripts/visual-regression/run.mjs --check     # diff vs baselines
 *   node scripts/visual-regression/run.mjs --update    # rewrite baselines
 *   node scripts/visual-regression/run.mjs --url=https://... --check
 *
 * Layout:
 *   __visual__/baseline/<slug>-<viewport>.png   (committed)
 *   __visual__/current/<slug>-<viewport>.png   (gitignored, fresh each run)
 *   __visual__/diff/<slug>-<viewport>.png      (gitignored, only on fail)
 */

import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROUTES,
  VIEWPORTS,
  DIFF_OPTIONS,
  DEFAULT_BASE_URL,
} from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const VR_DIR = path.join(ROOT, "__visual__");
const BASELINE = path.join(VR_DIR, "baseline");
const CURRENT = path.join(VR_DIR, "current");
const DIFF = path.join(VR_DIR, "diff");

const args = process.argv.slice(2);
const MODE = args.includes("--update") ? "update" : "check";
const URL_ARG = args.find((a) => a.startsWith("--url="));
const BASE_URL = URL_ARG ? URL_ARG.slice(6) : DEFAULT_BASE_URL;

for (const dir of [BASELINE, CURRENT, DIFF]) {
  fs.mkdirSync(dir, { recursive: true });
}
// Clear current/diff each run so stale files don't mislead.
for (const dir of [CURRENT, DIFF]) {
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
}

// Hide cursor dot + freeze any animations Playwright can't disable on its
// own. Injected on every page before navigation.
const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  [data-cursor], video { visibility: hidden !important; }
`;

async function captureOne(page, route, viewport) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });

  const url = new URL(route.path, BASE_URL);
  url.searchParams.set("vr", "1"); // routes can opt-in to deterministic mode

  await page.goto(url.toString(), { waitUntil: "networkidle", timeout: 30_000 });
  await page.addStyleTag({ content: FREEZE_CSS });

  if (route.waitFor) {
    await page
      .waitForSelector(route.waitFor, { timeout: 10_000 })
      .catch(() => null);
  }
  // Settle: fonts + lazy images.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(600);

  const clip = route.fullPage
    ? undefined
    : {
        x: 0,
        y: 0,
        width: viewport.width,
        height: Math.round(viewport.height * (route.extraHeightFactor ?? 1)),
      };

  return await page.screenshot({
    type: "png",
    fullPage: !!route.fullPage,
    clip,
    animations: "disabled",
    caret: "hide",
  });
}

function loadPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function diffImages(baselineFile, currentFile, diffFile) {
  const a = loadPng(baselineFile);
  const b = loadPng(currentFile);
  if (a.width !== b.width || a.height !== b.height) {
    return {
      ok: false,
      reason: `size mismatch: baseline ${a.width}x${a.height} vs current ${b.width}x${b.height}`,
      ratio: 1,
    };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(
    a.data,
    b.data,
    diff.data,
    a.width,
    a.height,
    { threshold: DIFF_OPTIONS.threshold },
  );
  const ratio = changed / (a.width * a.height);
  if (ratio > DIFF_OPTIONS.failPixelRatio) {
    fs.writeFileSync(diffFile, PNG.sync.write(diff));
    return { ok: false, reason: `${(ratio * 100).toFixed(2)}% pixels changed`, ratio };
  }
  return { ok: true, ratio };
}

async function main() {
  console.log(`[vr] mode=${MODE}  base=${BASE_URL}`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  const results = [];
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      const name = `${route.slug}-${viewport.name}.png`;
      process.stdout.write(`  ${name.padEnd(40)} `);
      let buf;
      try {
        buf = await captureOne(page, route, viewport);
      } catch (err) {
        console.log(`FAIL (capture: ${err.message})`);
        results.push({ name, ok: false });
        continue;
      }
      const currentFile = path.join(CURRENT, name);
      fs.writeFileSync(currentFile, buf);

      if (MODE === "update") {
        fs.writeFileSync(path.join(BASELINE, name), buf);
        console.log("BASELINED");
        results.push({ name, ok: true });
        continue;
      }

      const baselineFile = path.join(BASELINE, name);
      if (!fs.existsSync(baselineFile)) {
        console.log("NEW (no baseline — run --update)");
        results.push({ name, ok: false });
        continue;
      }
      const diffFile = path.join(DIFF, name);
      const r = diffImages(baselineFile, currentFile, diffFile);
      if (r.ok) {
        console.log(`PASS (${(r.ratio * 100).toFixed(3)}%)`);
        results.push({ name, ok: true });
      } else {
        console.log(`FAIL — ${r.reason}\n     diff: ${diffFile}`);
        results.push({ name, ok: false });
      }
    }
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n[vr] ${results.length - failed.length}/${results.length} passed`,
  );
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("[vr] crashed:", err);
  process.exit(2);
});

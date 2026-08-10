import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:8080';
const EXECUTABLE = fs.existsSync('/bin/chromium') ? '/bin/chromium' : undefined;

function groupIntoRows(tiles) {
  const sorted = [...tiles].sort((a, b) => a.bottom - b.bottom);
  const rows = [];
  for (const tile of sorted) {
    const row = rows.find((r) => Math.abs(r.anchor - tile.bottom) < 160);
    if (row) {
      row.tiles.push(tile);
      row.anchor = (row.anchor * (row.tiles.length - 1) + tile.bottom) / row.tiles.length;
    } else {
      rows.push({ anchor: tile.bottom, tiles: [tile] });
    }
  }
  return rows;
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  const url = `${BASE}/collection?group=lighting&n=floor-lamps`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(300);
  }
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);

  const tiles = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')].filter((img) => {
      const r = img.getBoundingClientRect();
      if (r.width < 60 || r.height < 60) return false;
      const title = (img.alt || '').trim();
      return !!title && title === title.toUpperCase();
    });

    const probeCache = new Map();
    const probe = (src) => {
      if (probeCache.has(src)) return probeCache.get(src);
      const p = new Promise((resolve) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.decoding = 'async';
        im.onload = () => resolve(im);
        im.onerror = () => resolve(null);
        im.src = src;
      });
      probeCache.set(src, p);
      return p;
    };

    const silhouette = (im) => {
      const w = im.naturalWidth;
      const h = im.naturalHeight;
      if (!w || !h) return null;
      const side = 160;
      const s = Math.min(1, side / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * s));
      const ch = Math.max(1, Math.round(h * s));
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      try {
        ctx.drawImage(im, 0, 0, cw, ch);
        const px = ctx.getImageData(0, 0, cw, ch).data;
        let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const i = (y * cw + x) * 4;
            if (px[i + 3] < 12) continue;
            if (px[i] > 244 && px[i + 1] > 244 && px[i + 2] > 244) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
        if (x1 < 0) return null;
        return { x0: x0 / cw, y0: y0 / ch, x1: (x1 + 1) / cw, y1: (y1 + 1) / ch };
      } catch {
        return null;
      }
    };

    const out = [];
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      const title = (img.alt || '').trim();
      if (img.naturalWidth === 0) {
        out.push({ title, broken: true });
        continue;
      }
      const im = await probe(img.currentSrc || img.src);
      const box = im ? silhouette(im) : null;
      if (!box) {
        out.push({ title, unmeasurable: true });
        continue;
      }
      const natAspect = img.naturalWidth / img.naturalHeight;
      const boxAspect = r.width / r.height;
      const contentW = natAspect >= boxAspect ? r.width : r.height * natAspect;
      const contentH = natAspect >= boxAspect ? r.width / natAspect : r.height;
      const left = r.left + (r.width - contentW) / 2;
      const top = r.top + (r.height - contentH) / 2;
      out.push({
        title,
        left: Math.round(left + contentW * box.x0),
        w: Math.round(contentW * (box.x1 - box.x0)),
        h: Math.round(contentH * (box.y1 - box.y0)),
        top: Math.round(top + contentH * box.y0 + window.scrollY),
        bottom: Math.round(top + contentH * box.y1 + window.scrollY),
        tileHeight: Math.round(r.height),
        tileTop: Math.round(r.top + window.scrollY),
        tileBottom: Math.round(r.bottom + window.scrollY),
      });
    }
    return out;
  });

  const measured = tiles.filter((t) => !t.broken && !t.unmeasurable);
  const broken = tiles.filter((t) => t.broken);
  const unmeasurable = tiles.filter((t) => t.unmeasurable);

  const rows = groupIntoRows(measured);

  console.log(JSON.stringify({ url, totalHeight, tileCount: tiles.length, measured, broken, unmeasurable, rows, consoleErrors }, null, 2));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/browser/lighting.png', fullPage: true });

  await browser.close();
}

main();

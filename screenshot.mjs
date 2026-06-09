import { chromium } from "playwright";
import fs from "node:fs";

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1874, height: 1130 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  console.log("Navigating to URL...");
  await page.goto('https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection?group=lighting&subcategory=all&sort=type&layout=grid', { waitUntil: 'networkidle', timeout: 60000 });
  console.log("Taking screenshot...");
  await page.screenshot({ path: '/mnt/documents/full_page_screenshot.png', fullPage: true });
  console.log("Screenshot saved to /mnt/documents/full_page_screenshot.png");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

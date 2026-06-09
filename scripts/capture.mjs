import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1874, height: 1130 }
  });
  const page = await context.newPage();
  const url = "https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection?group=storage&subcategory=all&sort=type&layout=grid";
  console.log(`Navigating to ${url}...`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    // Handle possible redirects or waits
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "screenshot.png", fullPage: true });
    console.log("Screenshot saved to screenshot.png");
  } catch (e) {
    console.error("Error capturing screenshot:", e);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

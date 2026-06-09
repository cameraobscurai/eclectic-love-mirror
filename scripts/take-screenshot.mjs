import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1874, height: 1130 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const url = "https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection?group=chandeliers&subcategory=all&sort=type&layout=grid";
  console.log("Navigating to:", url);
  
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  
  // Wait for content to load
  await page.waitForTimeout(2000); 

  const screenshotPath = path.resolve("screenshot.png");
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
  });

  console.log("Screenshot saved to:", screenshotPath);
  await browser.close();
}

main().catch(console.error);

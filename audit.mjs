import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ executablePath: '/bin/chromium' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('response', response => {
    if (response.status() >= 400) networkErrors.push(`${response.url()}: ${response.status()}`);
  });

  try {
    await page.goto('http://localhost:8080/atelier', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`FAILED TO LOAD: ${e.message}`);
    await browser.close();
    process.exit(1);
  }

  const ignore = ["React DevTools", "[vite]", "hydration", "non-static position", "GA/GTM", "google-analytics", "googletagmanager"];
  const filter = (arr) => arr.filter(e => !ignore.some(p => e.toLowerCase().includes(p.toLowerCase())));

  const filteredConsole = filter(consoleErrors);
  const filteredPage = filter(pageErrors);
  const filteredNetwork = filter(networkErrors);

  if (filteredConsole.length) console.log(`CONSOLE ERROR: ${filteredConsole.join(', ')}`);
  if (filteredPage.length) console.log(`PAGE ERROR: ${filteredPage.join(', ')}`);
  if (filteredNetwork.length) console.log(`NETWORK ERROR: ${filteredNetwork.join(', ')}`);

  const images = await page.$$eval('img', imgs => imgs.map(img => ({
    src: img.src,
    alt: img.alt,
    naturalWidth: img.naturalWidth
  })));

  let broken = 0;
  for (const img of images) {
    if (img.naturalWidth === 0) {
      console.log(`IMAGE BROKEN: ${img.src} (alt: ${img.alt})`);
      broken++;
    }
  }
  if (broken === 0) console.log("CLEAN: All images loaded.");

  // FAQ check - The prompt asked for "Working with the Hive" FAQ section.
  // The code has id="working-with-the-hive" but text "WORKING WITH THE ATELIER".
  const faqSection = await page.$('#working-with-the-hive');
  if (!faqSection) {
    console.log("SECTION MISSING: FAQ section with id 'working-with-the-hive'");
  } else {
    const summary = await page.$('#working-with-the-hive summary');
    if (!summary) console.log("FAQ ERROR: No summary found in FAQ");
    else {
      await summary.click();
      await new Promise(r => setTimeout(r, 500));
      const details = await page.$('#working-with-the-hive details');
      const isOpen = await details.evaluate(el => el.open);
      if (!isOpen) console.log("FAQ ERROR: Accordion (details) failed to expand");
      else console.log("FAQ SUCCESS: Accordion expanded");
    }
  }

  const teamHeading = await page.evaluate(() => document.body.innerText.includes('ARTISTS, DESIGNERS, CRAFTSMEN'));
  if (!teamHeading) console.log("SECTION MISSING: Team section heading");
  else console.log("TEAM SUCCESS: Team section found");

  const title = await page.title();
  const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
  const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => null);

  console.log(`TITLE: ${title}`);
  console.log(`DESC: ${description}`);
  console.log(`OG:IMAGE: ${ogImage}`);

  if (!title) console.log("METADATA MISSING: Title");
  if (!description) console.log("METADATA MISSING: Description");
  if (!ogImage) console.log("METADATA MISSING: og:image");
  else if (!ogImage.startsWith('https://')) console.log(`METADATA ERROR: og:image not absolute HTTPS (${ogImage})`);

  const content = await page.evaluate(() => document.body.innerText);
  const placeholders = ["undefined", "null", "[object Object]", "Lorem", "REPLACE"];
  let placeholdersFound = [];
  for (const p of placeholders) {
    if (content.includes(p)) placeholdersFound.push(p);
  }
  if (placeholdersFound.length) console.log(`PLACEHOLDER FOUND: ${placeholdersFound.join(', ')}`);
  else console.log("CLEAN: No placeholders found.");

  const screenshotDir = '/tmp/browser/audit-atelier';
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  let currentScroll = 0;
  let i = 1;
  while (currentScroll < totalHeight) {
    await page.evaluate(sc => window.scrollTo(0, sc), currentScroll);
    await new Promise(r => setTimeout(r, 500));
    const filename = `full_${i}.png`;
    await page.screenshot({ path: `${screenshotDir}/${filename}` });
    if (i === 1) fs.copyFileSync(`${screenshotDir}/${filename}`, `${screenshotDir}/full.png`);
    currentScroll += 1800;
    i++;
    // Re-check totalHeight in case of dynamic expansion
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight > totalHeight) { /* allow loop to continue */ }
  }
  console.log(`SCREENSHOTS SAVED: ${i-1} files in ${screenshotDir}`);

  await browser.close();
})();

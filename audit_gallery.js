const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1800 }
  });
  const page = await context.newPage();

  const errors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console Error: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });
  page.on('requestfailed', request => {
    networkErrors.push(`Request Failed: ${request.url()} (${request.failure().errorText})`);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  console.log('--- Navigating to /gallery ---');
  await page.goto('http://localhost:8080/gallery', { waitUntil: 'networkidle' });

  // 1. Meta data
  const title = await page.title();
  const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => 'MISSING');
  const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => 'MISSING');
  console.log(`METADATA: Title: ${title}, Description: ${description}, OG:Image: ${ogImage}`);

  // 2. Placeholder text
  const bodyText = await page.innerText('body');
  const placeholders = ['Lorem ipsum', 'placeholder', 'TBD', '[', ']', 'FIXME', 'TODO'];
  const foundPlaceholders = placeholders.filter(p => bodyText.toLowerCase().includes(p.toLowerCase()));
  if (foundPlaceholders.length > 0) {
    console.log(`PLACEHOLDERS: Found: ${foundPlaceholders.join(', ')}`);
  }

  // 3. Gallery Images
  const galleryImages = await page.$$('img');
  let brokenImages = 0;
  for (let i = 0; i < Math.min(galleryImages.length, 40); i++) {
    const isBroken = await galleryImages[i].evaluate(img => img.naturalWidth === 0);
    if (isBroken) brokenImages++;
  }
  console.log(`GALLERY_IMAGES: Total checked: ${Math.min(galleryImages.length, 40)}, Broken: ${brokenImages}`);

  await page.screenshot({ path: '/tmp/browser/audit-gallery/top.png' });

  // 4. Project Pages
  const projectLinks = await page.$$eval('a[href^="/gallery/"]', links => links.map(a => a.href));
  const uniqueLinks = [...new Set(projectLinks)].slice(0, 2);
  
  for (const link of uniqueLinks) {
    console.log(`--- Navigating to project: ${link} ---`);
    await page.goto(link, { waitUntil: 'networkidle' });
    
    const pTitle = await page.title();
    const pImgs = await page.$$('img');
    let pBroken = 0;
    for (const img of pImgs) {
      if (await img.evaluate(i => i.naturalWidth === 0)) pBroken++;
    }
    console.log(`PROJECT_PAGE ${link}: Title: ${pTitle}, Broken Images: ${pBroken}`);
    
    if (link === uniqueLinks[0]) {
      await page.screenshot({ path: '/tmp/browser/audit-gallery/project.png' });
    }
  }

  console.log('--- Errors ---');
  errors.forEach(e => console.log(e));
  networkErrors.forEach(e => console.log(e));

  await browser.close();
})();

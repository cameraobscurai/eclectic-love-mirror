import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
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
    networkErrors.push(`FAILED: ${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`);
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
  let brokenImagesCount = 0;
  for (let i = 0; i < Math.min(galleryImages.length, 40); i++) {
    const isBroken = await galleryImages[i].evaluate(img => img.naturalWidth === 0);
    if (isBroken) {
        const src = await galleryImages[i].getAttribute('src');
        console.log(`BROKEN_IMAGE: ${src}`);
        brokenImagesCount++;
    }
  }
  console.log(`GALLERY_IMAGES_SUMMARY: Total checked: ${Math.min(galleryImages.length, 40)}, Broken: ${brokenImagesCount}`);

  await page.screenshot({ path: '/tmp/browser/audit-gallery/top.png' });

  console.log('--- Network Errors ---');
  if (networkErrors.length > 0) [...new Set(networkErrors)].forEach(e => console.log(e));
  else console.log('None');

  await browser.close();
})();

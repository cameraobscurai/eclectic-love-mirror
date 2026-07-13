const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1800 }
  });
  const page = await context.newPage();

  const findings = [];
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      if (!/React DevTools|\[vite\]|hydration|non-static position|GA\/GTM|Google Tag Manager/.test(text)) {
        consoleErrors.push(`Console Error: ${text}`);
      }
    }
  });

  page.on('pageerror', err => {
    if (!/React DevTools|\[vite\]|hydration|non-static position|GA\/GTM|Google Tag Manager/.test(err.message)) {
      consoleErrors.push(`Page Error: ${err.message}`);
    }
  });

  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push(`Network ${status}: ${response.url()}`);
    }
  });

  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  } catch (e) {
    findings.push(`BLOCKER: Failed to load page: ${e.message}`);
    console.log(JSON.stringify(findings));
    await browser.close();
    process.exit(1);
  }

  // Check metadata
  const title = await page.title();
  if (!title || title === 'Lovable App' || title === 'Lovable Generated Project') {
    findings.push(`HIGH: Metadata title is missing or generic ("${title}")`);
  }

  const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
  if (!description) {
    findings.push(`MED: Metadata description is missing`);
  }

  const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => null);
  if (!ogImage) {
    findings.push(`MED: Metadata og:image is missing`);
  } else if (!ogImage.startsWith('https://')) {
    findings.push(`MED: Metadata og:image is not an absolute https URL: ${ogImage}`);
  }

  // Check broken images
  const brokenImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).filter(img => {
      return !img.complete || img.naturalWidth === 0;
    }).map(img => img.src);
  });
  brokenImages.forEach(src => findings.push(`HIGH: Broken image: ${src}`));

  // Check video/poster
  const heroVideo = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video) return 'missing';
    const hasSource = video.querySelector('source') || video.src;
    const hasPoster = video.poster;
    const isVisible = video.offsetWidth > 0 && video.offsetHeight > 0;
    if (!hasSource && !hasPoster) return 'empty';
    if (!isVisible) return 'hidden';
    return 'ok';
  });
  if (heroVideo !== 'ok') {
    findings.push(`MED: Hero video issues: ${heroVideo}`);
  }

  // Check for placeholder text
  const bodyText = await page.innerText('body');
  const placeholders = ['undefined', 'null', '[object Object]', '{{', '}}'];
  placeholders.forEach(p => {
    if (bodyText.includes(p)) {
      findings.push(`HIGH: Placeholder text "${p}" found in DOM`);
    }
  });

  // Collect console and network errors
  consoleErrors.forEach(err => findings.push(`HIGH: ${err}`));
  networkErrors.forEach(err => findings.push(`HIGH: ${err}`));

  await page.screenshot({ path: '/tmp/browser/audit-home/home.png', fullPage: true });

  console.log(JSON.stringify(findings, null, 2));

  await browser.close();
})();

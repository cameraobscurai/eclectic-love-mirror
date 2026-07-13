import { chromium, type Page, type Request, type ConsoleMessage } from 'playwright';

async function auditPage(page: Page, url: string, name: string) {
  console.log(`\n--- Auditing ${name}: ${url} ---`);
  const errors: string[] = [];
  const networkErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (err) => {
    const msg = err.message;
    if (!msg.includes('React DevTools') && !msg.includes('[vite]') && !msg.includes('hydration') && !msg.includes('non-static position') && !msg.includes('GA/GTM')) {
      consoleErrors.push(`PageError: ${msg}`);
    }
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('React DevTools') && !text.includes('[vite]') && !text.includes('hydration') && !text.includes('non-static position') && !text.includes('GA/GTM')) {
        consoleErrors.push(`ConsoleError: ${text}`);
      }
    }
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push(`HTTP ${status}: ${response.url()}`);
    }
  });

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (!response || response.status() >= 400) {
      errors.push(`Page failed to load or returned ${response?.status()}`);
    }
    await page.waitForTimeout(3000); 
  } catch (e: any) {
    networkErrors.push(`Navigation Failed: ${e.message}`);
    return { consoleErrors, networkErrors, errors };
  }

  // 3. Product tile images
  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).slice(0, 60);
    return imgs.filter(img => img.naturalWidth === 0).map(img => img.src);
  });
  const totalImgs = await page.evaluate(() => document.querySelectorAll('img').length);
  if (brokenImages.length > 0) {
    errors.push(`Broken Images (${brokenImages.length}): ${brokenImages.slice(0, 3).join(', ')}`);
  }
  if (totalImgs === 0 && name !== 'PDP') {
    errors.push('No images found on page');
  }

  // 4. Filter chips
  const chipCount = await page.getByRole('button').count();
  if (chipCount === 0 && name !== 'PDP') {
    errors.push('No buttons/chips found (expected filter facets)');
  }

  // 5. Metadata
  const metadata = await page.evaluate(() => {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    };
  });
  if (!metadata.title || metadata.title === 'Vite + React + TS') errors.push(`Title Invalid: ${metadata.title}`);
  if (!metadata.description) errors.push('Missing Description');
  if (metadata.ogImage && !metadata.ogImage.startsWith('https')) errors.push(`Invalid OG Image: ${metadata.ogImage}`);
  else if (!metadata.ogImage) errors.push('Missing OG Image');

  // 6. Undefined/null/[object Object]
  const placeholderText = await page.evaluate(() => {
    const text = document.body.innerText;
    const matches = text.match(/undefined|null|\[object Object\]/gi);
    return matches ? Array.from(new Set(matches)).slice(0, 5) : [];
  });
  if (placeholderText.length > 0) {
    errors.push(`Leaking Placeholders: ${placeholderText.join(', ')}`);
  }

  // 7. Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const footerFound = await page.evaluate(() => !!document.querySelector('footer'));
  if (!footerFound) errors.push('Footer not found');

  // 8. Screenshots
  if (name === 'Collection') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: '/tmp/browser/audit-collection/top.png' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.screenshot({ path: '/tmp/browser/audit-collection/bottom.png' });
  }

  if (consoleErrors.length) console.log(`[CONSOLE] ${consoleErrors.join(' | ')}`);
  if (networkErrors.length) console.log(`[NETWORK] ${networkErrors.join(' | ')}`);
  if (errors.length) console.log(`[ERRORS] ${errors.join(' | ')}`);
  if (!consoleErrors.length && !networkErrors.length && !errors.length) console.log('CLEAN');

  return { consoleErrors, networkErrors, errors };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });

  try {
    // 1. Audit /collection
    await auditPage(page, 'http://localhost:8080/collection', 'Collection');

    // Find any valid link from the collection page to proceed
    const allLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.href));
    
    const categoryUrl = allLinks.find(href => href.includes('/collection/') && href !== 'http://localhost:8080/collection' && !href.includes('?'));
    if (categoryUrl) {
      await auditPage(page, categoryUrl, 'Category');
    } else {
      console.log('\n--- No category links found ---');
    }

    const pdpUrl = allLinks.find(href => href.includes('/product/'));
    if (pdpUrl) {
      await auditPage(page, pdpUrl, 'PDP');
    } else {
      console.log('\n--- No product links found ---');
    }

  } catch (err) {
    console.error('Fatal:', err);
  } finally {
    await browser.close();
  }
})();

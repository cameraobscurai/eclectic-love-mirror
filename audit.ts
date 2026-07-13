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
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    // Wait for either product tiles or a known element
    await page.waitForTimeout(5000); 
  } catch (e: any) {
    networkErrors.push(`Navigation Failed: ${e.message}`);
    return { consoleErrors, networkErrors, errors };
  }

  // 3. Product tile images
  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).slice(0, 60);
    return imgs.filter(img => img.naturalWidth === 0).map(img => img.src);
  });
  if (brokenImages.length > 0) {
    errors.push(`Broken Images (${brokenImages.length}): ${brokenImages.slice(0, 3).join(', ')}`);
  }

  // 4. Filter chips
  const chipCount = await page.getByRole('button').count();
  if (chipCount === 0) {
    errors.push('No buttons found (expected filter facets)');
  }

  // 5. Metadata
  const metadata = await page.evaluate(() => {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    };
  });
  if (!metadata.title || metadata.title === 'Vite + React + TS') errors.push(`Title: ${metadata.title}`);
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
  await page.waitForTimeout(2000);
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

    // 2. Audit a category page
    const categoryUrl = 'http://localhost:8080/collection/pillows-throws';
    await auditPage(page, categoryUrl, 'Category');

    // 3. Audit a product page (first link found on collection)
    await page.goto('http://localhost:8080/collection');
    await page.waitForTimeout(2000);
    const pdpUrl = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/product/"]');
      return link ? (link as HTMLAnchorElement).href : null;
    });
    if (pdpUrl) {
      await auditPage(page, pdpUrl, 'PDP');
    } else {
      console.log('\n--- PDP Audit Skipped: No product link found ---');
    }

  } catch (err) {
    console.error('Fatal:', err);
  } finally {
    await browser.close();
  }
})();

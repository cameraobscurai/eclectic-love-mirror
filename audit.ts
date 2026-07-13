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
    const type = msg.type();
    if (type === 'error') {
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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait a bit more for dynamic content
    await page.waitForTimeout(2000);
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
    // Try looking for elements that look like chips if role=button is not used
    const possibleChips = await page.evaluate(() => document.querySelectorAll('[class*="chip"], [class*="filter"]').length);
    if (possibleChips === 0) {
      errors.push('No buttons/chips found (expected filter facets)');
    }
  }

  // 5. Metadata
  const metadata = await page.evaluate(() => {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    };
  });
  if (!metadata.title || metadata.title === 'Vite + React + TS') errors.push('Default/Missing Title');
  if (!metadata.description) errors.push('Missing Description');
  if (metadata.ogImage && !metadata.ogImage.startsWith('https')) errors.push(`Invalid OG Image (not absolute https): ${metadata.ogImage}`);
  else if (!metadata.ogImage) errors.push('Missing OG Image');

  // 6. Undefined/null/[object Object]
  const placeholderText = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let node;
    while(node = walker.nextNode()) {
      if (node.textContent?.match(/undefined|null|\[object Object\]/i)) {
        nodes.push(node.textContent.trim());
      }
    }
    return Array.from(new Set(nodes)).slice(0, 5);
  });
  if (placeholderText.length > 0) {
    errors.push(`Leaking Placeholders: ${placeholderText.join(', ')}`);
  }

  // 7. Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const footerFound = await page.evaluate(() => !!document.querySelector('footer'));
  if (!footerFound) {
    errors.push('Footer not found');
  }

  // 8. Screenshots
  if (name === 'Collection') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: '/tmp/browser/audit-collection/top.png' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.screenshot({ path: '/tmp/browser/audit-collection/bottom.png' });
  }

  // Output results
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
    // Audit /collection
    await auditPage(page, 'http://localhost:8080/collection', 'Collection');

    // Find a category link
    const categoryLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const catLink = links.find(a => a.href.includes('/collection/') && a.href !== 'http://localhost:8080/collection' && !a.href.includes('#'));
      return catLink ? catLink.href : null;
    });

    if (categoryLink) {
      await auditPage(page, categoryLink, 'Category');
    } else {
      console.log('\n--- Category Audit Skipped (No links found) ---');
    }

    // Find first product tile and click
    await page.goto('http://localhost:8080/collection');
    await page.waitForTimeout(2000);
    const pdpUrl = await page.evaluate(() => {
      const productLink = document.querySelector('a[href*="/product/"]');
      return productLink ? (productLink as HTMLAnchorElement).href : null;
    });

    if (pdpUrl) {
      await auditPage(page, pdpUrl, 'PDP');
    } else {
      console.log('\n--- PDP Audit Skipped (No product links found) ---');
    }
  } catch (err) {
    console.error('Fatal error during audit:', err);
  } finally {
    await browser.close();
  }
})();

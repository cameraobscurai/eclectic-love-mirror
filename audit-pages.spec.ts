import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

test.describe('QA Audit', () => {
  test.beforeAll(async () => {
    await ensureDir('/tmp/browser/audit-contact');
    await ensureDir('/tmp/browser/audit-stylebrief');
  });

  test('Audit /contact', async ({ page }) => {
    console.log('Starting /contact audit...');
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.url()}: ${response.status()}`);
      }
    });

    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle' });

    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    
    // Check form inputs
    const inputs = await page.locator('input, textarea, select').all();
    console.log(`Found ${inputs.length} inputs/textareas/selects`);

    await page.screenshot({ path: '/tmp/browser/audit-contact/before-submit.png' });

    // Fill form
    await page.fill('input[placeholder*="Name" i]', 'Audit Test');
    await page.fill('input[placeholder*="Email" i]', 'audit@example.com');
    await page.fill('input[placeholder*="Phone" i]', '555-0100');
    // For vision, find the textarea
    await page.locator('textarea').fill('This is an audit test message.');

    console.log('Form filled. Submitting...');

    // Intercept POST to notify-inquiry OR the supabase insert
    // Contact page inserts into supabase first, then calls notify-inquiry.
    // Let's just wait for both or either.
    const notifyPromise = page.waitForResponse(r => r.url().includes('notify-inquiry'), { timeout: 15000 }).catch(() => null);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    const notifyResponse = await notifyPromise;
    if (notifyResponse) {
      console.log('Notify response status:', notifyResponse.status());
    } else {
      console.log('Notify response NOT detected or timed out.');
    }

    // Success state
    try {
      await expect(page.locator('text=/Thank you|Success|Received/i').first()).toBeVisible({ timeout: 10000 });
      console.log('Success message visible.');
    } catch (e) {
      console.log('Success message NOT found.');
    }

    await page.screenshot({ path: '/tmp/browser/audit-contact/after-submit.png' });

    console.log('--- /contact Audit Results ---');
    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Console Errors:', consoleErrors.filter(e => !e.includes('known noise')));
    console.log('Page Errors:', pageErrors);
    console.log('Network Errors:', networkErrors);
  });

  test('Audit /stylebrief', async ({ page }) => {
    console.log('Starting /stylebrief audit...');
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.url()}: ${response.status()}`);
      }
    });

    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${BASE_URL}/stylebrief`, { waitUntil: 'networkidle' });

    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');

    await page.screenshot({ path: '/tmp/browser/audit-stylebrief/before-submit.png' });

    // Fill form
    await page.fill('input[placeholder*="Name" i]', 'Audit Test');
    await page.fill('input[placeholder*="Email" i]', 'audit@example.com');
    await page.fill('input[placeholder*="Phone" i]', '555-0100');
    // vibe is the textarea
    await page.locator('textarea').fill('Audit test brief vibe.');

    console.log('Form filled. Submitting...');

    const notifyPromise = page.waitForResponse(r => r.url().includes('notify-inquiry'), { timeout: 15000 }).catch(() => null);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    const notifyResponse = await notifyPromise;
    if (notifyResponse) {
      console.log('Notify response status:', notifyResponse.status());
    } else {
      console.log('Notify response NOT detected or timed out.');
    }

    // Success state - /stylebrief navigates to /stylebrief/thanks
    try {
      await expect(page).toHaveURL(/.*\/stylebrief\/thanks.*/, { timeout: 10000 });
      console.log('Redirected to thanks page.');
    } catch (e) {
      console.log('Redirect to thanks page FAILED.');
    }

    await page.screenshot({ path: '/tmp/browser/audit-stylebrief/after-submit.png' });

    console.log('--- /stylebrief Audit Results ---');
    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Console Errors:', consoleErrors.filter(e => !e.includes('known noise')));
    console.log('Page Errors:', pageErrors);
    console.log('Network Errors:', networkErrors);
  });
});

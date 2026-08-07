import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

// Noise we never want to gate CI on (dev-server HMR chatter, third-party media).
const NOISE = [
  /favicon/i,
  /\[vite\]/i,
  /Download the React DevTools/i,
  /ResizeObserver loop/i,
];

function watch(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (NOISE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    if (res.status() >= 400 && !NOISE.some((re) => re.test(res.url()))) {
      networkErrors.push(`${res.url()}: ${res.status()}`);
    }
  });

  return { consoleErrors, pageErrors, networkErrors };
}

/**
 * These are form *health* checks, not submissions. CI must never post a real
 * inquiry — that would land in the owner's inbox and the inquiries table on
 * every push. We verify the fields exist, accept input, and that the page
 * stays clean; the submit path is covered by the server-side tests.
 */
test.describe('QA Audit', () => {
  test('Audit /contact', async ({ page }) => {
    const h = watch(page);

    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${BASE_URL}/contact`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/\S/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /\S/,
    );

    await page.getByLabel(/^name/i).fill('Audit Test');
    await page.getByLabel(/^email/i).fill('audit@example.com');
    await page.getByLabel(/^phone/i).fill('555-0100');
    await page.locator('textarea').first().fill('This is an audit test message.');

    await expect(page.getByLabel(/^name/i)).toHaveValue('Audit Test');
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();

    expect(h.pageErrors, h.pageErrors.join('\n')).toEqual([]);
    expect(h.consoleErrors, h.consoleErrors.join('\n')).toEqual([]);
    expect(h.networkErrors, h.networkErrors.join('\n')).toEqual([]);
  });

  test('Audit /stylebrief', async ({ page }) => {
    const h = watch(page);

    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${BASE_URL}/stylebrief`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/\S/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /\S/,
    );

    await page.getByLabel(/^name/i).fill('Audit Test');
    await page.getByLabel(/^email/i).fill('audit@example.com');
    await page.getByLabel(/^phone/i).fill('555-0100');
    await page.getByLabel(/vision notes/i).fill('Audit test brief vibe.');

    await expect(page.getByLabel(/^email/i)).toHaveValue('audit@example.com');
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();

    expect(h.pageErrors, h.pageErrors.join('\n')).toEqual([]);
    expect(h.consoleErrors, h.consoleErrors.join('\n')).toEqual([]);
    expect(h.networkErrors, h.networkErrors.join('\n')).toEqual([]);
  });
});

import { test, expect } from '@playwright/test';

// Regression guard: the "View full page" link inside QuickView must navigate
// to /collection/<slug>, NOT dump the user back to the collection grid.
// Previously the <Link> was swallowed by the parent route's ?view state
// machine — we now use a plain <a href>, and this test locks that behavior.

test('QuickView "view full page" lands on the PDP', async ({ page }) => {
  test.setTimeout(60_000);

  // Grab any real product slug from the catalog snapshot, then open the
  // QuickView directly via the route's ?view=<slug> state param. This
  // avoids brittle tile-selector coupling while still exercising the exact
  // modal + "view full page" wiring users hit in production.
  await page.goto('/collection', { waitUntil: 'domcontentloaded' });
  const slug = await page.evaluate(async () => {
    const res = await fetch('/src/data/inventory/current_catalog.json');
    const data = await res.json();
    return data.products?.[0]?.slug as string;
  });
  expect(slug, 'catalog must expose at least one product slug').toBeTruthy();
  await page.goto(`/collection?view=${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded' });

  // Modal opens with the "View full page" link.
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  const link = dialog.getByRole('link', { name: /view full page/i });
  await expect(link).toBeVisible();

  // Href must point at a /collection/<slug> PDP — plain <a>, not intercepted.
  const href = await link.getAttribute('href');
  expect(href, 'view full page link must have href').toBeTruthy();
  expect(href!).toMatch(/^\/collection\/[^/?#]+$/);

  await Promise.all([
    page.waitForURL(new RegExp(`${href!.replace(/[/]/g, '\\/')}$`), { timeout: 15_000 }),
    link.click(),
  ]);

  // Landed on the PDP, not bounced back to the grid.
  expect(new URL(page.url()).pathname).toBe(href);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

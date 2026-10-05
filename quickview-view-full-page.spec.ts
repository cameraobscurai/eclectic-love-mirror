import { test, expect } from "@playwright/test";

// Regression guard: the "View full page" link inside QuickView must navigate
// to /collection/<slug>, NOT dump the user back to the collection grid.
// Quick View masks the address bar to the product URL while the archive
// stays mounted. The full-page action must unmask into the real PDP.

test('QuickView "view full page" lands on the PDP', async ({ page }) => {
  test.setTimeout(60_000);

  // Grab any real product slug from the catalog snapshot, then open the
  // QuickView directly via the route's ?view=<slug> state param. This
  // avoids brittle tile-selector coupling while still exercising the exact
  // modal + "view full page" wiring users hit in production.
  await page.goto("/collection", { waitUntil: "domcontentloaded" });
  const product = await page.evaluate(async () => {
    const res = await fetch("/src/data/inventory/current_catalog.json");
    const data = await res.json();
    return data.products?.[0] as { slug: string; title: string };
  });
  const { slug } = product;
  expect(slug, "catalog must expose at least one product slug").toBeTruthy();
  await page.goto(`/collection?view=${encodeURIComponent(slug)}`, {
    waitUntil: "domcontentloaded",
  });

  // Modal opens with the "View full page" link.
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  const link = dialog.getByRole("link", { name: /view (?:the )?full page/i });
  await expect(link).toBeVisible();

  // Href must point at a /collection/<slug> PDP — plain <a>, not intercepted.
  const href = await link.getAttribute("href");
  expect(href, "view full page link must have href").toBeTruthy();
  expect(href!).toMatch(/^\/collection\/[^/?#]+$/);

  await link.click();

  // The URL may already match before clicking because of masking. Require
  // the modal to close and the actual product heading to render as well.
  await expect(dialog).not.toBeVisible();
  expect(new URL(page.url()).pathname).toBe(href);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://eclectichive.com${href}`,
  );
});

// Quick View is the middle layer between the grid and the PDP: clicking a
// tile must open the modal over the archive; closing restores its URL and filters.
test("tile click opens Quick View without leaving the collection page", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/collection?group=lounge-seating&cat=sofas-loveseats", {
    waitUntil: "domcontentloaded",
  });
  const tile = page.locator("button:has(.product-tile-media)").first();
  await tile.waitFor({ state: "visible", timeout: 30_000 });
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000); // let hydration attach the tile handler
  const archiveUrl = page.url();
  await tile.click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  const link = dialog.getByRole("link", { name: /view (?:the )?full page/i });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^\/collection\/[^/?#]+$/);
  expect(new URL(page.url()).pathname).toBe(href);
  await expect(tile).toBeAttached();

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(archiveUrl);
  await expect(tile).toBeVisible();
});

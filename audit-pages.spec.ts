import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:8080";

// Noise we never want to gate CI on (dev-server HMR chatter, third-party media).
const NOISE = [/favicon/i, /\[vite\]/i, /Download the React DevTools/i, /ResizeObserver loop/i];

function watch(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (NOISE.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("response", (res) => {
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
test.describe("QA Audit", () => {
  test("Audit /contact", async ({ page }) => {
    const h = watch(page);

    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${BASE_URL}/contact`, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/\S/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);

    await page.getByLabel(/^name/i).fill("Audit Test");
    await page.getByLabel(/^email/i).fill("audit@example.com");
    await page.getByLabel(/^phone/i).fill("555-0100");
    await page.locator("textarea").first().fill("This is an audit test message.");

    await expect(page.getByLabel(/^name/i)).toHaveValue("Audit Test");
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();

    expect(h.pageErrors, h.pageErrors.join("\n")).toEqual([]);
    expect(h.consoleErrors, h.consoleErrors.join("\n")).toEqual([]);
    expect(h.networkErrors, h.networkErrors.join("\n")).toEqual([]);
  });

  test("Audit /stylebrief", async ({ page }) => {
    const h = watch(page);

    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto(`${BASE_URL}/stylebrief`, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/\S/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);

    await page.getByLabel(/^name/i).fill("Audit Test");
    await page.getByLabel(/^email/i).fill("audit@example.com");
    await page.getByLabel(/^phone/i).fill("555-0100");
    await page.getByLabel(/vision notes/i).fill("Audit test brief vibe.");

    await expect(page.getByLabel(/^email/i)).toHaveValue("audit@example.com");
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();

    expect(h.pageErrors, h.pageErrors.join("\n")).toEqual([]);
    expect(h.consoleErrors, h.consoleErrors.join("\n")).toEqual([]);
    expect(h.networkErrors, h.networkErrors.join("\n")).toEqual([]);
  });
});

test.describe("Rental search appearance", () => {
  const site = "https://eclectichive.com";
  const pieces = [
    ["pejra-antique-silver-cocktail-set-2990", "Pejra Antique Silver Cocktail Set"],
    ["marceline-brass-folding-bar-cart-3008", "Marceline Brass Folding Bar Cart"],
    ["grey-hills-linen-ottoman-129", "Grey Hills Linen Ottoman"],
  ];

  for (const [slug, name] of pieces) {
    test(`inquiry page for ${name}`, async ({ page }) => {
      const path = `/collection/${slug}`;
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByRole("button", { name: /add to inquiry/i })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", site + path);
      const nodes = await page.locator('script[type="application/ld+json"]').allTextContents();
      const graph = nodes.map((text) => JSON.parse(text));
      expect(graph).toContainEqual(
        expect.objectContaining({ "@type": "ItemPage", name, url: site + path }),
      );
      expect(nodes.join("")).not.toMatch(/"@type"\s*:\s*"(Product|Offer|AggregateOffer)"/);
    });
  }

  test("Dining remains a landing page until Browse Dining is selected", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/collection/dining", { waitUntil: "domcontentloaded" });
    // The server-rendered link is visible before the client router starts.
    const openMenu = page.getByRole("button", { name: "Open menu" });
    const closeMenu = page.getByRole("button", { name: "Close menu" });
    await expect(async () => {
      if (!(await closeMenu.isVisible())) await openMenu.click({ timeout: 1500 });
      await expect(closeMenu).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 30000 });
    await closeMenu.click();
    await expect(page).toHaveURL(/\/collection\/dining$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      site + "/collection/dining",
    );
    await page.getByRole("link", { name: "Browse Dining" }).click();
    await expect(page).toHaveURL(/\/collection\?group=dining$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      site + "/collection",
    );
  });

  test("archive returns 200 directly and old filter links keep their selections", async ({
    request,
  }) => {
    const archive = await request.get("/collection", { maxRedirects: 0 });
    expect(archive.status()).toBe(200);
    const legacy = await request.get(
      "/collection?group=dining&subcategory=all&q=table&sort=az&layout=wall&view=",
    );
    expect(legacy.status()).toBe(200);
    const url = new URL(legacy.url());
    expect(Object.fromEntries(url.searchParams)).toEqual({
      group: "dining",
      q: "table",
      sort: "az",
      layout: "wall",
    });
  });
});

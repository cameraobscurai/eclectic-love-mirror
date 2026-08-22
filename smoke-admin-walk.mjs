import { chromium } from "playwright";

const BASE = "http://localhost:8080";
const results = [];
function log(name, pass, evidence) {
  results.push({ name, pass, evidence });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name} :: ${evidence}`);
}

const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
let cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// inject cookies if provided
try {
  const cookies = JSON.parse(cookiesJson || "[]");
  if (Array.isArray(cookies) && cookies.length) {
    await context.addCookies(cookies);
  }
} catch (e) {
  console.log("cookie parse skip:", e.message);
}

const page = await context.newPage();
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });

// inject localStorage session before navigating to admin
await page.evaluate(
  ([key, val]) => {
    if (key && val) localStorage.setItem(key, val);
  },
  [storageKey, sessionJson],
);

// (a) admin products list
await page.goto(BASE + "/admin/products", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/browser/a-products-list.png", fullPage: true });
let rowCount = await page.locator("table tbody tr").count();
let noMatchText = await page.locator("text=No products match").count();
log(
  "a) /admin/products loads with rows",
  rowCount > 0 && noMatchText === 0,
  `rowCount=${rowCount}, url=${page.url()}`,
);

// (b) filters + sort enumerate
const filterResults = [];
async function countRowsAfterWait() {
  await page.waitForTimeout(900);
  const rows = await page.locator("table tbody tr").count();
  const blank = await page.locator("text=No products match").count();
  return { rows, blank };
}

// collection select
const colSelect = page.locator('select[aria-label="Filter by collection"]');
const colOptions = await colSelect.locator("option").allTextContents();
for (const label of colOptions.slice(0, 6)) {
  // cap to keep runtime reasonable, but note if truncated
  await colSelect.selectOption({ label });
  const { rows, blank } = await countRowsAfterWait();
  filterResults.push({ type: "collection", value: label, rows, blank });
}
await colSelect.selectOption({ label: colOptions[0] });
await page.waitForTimeout(600);

// status/ready select
const readySelect = page.locator('select[aria-label="Filter by visibility"]');
const readyOptions = await readySelect.locator("option").allTextContents();
for (const label of readyOptions) {
  await readySelect.selectOption({ label });
  const { rows, blank } = await countRowsAfterWait();
  filterResults.push({ type: "ready", value: label, rows, blank });
}
await readySelect.selectOption({ label: readyOptions[0] });
await page.waitForTimeout(600);

// sort select
const sortSelect = page.locator('select[aria-label="Sort list"]');
const sortOptions = await sortSelect.locator("option").allTextContents();
for (const label of sortOptions) {
  await sortSelect.selectOption({ label });
  const { rows, blank } = await countRowsAfterWait();
  filterResults.push({ type: "sort", value: label, rows, blank });
}

await page.screenshot({ path: "/tmp/browser/b-filters-sort-final.png", fullPage: true });
console.log("FILTER_RESULTS", JSON.stringify(filterResults, null, 2));
const anyBlank = filterResults.some((f) => f.blank > 0 || f.rows === 0);
log("b) filters/sort return rows (no blank grid)", !anyBlank, JSON.stringify(filterResults));

// (c) product edit drawer opens
await page.goto(BASE + "/admin/products", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const firstRow = page.locator("table tbody tr").first();
await firstRow.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: "/tmp/browser/c-edit-drawer.png", fullPage: true });
// heuristic: look for a drawer/dialog element with input fields
const drawerInputs = await page.locator("input, textarea, select").count();
const urlHasId = /[?&]id=/.test(page.url());
log(
  "c) product edit drawer opens & renders fields",
  urlHasId && drawerInputs > 5,
  `url=${page.url()}, formControls=${drawerInputs}`,
);

// (d) Publish bar on /admin/photos
await page.goto(BASE + "/admin/photos", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/browser/d-photos-publish.png", fullPage: true });
const publishText = await page.locator("text=/publish/i").count();
log(
  "d) Publish bar renders on /admin/photos",
  publishText > 0,
  `publishMatches=${publishText}, url=${page.url()}`,
);

// (e) taxonomy chip counts
await page.goto(BASE + "/admin/taxonomy", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/browser/e-taxonomy.png", fullPage: true });
const chipButtons = await page.locator("button").filter({ hasText: /\d/ }).count();
const chipText = await page
  .locator('button:has-text("Confirm")')
  .first()
  .textContent()
  .catch(() => null);
log(
  "e) /admin/taxonomy loads with chip counts",
  chipButtons > 0,
  `chipButtonsWithDigits=${chipButtons}, sampleChip="${chipText}"`,
);

// (f) inquiries inbox
await page.goto(BASE + "/admin/inquiries", { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/browser/f-inquiries.png", fullPage: true });
log(
  "f) inquiries inbox opens (redirects to /admin/insights)",
  page.url().includes("/admin/insights"),
  `finalUrl=${page.url()}`,
);

await browser.close();

console.log("\n\nSUMMARY_JSON", JSON.stringify(results, null, 2));

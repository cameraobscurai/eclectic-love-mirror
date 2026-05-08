// Visual regression matrix.
// Each route is captured at every viewport. Masks are CSS selectors of
// volatile regions (videos, animated overlays) covered with solid black
// before pixel diffing — kills false positives without hiding real shifts.

export const VIEWPORTS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1366", width: 1366, height: 768 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

export const ROUTES = [
  {
    path: "/atelier",
    slug: "atelier",
    waitFor: 'img[alt*="moodboard" i]',
    masks: [],
    // Capture top 1.2 viewports — hero region is what we care about.
    fullPage: false,
    extraHeightFactor: 1.2,
  },
  {
    path: "/collection",
    slug: "collection-overview",
    waitFor: 'a[href^="/collection/"], button[aria-label*="sofas" i]',
    masks: [],
    fullPage: false,
    extraHeightFactor: 1.0,
  },
  {
    path: "/collection/sofas",
    slug: "collection-sofas",
    // Wait for first product image to settle.
    waitFor: 'img[alt]:not([alt=""])',
    masks: [],
    fullPage: false,
    extraHeightFactor: 1.5,
  },
];

// Pixelmatch tuning.
export const DIFF_OPTIONS = {
  // Per-pixel threshold (0 strict → 1 loose). 0.1 ignores anti-aliasing.
  threshold: 0.1,
  // Fail run when this fraction of pixels differ.
  failPixelRatio: 0.005, // 0.5%
};

// Default base URL — override with --url=... flag.
export const DEFAULT_BASE_URL =
  process.env.VR_BASE_URL ||
  "https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app";

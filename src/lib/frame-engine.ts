/**
 * Frame Studio — the engine. (Phase 2, task 2.1)
 *
 * PURE MODULE. No React, no Supabase, no sharp, no fetch, no IO. Every export
 * takes decoded pixels or plain numbers and returns plain data. That purity is
 * the whole point: it is what makes task 2.3's golden fixtures fast and exact,
 * and it is the acceptance gate for this task.
 *
 * Three surfaces:
 *   measureSilhouette() — where is the object in this image?
 *   placeSilhouette()   — where should it land on the canvas?
 *   verify()            — did the render actually put it there?
 *
 * Rendering (sharp) is task 2.2 and lives elsewhere. This module never touches
 * bytes it did not receive as an argument.
 *
 * Relationship to the legacy client solver: `categoryFit.ts` /
 * `NormalizedProductImage.tsx` remain frozen and untouched until Phase 5. The
 * rule table below is a PORT, not an import, with one deliberate difference —
 * see NO CLAMPS.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Canvas contract (R5)
// ─────────────────────────────────────────────────────────────────────────────

export const CANVAS_W = 1500;
export const CANVAS_H = 1200;
export const FRAME_ASPECT = CANVAS_W / CANVAS_H; // 1.25

/** Output sizes the renderer emits (encodings of the one 1500x1200 render). */
export const OUTPUT_SIZES = [
  { w: 1200, h: 960 },
  { w: 600, h: 480 },
] as const;

/**
 * Sizes V5 accepts. The render canvas is included because `verify` runs on the
 * 1500x1200 composition — before any bytes are encoded, returned, or uploaded.
 */
export const VERIFY_SIZES = [{ w: CANVAS_W, h: CANVAS_H }, ...OUTPUT_SIZES] as const;


/** V6 byte ceiling per derivative. */
export const MAX_DERIVATIVE_BYTES = 400_000;

/**
 * Matches the legacy solver's tile inset so ported targets keep their meaning.
 * Silhouette metrics are multiplied by this before the target math.
 */
export const TILE_IMAGE_INSET = 0.94;

// ─────────────────────────────────────────────────────────────────────────────
// Recipe schema — declared in full NOW (amendment 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The hashed unit is the recipe, not the placement. Phase 2 populates only
 * `placement`; `crop`/`rotate`/`bg`/`shadow`/`normalize` arrive in Phase 3.5.
 * They exist in the type today so that no derivative ever re-hashes for schema
 * reasons — absent keys are OMITTED from the canonical form, never nulled, so
 * a placement-only recipe hashes identically before and after 3.5 lands.
 */
export type RecipePlacement = {
  /** Multiplier on the silhouette's frame-space size. */
  scale: number;
  /** Translation in canvas fractions (not percent). */
  offsetX: number;
  offsetY: number;
};

export type RecipeCrop = { x: number; y: number; w: number; h: number };

export type FrameRecipe = {
  crop?: RecipeCrop;
  /** Degrees, positive = clockwise. */
  rotate?: number;
  bg?: string;
  shadow?: { opacity: number; blur: number; offsetY: number };
  normalize?: boolean;
  placement: RecipePlacement;
};

/** Fixed key order for canonicalization. Never reorder — it changes hashes. */
const RECIPE_KEY_ORDER = [
  "crop",
  "rotate",
  "bg",
  "shadow",
  "normalize",
  "placement",
] as const;

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

function canonValue(v: unknown): unknown {
  if (typeof v === "number") return round4(v);
  if (Array.isArray(v)) return v.map(canonValue);
  if (v && typeof v === "object") {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    // Deterministic ordering for nested objects; absent keys stay absent.
    for (const k of Object.keys(src).sort()) {
      if (src[k] === undefined) continue;
      out[k] = canonValue(src[k]);
    }
    return out;
  }
  return v;
}

/**
 * Canonical JSON for hashing. 4-decimal rounding, fixed top-level key order,
 * absent keys omitted (never nulled). Task 2.2 hashes
 * sha256(srcHash + ruleVersion + canonicalizeRecipe(recipe)).slice(0, 16).
 */
export function canonicalizeRecipe(recipe: FrameRecipe): string {
  const out: Record<string, unknown> = {};
  for (const k of RECIPE_KEY_ORDER) {
    const v = (recipe as Record<string, unknown>)[k];
    if (v === undefined || v === null) continue;
    out[k] = canonValue(v);
  }
  return JSON.stringify(out);
}

/** Bump when the rule table or solver math changes meaning. */
export const RULE_VERSION = "fs2-2026-08-12";

// ─────────────────────────────────────────────────────────────────────────────
// measureSilhouette
// ─────────────────────────────────────────────────────────────────────────────

export type RawImage = {
  /** Row-major, `channels` bytes per pixel. */
  data: Uint8Array | Uint8ClampedArray;
  w: number;
  h: number;
  channels: number;
};

/** Pixel-space bounding box of the subject. */
export type PixelBBox = { x: number; y: number; w: number; h: number };

export type MeasureMethod = "alpha" | "color" | "fail";

export type Measurement = {
  bbox: PixelBBox | null;
  method: MeasureMethod;
  /** 0–1. Rough trust signal; 0 when method === 'fail'. */
  confidence: number;
};

const ALPHA_THRESHOLD = 12;
const ALPHA_PATH_MIN_TRANSPARENT = 0.05;
const COLOR_PATH_MIN_BG = 198;

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function bboxFrom(
  raw: RawImage,
  isSubject: (i: number) => boolean,
): { box: PixelBBox | null; hits: number } {
  let minX = raw.w;
  let minY = raw.h;
  let maxX = -1;
  let maxY = -1;
  let hits = 0;
  for (let y = 0; y < raw.h; y++) {
    for (let x = 0; x < raw.w; x++) {
      const i = (y * raw.w + x) * raw.channels;
      if (!isSubject(i)) continue;
      hits++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0 || maxY < 0) return { box: null, hits: 0 };
  return {
    box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    hits,
  };
}

/**
 * Alpha path when the image carries real transparency (≥5% of pixels below
 * alpha 12), otherwise the border-ring-median colour path: sample the full
 * perimeter, require a genuinely light background (min channel > 198), and
 * treat anything outside tolerance as subject. Never guesses — an image with a
 * dirty or dark background returns method 'fail' with a null bbox rather than
 * an invented box.
 */
export function measureSilhouette(raw: RawImage): Measurement {
  const { data, w, h, channels } = raw;
  if (!w || !h || !channels || data.length < w * h * channels) {
    return { bbox: null, method: "fail", confidence: 0 };
  }

  const total = w * h;

  // ── Alpha path ────────────────────────────────────────────────────────────
  if (channels >= 4) {
    let transparent = 0;
    for (let i = 3; i < data.length; i += channels) {
      if (data[i]! < ALPHA_THRESHOLD) transparent++;
    }
    if (transparent / total >= ALPHA_PATH_MIN_TRANSPARENT) {
      const { box } = bboxFrom(raw, (i) => data[i + 3]! >= ALPHA_THRESHOLD);
      if (!box) return { bbox: null, method: "fail", confidence: 0 };
      // Confidence drops as the subject approaches the full frame (a tight
      // crop is valid but leaves the engine no margin to judge placement).
      const coverage = (box.w * box.h) / total;
      return {
        bbox: box,
        method: "alpha",
        confidence: coverage > 0.98 ? 0.6 : 0.95,
      };
    }
  }

  // ── Border-ring-median colour path ────────────────────────────────────────
  const ringR: number[] = [];
  const ringG: number[] = [];
  const ringB: number[] = [];
  const pushPixel = (x: number, y: number) => {
    const i = (y * w + x) * channels;
    ringR.push(data[i]!);
    ringG.push(data[i + 1] ?? data[i]!);
    ringB.push(data[i + 2] ?? data[i]!);
  };
  for (let x = 0; x < w; x++) {
    pushPixel(x, 0);
    pushPixel(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    pushPixel(0, y);
    pushPixel(w - 1, y);
  }

  const bg = [median(ringR), median(ringG), median(ringB)] as const;
  const minBg = Math.min(bg[0], bg[1], bg[2]);
  if (minBg <= COLOR_PATH_MIN_BG) {
    // Not a light studio background. Do not guess — this row goes to review.
    return { bbox: null, method: "fail", confidence: 0 };
  }

  const tol = Math.max(16, (255 - minBg) * 0.7);
  const { box, hits } = bboxFrom(raw, (i) => {
    const dr = Math.abs(data[i]! - bg[0]);
    const dg = Math.abs((data[i + 1] ?? data[i]!) - bg[1]);
    const db = Math.abs((data[i + 2] ?? data[i]!) - bg[2]);
    return dr > tol || dg > tol || db > tol;
  });

  if (!box || hits / total < 0.001) {
    return { bbox: null, method: "fail", confidence: 0 };
  }

  const coverage = (box.w * box.h) / total;
  // The colour path is inherently less certain than alpha, and a box that
  // fills the frame usually means the background was not actually uniform.
  const confidence = coverage > 0.995 ? 0.4 : 0.8;
  return { bbox: box, method: "color", confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame-space projection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The silhouette expressed in frame space: the source letterboxed (contain)
 * into the canvas aspect, all values as fractions of the canvas.
 */
export type FrameBox = {
  bw: number;
  bh: number;
  cx: number;
  cy: number;
  top: number;
  bottom: number;
};

/**
 * Project a pixel-space bbox into frame space by letterboxing the source into
 * the canvas aspect — the same projection the legacy client solver performs
 * before it applies a rule, so ported targets keep their meaning.
 */
export function toFrameBox(
  bbox: PixelBBox,
  imgW: number,
  imgH: number,
  frameAspect: number = FRAME_ASPECT,
): FrameBox {
  const imgAspect = imgW / Math.max(1, imgH);
  // Rendered size of the source inside the frame, as fractions of the frame.
  const renderedW = imgAspect >= frameAspect ? 1 : imgAspect / frameAspect;
  const renderedH = imgAspect >= frameAspect ? frameAspect / imgAspect : 1;
  const offX = (1 - renderedW) / 2;
  const offY = (1 - renderedH) / 2;

  const bw = (bbox.w / imgW) * renderedW;
  const bh = (bbox.h / imgH) * renderedH;
  const left = offX + (bbox.x / imgW) * renderedW;
  const top = offY + (bbox.y / imgH) * renderedH;

  return {
    bw,
    bh,
    cx: left + bw / 2,
    cy: top + bh / 2,
    top,
    bottom: top + bh,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule table — CATEGORY-keyed, collection default as fallback
// ─────────────────────────────────────────────────────────────────────────────

export type FitAnchor = "bottom" | "top" | "center";
export type FitPrimary = "width" | "height" | "area";

/**
 * NO CLAMPS. The legacy rule table carried clampMin/clampMax because the
 * browser was upscaling an already-rasterized tile and a big multiplier meant
 * a soft image. The engine resamples from source, which is sharp at any scale,
 * so the clamp band has no reason to exist — and its absence is precisely what
 * clears the 281 CLAMP_MASSIVE defects. Do not reintroduce these fields.
 */
export type FrameRule = {
  primary: FitPrimary;
  primaryTarget: number;
  secondaryMax: number;
  /** Bend the axis match toward equal visual mass (0 = pure axis, 1 = area). */
  aspectBlend?: number;
  refAspect?: number;
  widthMax?: number;
  heightMax?: number;
  anchor: FitAnchor;
  /** Canvas-space y of the anchor edge (0 top, 1 bottom). */
  anchorY: number;
  centerX: number;
};

const R_SEATING: FrameRule = {
  primary: "width",
  aspectBlend: 0.65,
  refAspect: 2.4,
  primaryTarget: 0.82,
  secondaryMax: 0.58,
  anchor: "bottom",
  anchorY: 0.9,
  centerX: 0.5,
};

const R_TABLES: FrameRule = {
  primary: "width",
  aspectBlend: 0.5,
  refAspect: 2.0,
  primaryTarget: 0.8,
  secondaryMax: 0.6,
  anchor: "bottom",
  anchorY: 0.9,
  centerX: 0.5,
};

const R_BARS: FrameRule = {
  primary: "height",
  primaryTarget: 0.7,
  secondaryMax: 0.82,
  anchor: "bottom",
  anchorY: 0.9,
  centerX: 0.5,
};

const R_STORAGE: FrameRule = {
  primary: "height",
  primaryTarget: 0.68,
  secondaryMax: 0.62,
  anchor: "bottom",
  anchorY: 0.9,
  centerX: 0.5,
};

const R_LIGHTING: FrameRule = {
  primary: "height",
  primaryTarget: 0.72,
  secondaryMax: 0.55,
  anchor: "bottom",
  anchorY: 0.92,
  centerX: 0.5,
};

/**
 * LOAD-BEARING CARVE-OUT. Chandeliers hang; lamps stand. Folding these two
 * into one collection-level "lighting" rule means either every chandelier
 * sits on the floor or every table lamp dangles from the ceiling. This is the
 * reason the table is keyed by category and not by collection.
 */
const R_CHANDELIERS: FrameRule = {
  primary: "height",
  primaryTarget: 0.78,
  secondaryMax: 0.6,
  anchor: "top",
  anchorY: 0.08,
  centerX: 0.5,
};

const R_CANDLELIGHT: FrameRule = {
  primary: "height",
  primaryTarget: 0.55,
  secondaryMax: 0.55,
  anchor: "bottom",
  anchorY: 0.85,
  centerX: 0.5,
};

const R_TABLEWARE: FrameRule = {
  primary: "area",
  primaryTarget: 0.3,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.5,
  centerX: 0.5,
};

const R_SERVEWARE: FrameRule = {
  primary: "area",
  primaryTarget: 0.32,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.5,
  centerX: 0.5,
};

const R_PILLOWS_THROWS: FrameRule = {
  primary: "area",
  primaryTarget: 0.42,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.5,
  centerX: 0.5,
};

const R_FURS_PELTS: FrameRule = {
  primary: "area",
  primaryTarget: 0.42,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.55,
  centerX: 0.5,
};

const R_RUGS: FrameRule = {
  primary: "width",
  primaryTarget: 0.88,
  secondaryMax: 0.35,
  anchor: "center",
  anchorY: 0.55,
  centerX: 0.5,
};

const R_STYLING: FrameRule = {
  primary: "area",
  primaryTarget: 0.34,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.55,
  centerX: 0.5,
};

const R_LARGE_DECOR: FrameRule = {
  primary: "height",
  primaryTarget: 0.72,
  secondaryMax: 0.62,
  anchor: "bottom",
  anchorY: 0.9,
  centerX: 0.5,
};

/**
 * JUDGMENT CALL (not a mechanical carry). A stool is a tall narrow object; the
 * seating rule's width-primary, mass-blended math was built for sofas and
 * renders stools squat. Height-primary at 0.72, bottom-anchored.
 */
const R_BAR_STOOLS: FrameRule = {
  primary: "height",
  primaryTarget: 0.72,
  secondaryMax: 0.5,
  anchor: "bottom",
  anchorY: 0.9,
  centerX: 0.5,
};

/**
 * JUDGMENT CALL (not a mechanical carry). `specialty` is the wall-mounted /
 * strung / LED grab-bag — nothing in it rests on a standard support, so a
 * baseline anchor is meaningless. Center-anchored area rule; V2 is skipped for
 * center-anchored rules for exactly this reason.
 */
const R_SPECIALTY: FrameRule = {
  primary: "area",
  primaryTarget: 0.34,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.5,
  centerX: 0.5,
};

/**
 * Category → rule. All 33 declared categories are covered. Her taxonomy is
 * two-level precisely because the physics differ at level two.
 */
export const CATEGORY_RULES: Record<string, FrameRule> = {
  // lounge-seating + dining seating (the framing win the Dining split bought:
  // dining chairs finally get seating physics)
  "sofas-loveseats": R_SEATING,
  "lounge-chairs": R_SEATING,
  benches: R_SEATING,
  ottomans: R_SEATING,
  "dining-chairs": R_SEATING,
  banquettes: R_SEATING,

  // lounge-tables + dining tables + cocktail tables
  "coffee-tables": R_TABLES,
  "side-tables": R_TABLES,
  consoles: R_TABLES,
  "cocktail-tables": R_TABLES,
  "community-tables": R_TABLES,
  "dining-tables": R_TABLES,

  // cocktail-bar
  bars: R_BARS,
  "bar-stools": R_BAR_STOOLS, // judgment
  storage: R_STORAGE,

  // tableware
  dinnerware: R_TABLEWARE,
  flatware: R_TABLEWARE,
  glassware: R_TABLEWARE,
  serveware: R_SERVEWARE,

  // lighting
  chandeliers: R_CHANDELIERS, // top anchor — load-bearing carve-out
  "table-lamps": R_LIGHTING,
  "floor-lamps": R_LIGHTING,
  specialty: R_SPECIALTY, // judgment

  // textiles
  pillows: R_PILLOWS_THROWS,
  throws: R_PILLOWS_THROWS,
  "furs-pelts": R_FURS_PELTS,

  // rugs
  rugs: R_RUGS,

  // styling
  accents: R_STYLING,
  "crates-baskets": R_STYLING,
  candlelighting: R_CANDLELIGHT,

  // large-decor
  structures: R_LARGE_DECOR,
  walls: R_LARGE_DECOR,
  other: R_LARGE_DECOR,
};

/** Fallback for any future category that lacks a row. */
export const COLLECTION_DEFAULT_RULES: Record<string, FrameRule> = {
  "lounge-seating": R_SEATING,
  "lounge-tables": R_TABLES,
  dining: R_TABLES,
  "cocktail-bar": R_BARS,
  tableware: R_TABLEWARE,
  lighting: R_LIGHTING,
  textiles: R_PILLOWS_THROWS,
  rugs: R_RUGS,
  styling: R_STYLING,
  "large-decor": R_LARGE_DECOR,
};

/** Last resort when neither key is known. */
export const DEFAULT_RULE: FrameRule = {
  primary: "area",
  primaryTarget: 0.32,
  secondaryMax: 0.9,
  anchor: "center",
  anchorY: 0.5,
  centerX: 0.5,
};

export function resolveRule(
  categorySlug: string | null | undefined,
  collectionSlug?: string | null,
): FrameRule {
  if (categorySlug && CATEGORY_RULES[categorySlug]) return CATEGORY_RULES[categorySlug]!;
  if (collectionSlug && COLLECTION_DEFAULT_RULES[collectionSlug]) {
    return COLLECTION_DEFAULT_RULES[collectionSlug]!;
  }
  return DEFAULT_RULE;
}

// ─────────────────────────────────────────────────────────────────────────────
// placeSilhouette
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Port of the legacy `solveFit`, minus the clamps. Returns the placement
 * sub-object of the recipe, so 2.2 can hash it in its final shape.
 */
export function placeSilhouette(
  box: FrameBox,
  categorySlug: string | null | undefined,
  collectionSlug?: string | null,
): RecipePlacement {
  const rule = resolveRule(categorySlug, collectionSlug);
  const wInset = TILE_IMAGE_INSET * box.bw;
  const hInset = TILE_IMAGE_INSET * box.bh;

  // 1. Primary-axis target scale.
  let sTarget: number;
  if (rule.primary === "width") {
    sTarget = rule.primaryTarget / Math.max(0.001, wInset);
  } else if (rule.primary === "height") {
    sTarget = rule.primaryTarget / Math.max(0.001, hInset);
  } else {
    sTarget = rule.primaryTarget / Math.sqrt(Math.max(0.001, wInset * hInset));
  }

  // 1b. Bend the axis match toward equal visual mass. Matching on width alone
  // makes a tall short-bodied piece occupy ~2x the area of a long low one at
  // the same width. s *= (aspect / refAspect)^(blend/2).
  const blend = rule.aspectBlend ?? 0;
  if (blend > 0 && rule.primary !== "area") {
    const aspect = wInset / Math.max(0.001, hInset);
    const ref = rule.refAspect ?? 1;
    if (aspect > 0 && ref > 0) {
      const exponent = rule.primary === "width" ? blend / 2 : -blend / 2;
      sTarget *= Math.pow(aspect / ref, exponent);
    }
  }

  // 2. Secondary-axis cap (meaningless for an area primary).
  let sCap = Infinity;
  if (rule.primary === "width") {
    sCap = rule.secondaryMax / Math.max(0.001, hInset);
  } else if (rule.primary === "height") {
    sCap = rule.secondaryMax / Math.max(0.001, wInset);
  }

  // 2b. Absolute silhouette caps, applied in every mode.
  if (rule.widthMax != null) sCap = Math.min(sCap, rule.widthMax / Math.max(0.001, wInset));
  if (rule.heightMax != null) sCap = Math.min(sCap, rule.heightMax / Math.max(0.001, hInset));

  // 3. Final scale. No clamp band — see FrameRule.
  const scale = Math.min(sTarget, sCap);

  // 4. Translation, in canvas fractions.
  const offsetX = rule.centerX - (0.5 + (box.cx - 0.5) * scale);
  let offsetY: number;
  if (rule.anchor === "bottom") {
    offsetY = rule.anchorY - (0.5 + (box.bottom - 0.5) * scale);
  } else if (rule.anchor === "top") {
    offsetY = rule.anchorY - (0.5 + (box.top - 0.5) * scale);
  } else {
    offsetY = rule.anchorY - (0.5 + (box.cy - 0.5) * scale);
  }

  return { scale: round4(scale), offsetX: round4(offsetX), offsetY: round4(offsetY) };
}

// ─────────────────────────────────────────────────────────────────────────────
// verify
// ─────────────────────────────────────────────────────────────────────────────

export type VerifyFailureCode = "V1" | "V2" | "V3" | "V4" | "V5" | "V6";
export type VerifyAdvisoryCode = "SRC_UPSCALED" | "TIGHT_CROP";

export type VerifyIssue = {
  code: VerifyFailureCode | VerifyAdvisoryCode;
  message: string;
};

export type VerifyResult = {
  pass: boolean;
  failures: VerifyIssue[];
  advisories: VerifyIssue[];
};

export type VerifyInput = {
  rendered: RawImage;
  /** Encoded size of the derivative, for V6. */
  byteLength?: number;
  /** Resample factor applied to the source, for the SRC_UPSCALED advisory. */
  resampleFactor?: number;
};

const V1_TOL = 0.06;
const V2_TOL = 0.02;
const V3_MIN_MARGIN = 0.01;

/**
 * V1 primary-axis coverage ±6% · V2 baseline ±2% · V3 no-clip ≥1% margin ·
 * V4 clean perimeter · V5 exact dims · V6 <400KB.
 *
 * V2 KEYS THE SAME WAY AS THE RULE TABLE. Baseline-at-anchorY applies only to
 * bottom-anchored rules; chandeliers invert it to a top-edge check, and
 * center-anchored rules skip it entirely (nothing in `specialty` rests on a
 * support). Keyed by collection instead, every chandelier would fail V2
 * forever and every specialty item would fail a baseline that doesn't apply.
 */
export function verify(
  input: VerifyInput,
  categorySlug: string | null | undefined,
  collectionSlug?: string | null,
): VerifyResult {
  const rule = resolveRule(categorySlug, collectionSlug);
  const { rendered, byteLength, resampleFactor } = input;
  const failures: VerifyIssue[] = [];
  const advisories: VerifyIssue[] = [];

  const fail = (code: VerifyFailureCode, message: string) => failures.push({ code, message });

  // V5 — exact dims.
  const dimsOk = VERIFY_SIZES.some((s) => s.w === rendered.w && s.h === rendered.h);
  if (!dimsOk) {
    fail("V5", `dims ${rendered.w}x${rendered.h} is not an allowed output size`);
  }

  // V6 — byte ceiling.
  if (byteLength != null && byteLength > MAX_DERIVATIVE_BYTES) {
    fail("V6", `${byteLength} bytes exceeds ${MAX_DERIVATIVE_BYTES}`);
  }

  const m = measureSilhouette(rendered);
  if (!m.bbox) {
    fail("V4", "no silhouette found in the rendered canvas");
    return { pass: false, failures, advisories };
  }

  const box = toFrameBox(m.bbox, rendered.w, rendered.h, rendered.w / rendered.h);

  // V1 — primary-axis coverage, checked as SOLVER IDEMPOTENCE: re-solve the
  // rendered silhouette and require the solver to ask for no further change.
  //
  // Comparing raw coverage to `primaryTarget` is wrong and was rejected here
  // on the first real render: `primaryTarget` is only the pre-blend seed. The
  // aspect blend and the secondary/absolute caps both move the intended
  // coverage, so a correctly-placed wide sofa (capped on height) reads 16% off
  // a target it was never supposed to hit. Re-solving folds blend and caps in
  // by construction — an idempotent placement is the actual contract.
  const resolved = placeSilhouette(box, categorySlug, collectionSlug);
  const scaleDelta = Math.abs(resolved.scale - 1);
  if (scaleDelta > V1_TOL) {
    const inset = TILE_IMAGE_INSET;
    const actual =
      rule.primary === "width"
        ? box.bw * inset
        : rule.primary === "height"
          ? box.bh * inset
          : Math.sqrt(box.bw * inset * box.bh * inset);
    fail(
      "V1",
      `${rule.primary} coverage ${actual.toFixed(3)} needs a further ${resolved.scale.toFixed(3)}x (${(scaleDelta * 100).toFixed(1)}% off)`,
    );
  }


  // V2 — anchor edge, keyed to the rule's anchor.
  if (rule.anchor === "bottom") {
    const off = Math.abs(box.bottom - rule.anchorY);
    if (off > V2_TOL) fail("V2", `baseline ${box.bottom.toFixed(3)} vs anchor ${rule.anchorY}`);
  } else if (rule.anchor === "top") {
    const off = Math.abs(box.top - rule.anchorY);
    if (off > V2_TOL) fail("V2", `top edge ${box.top.toFixed(3)} vs anchor ${rule.anchorY}`);
  }
  // center-anchored: V2 does not apply.

  // V3 — no clip: the silhouette keeps a ≥1% margin on every edge.
  const touches =
    m.bbox.x <= 0 ||
    m.bbox.y <= 0 ||
    m.bbox.x + m.bbox.w >= rendered.w ||
    m.bbox.y + m.bbox.h >= rendered.h;
  const margin = Math.min(box.top, box.cx - box.bw / 2, 1 - box.bottom, 1 - (box.cx + box.bw / 2));
  if (touches || margin < V3_MIN_MARGIN) {
    fail("V3", `silhouette margin ${margin.toFixed(4)} below ${V3_MIN_MARGIN}`);
  }

  // V4 — clean perimeter: the canvas edge must be background (transparent or
  // uniform light), never subject.
  if (!perimeterIsClean(rendered)) {
    fail("V4", "canvas perimeter is not clean background");
  }

  // Advisories — never fail a render.
  if (resampleFactor != null && resampleFactor > 1.25) {
    advisories.push({
      code: "SRC_UPSCALED",
      message: `source resampled ${resampleFactor.toFixed(2)}x`,
    });
  }
  if (m.confidence < 0.7) {
    advisories.push({
      code: "TIGHT_CROP",
      message: `low measurement confidence (${m.confidence}) — likely a tight crop`,
    });
  }

  return { pass: failures.length === 0, failures, advisories };
}

function perimeterIsClean(raw: RawImage): boolean {
  const { data, w, h, channels } = raw;
  const check = (x: number, y: number): boolean => {
    const i = (y * w + x) * channels;
    if (channels >= 4 && data[i + 3]! < ALPHA_THRESHOLD) return true;
    const r = data[i]!;
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? r;
    return Math.min(r, g, b) > COLOR_PATH_MIN_BG;
  };
  for (let x = 0; x < w; x++) {
    if (!check(x, 0) || !check(x, h - 1)) return false;
  }
  for (let y = 0; y < h; y++) {
    if (!check(0, y) || !check(w - 1, y)) return false;
  }
  return true;
}

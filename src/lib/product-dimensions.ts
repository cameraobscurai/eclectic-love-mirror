// Pure parsing of declared catalog dimensions; no image measurement or scale solver.
export type PhysicalDims = { width: number; height: number } | null;

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`\s*(?:"|”|''|in\b|inches)?\s*`;

/**
 * Nothing in this inventory is wider than 30 feet. A larger value is a data
 * entry error (e.g. CANYON 8' bar recorded as 96'W instead of 96"W) and must
 * not be allowed to skew the scale reference — treat it as unknown.
 */
const MAX_SANE_INCHES = 360;
const sane = (n: number | null | undefined): number | null =>
  n == null || !Number.isFinite(n) || n <= 0 || n > MAX_SANE_INCHES ? null : n;

/** Feet tokens (`12'W`, `4.5' x 3'`) are common in the RMS export. */
function feetWidth(s: string): number | null {
  const m =
    s.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b|feet)\s*w\b/i) ??
    s.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b)\s*[x×]/i);
  return m ? sane(Number(m[1]) * 12) : null;
}

function feetHeight(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:'|’|ft\b|feet)\s*h\b/i);
  return m ? sane(Number(m[1]) * 12) : null;
}

/**
 * Parse real-world inches out of catalog dimension strings.
 * Handles `52"W x 30"D x 36.5"H`, `58"w x 18"D x 22"H`,
 * `36"Dia x 18.5"H`, `12'W x 30"H`, and trailing notes like `- 20" Seat Height`.
 */
export function parseDimensionsInches(dimensions: string | null | undefined): PhysicalDims {
  if (!dimensions) return null;
  const s = dimensions.replace(/seat\s+height/gi, "");

  const wMatch =
    s.match(new RegExp(`${NUM}${UNIT}w\\b`, "i")) ??
    s.match(new RegExp(`${NUM}${UNIT}dia(?:meter)?\\b`, "i"));
  const hMatch = s.match(new RegExp(`${NUM}${UNIT}h\\b`, "i"));

  let width = feetWidth(s) ?? (wMatch ? sane(Number(wMatch[1])) : null);
  let height = feetHeight(s) ?? (hMatch ? sane(Number(hMatch[1])) : null);

  if (width == null || height == null) {
    // Fall back to a bare `W x D x H` triple.
    const triple = s.match(
      new RegExp(`${NUM}${UNIT}[x×]${UNIT}${NUM}${UNIT}[x×]${UNIT}${NUM}`, "i"),
    );
    if (triple) {
      width = width ?? sane(Number(triple[1]));
      height = height ?? sane(Number(triple[3]));
    }
  }

  if (!width || !height) return null;
  return { width, height };
}

/** Back-compat helper — width only, feet-aware and sanity-capped. */
export function parseWidthInches(dimensions: string | null | undefined): number | null {
  if (!dimensions) return null;
  const s = dimensions.replace(/seat\s+height/gi, "");
  const feet = feetWidth(s);
  if (feet) return feet;
  const explicit =
    s.match(new RegExp(`${NUM}${UNIT}w\\b`, "i")) ?? s.match(/\bw\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (explicit) return sane(Number(explicit[1]));
  const triple = s.match(new RegExp(`${NUM}${UNIT}[x×]\\s*\\d+(?:\\.\\d+)?`, "i"));
  return triple ? sane(Number(triple[1])) : null;
}

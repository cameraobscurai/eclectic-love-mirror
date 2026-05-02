/**
 * Parses an Eclectic Hive dimensions string into width / depth / height,
 * all in inches. Source format examples (Phase 3 catalog):
 *
 *   "32\"W x 14\"D x 6\"H"
 *   "84\" W x 38\" D x 32\" H"
 *   "Diameter 18\""
 *   "20\" diameter x 24\" H"
 *   "12'W x 4'D x 30\"H"     (feet on width/depth, inches on height)
 *
 * Returns whichever fields parsed confidently. Round pieces report `width`
 * = `depth` = diameter so the scale rule has both a horizontal and vertical
 * dimension to draw. Silent fallback — never throws.
 */

export interface ParsedDimensions {
  width: number | null;   // inches
  depth: number | null;   // inches
  height: number | null;  // inches
  /** True if dimensions came from a "diameter" expression (round piece). */
  isDiameter: boolean;
}

const MIN = 0.5;
const MAX = 500;

function clamp(n: number): number | null {
  return Number.isFinite(n) && n >= MIN && n <= MAX ? n : null;
}

/**
 * Match a numeric value followed by an optional unit and a required axis flag
 * (W, D, or H). Accepts feet (' / ft / feet) or inches ("/ in / inches /
 * blank). Feet are converted to inches before being clamped.
 */
function matchAxis(s: string, axis: "W" | "D" | "H"): number | null {
  // Feet first (avoids "12'" being eaten by the inches matcher).
  const feet = s.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:'|ft|feet)\\s*${axis}\\b`, "i"),
  );
  if (feet) {
    const n = clamp(Number(feet[1]) * 12);
    if (n) return n;
  }
  const inch = s.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:"|in|inches)?\\s*${axis}\\b`, "i"),
  );
  if (inch) return clamp(Number(inch[1]));
  return null;
}

function matchDiameter(s: string): number | null {
  const m =
    s.match(/diameter\s*[:=]?\s*(\d+(?:\.\d+)?)/i) ??
    s.match(/(\d+(?:\.\d+)?)\s*(?:"|in|inches)?\s*(?:dia|diameter)\b/i);
  if (m) return clamp(Number(m[1]));
  return null;
}

export function parseDimensions(
  dim: string | null | undefined,
): ParsedDimensions {
  const empty: ParsedDimensions = {
    width: null,
    depth: null,
    height: null,
    isDiameter: false,
  };
  if (!dim) return empty;
  const s = dim.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Round pieces — diameter alone often appears with a separate height.
  const dia = matchDiameter(s);
  const height = matchAxis(s, "H");

  if (dia != null && matchAxis(s, "W") == null && matchAxis(s, "D") == null) {
    return {
      width: dia,
      depth: dia,
      height,
      isDiameter: true,
    };
  }

  return {
    width: matchAxis(s, "W"),
    depth: matchAxis(s, "D"),
    height,
    isDiameter: false,
  };
}

/**
 * Back-compat shim — older callers (and the existing toggle-gate logic in
 * QuickViewModal) just want a width number to decide whether to render the
 * Scale affordance. Returns the parsed width, or the diameter for round
 * pieces, or null when no horizontal dimension is available.
 */
export function parseWidthInches(
  dim: string | null | undefined,
): number | null {
  const p = parseDimensions(dim);
  return p.width;
}

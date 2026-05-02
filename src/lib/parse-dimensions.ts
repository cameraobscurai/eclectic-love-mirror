/**
 * Parses an Eclectic Hive dimensions string and extracts width in inches.
 *
 * Source format examples (from the Phase 3 catalog):
 *   "32\"W x 14\"D x 6\"H"
 *   "84\" W x 38\" D x 32\" H"
 *   "Diameter 18\""
 *   "20\" diameter x 24\" H"
 *
 * Returns the width in inches if confidently parsed, otherwise null.
 * Silent fallback — never throws. Callers use the null to hide the Scale Rule
 * affordance entirely (no "unavailable" labels).
 */
export function parseWidthInches(dim: string | null | undefined): number | null {
  if (!dim) return null;
  const s = dim.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Pattern 1a: feet — "12'W"  or  "12' W"  (convert to inches)
  const feetMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*W\b/i);
  if (feetMatch) {
    const n = Number(feetMatch[1]) * 12;
    if (Number.isFinite(n) && n > 0 && n < 500) return n;
  }

  // Pattern 1b: inches — "32"W"  or  "32" W"  or  "32 in W"  (W flag)
  const widthMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:"|in|inches)?\s*W\b/i);
  if (widthMatch) {
    const n = Number(widthMatch[1]);
    if (Number.isFinite(n) && n > 0 && n < 500) return n;
  }

  // Pattern 2: "Diameter 18"" or "18" diameter"  (round pieces — diameter IS width)
  const diaMatch =
    s.match(/diameter\s*[:=]?\s*(\d+(?:\.\d+)?)/i) ??
    s.match(/(\d+(?:\.\d+)?)\s*(?:"|in|inches)?\s*(?:dia|diameter)\b/i);
  if (diaMatch) {
    const n = Number(diaMatch[1]);
    if (Number.isFinite(n) && n > 0 && n < 500) return n;
  }

  return null;
}

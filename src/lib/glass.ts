// Shared glass tokens — defined once, used surgically.
//
// Eclectic Hive uses softly squared frosted plates, never rounded-full pills.
// Surfaces stay quiet: low-alpha tint, hairline border, soft drop shadow.

/** Generic light glass plate — for object labels over imagery. */
export const glassPlate =
  "bg-cream/55 backdrop-blur-md border border-cream/40 shadow-[0_8px_32px_-16px_rgba(26,26,26,0.18)]";

/** Bottom-anchored object name plate — slightly more opaque for legibility. */
export const glassNamePlate =
  "bg-cream/[0.58] backdrop-blur-md border border-cream/45 shadow-[0_8px_28px_-16px_rgba(26,26,26,0.22)]";

/** Inline style companion for either token to satisfy iOS Safari. */
export const webkitGlassBlur = { WebkitBackdropFilter: "blur(16px)" } as const;

/**
 * Edge-to-edge band — the canonical home-hero recipe, codified.
 *
 * Two color polarities of the same physics:
 *  - `dark`: charcoal-tint gradient + cream hairlines, for surfaces that
 *    float over imagery or dark fields (home hero band, modal scrims).
 *  - `light`: white-tint gradient + charcoal hairlines, for surfaces that
 *    float over the white archive field (collection sticky utility bar,
 *    QuickView stage chrome).
 *
 * Spread directly into a `style={{ ... }}` prop. Use the `*NoBottom` /
 * `*NoTop` variants when an adjacent surface owns the shared hairline so
 * we never double-stroke an edge.
 */
export const glassBand = {
  dark: {
    background:
      "linear-gradient(to bottom, rgba(26,26,26,0.10) 0%, rgba(26,26,26,0.20) 50%, rgba(26,26,26,0.10) 100%)",
    backdropFilter: "blur(14px) saturate(1.05) brightness(0.92)",
    WebkitBackdropFilter: "blur(14px) saturate(1.05) brightness(0.92)",
    borderTop: "1px solid rgba(245,242,237,0.18)",
    borderBottom: "1px solid rgba(245,242,237,0.14)",
    boxShadow:
      "inset 0 1px 0 0 rgba(245,242,237,0.10), inset 0 -1px 0 0 rgba(245,242,237,0.06), 0 1px 0 0 rgba(0,0,0,0.20), 0 -1px 0 0 rgba(0,0,0,0.18)",
  },
  light: {
    background:
      "linear-gradient(to bottom, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.68) 50%, rgba(255,255,255,0.78) 100%)",
    backdropFilter: "blur(14px) saturate(1.05)",
    WebkitBackdropFilter: "blur(14px) saturate(1.05)",
    borderTop: "1px solid rgba(26,26,26,0.10)",
    borderBottom: "1px solid rgba(26,26,26,0.10)",
    boxShadow:
      "inset 0 1px 0 0 rgba(255,255,255,0.50), inset 0 -1px 0 0 rgba(255,255,255,0.30)",
  },
} as const;

/** Light variant without the bottom hairline — for surfaces whose lower
 *  neighbor (e.g. modal stage body) owns the shared edge. */
export const glassBandLightNoBottom = {
  ...glassBand.light,
  borderBottom: "none",
  boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.50)",
} as const;

/** Light variant without the top hairline — for surfaces whose upper
 *  neighbor owns the shared edge (e.g. modal footer below the stage). */
export const glassBandLightNoTop = {
  ...glassBand.light,
  borderTop: "none",
  boxShadow: "inset 0 -1px 0 0 rgba(255,255,255,0.30)",
} as const;

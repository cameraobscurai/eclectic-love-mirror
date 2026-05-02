// Shared glass tokens — defined once, used surgically.
//
// Eclectic Hive uses softly squared frosted plates, never rounded-full pills.
// Surfaces stay quiet: low-alpha cream, hairline border, soft drop shadow.
// Pair with `style={{ WebkitBackdropFilter: "blur(16px)" }}` on iOS-critical
// surfaces (hover labels, scrims) so Safari renders the blur.

/** Generic light glass plate — for object labels over imagery. */
export const glassPlate =
  "bg-cream/55 backdrop-blur-md border border-cream/40 shadow-[0_8px_32px_-16px_rgba(26,26,26,0.18)]";

/** Bottom-anchored object name plate — slightly more opaque for legibility. */
export const glassNamePlate =
  "bg-cream/[0.58] backdrop-blur-md border border-cream/45 shadow-[0_8px_28px_-16px_rgba(26,26,26,0.22)]";

/** Inline style companion for either token to satisfy iOS Safari. */
export const webkitGlassBlur = { WebkitBackdropFilter: "blur(16px)" } as const;

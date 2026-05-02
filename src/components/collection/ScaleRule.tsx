/**
 * Architectural scale annotations drawn around the silhouette.
 *
 * - `ScaleRuleWidth`  — horizontal hairline beneath the image, labeled with
 *                       the width in inches.
 * - `ScaleRuleHeight` — vertical hairline along the right side of the image,
 *                       labeled with the height in inches (rotated 90°).
 *
 * Both share the same visual register (charcoal/55, 0.4-stroke hairline,
 * serifed end caps, micro-typographic label in the existing modal type
 * scale). They render proportionally — bigger pieces fill more of the
 * envelope, smaller pieces visibly shrink — so the eye reads relative size,
 * not just digits.
 *
 * Pure SVG, no animation. Animation is the parent's job (AnimatePresence).
 */

const CEILING_W = 84; // inches that map to 100% horizontal envelope (long sofa)
const CEILING_H = 84; // inches that map to 100% vertical envelope (tall piece)

function format(n: number): string {
  return Number.isInteger(n) ? `${n}″` : `${n.toFixed(1)}″`;
}

function pctOf(value: number, ceiling: number): number {
  return Math.max(8, Math.min(100, (value / ceiling) * 100));
}

interface AxisProps {
  /** Inches along the relevant axis. */
  inches: number;
}

export function ScaleRuleWidth({ inches }: AxisProps) {
  const pct = pctOf(inches, CEILING_W);
  const label = format(inches);

  return (
    <div
      className="w-full flex justify-center pointer-events-none select-none"
      aria-label={`Width: ${label}`}
    >
      <div className="relative" style={{ width: `${pct}%` }}>
        <div className="text-center text-[10px] uppercase tracking-[0.28em] text-charcoal/65 tabular-nums mb-1.5">
          {label}
        </div>
        <svg
          viewBox="0 0 100 6"
          preserveAspectRatio="none"
          className="w-full h-[6px] block text-charcoal/55"
          aria-hidden
        >
          <line x1="0.5" y1="3" x2="99.5" y2="3" stroke="currentColor" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          <line x1="0.5" y1="0.5" x2="0.5" y2="5.5" stroke="currentColor" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          <line x1="99.5" y1="0.5" x2="99.5" y2="5.5" stroke="currentColor" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

export function ScaleRuleHeight({ inches }: AxisProps) {
  // Height fills a percentage of the available vertical envelope. The label
  // is rotated 90° and tracks the same micro-type register as the width rule.
  const pct = pctOf(inches, CEILING_H);
  const label = format(inches);

  return (
    <div
      className="h-full flex items-center pointer-events-none select-none"
      aria-label={`Height: ${label}`}
    >
      <div
        className="relative flex items-center"
        style={{ height: `${pct}%` }}
      >
        {/* Rotated label sits to the LEFT of the rule (between rule and image) */}
        <div
          className="absolute right-full mr-1.5 top-1/2 -translate-y-1/2 origin-center text-[10px] uppercase tracking-[0.28em] text-charcoal/65 tabular-nums whitespace-nowrap"
          style={{ transform: "translateY(-50%) rotate(-90deg)" }}
        >
          {label}
        </div>
        <svg
          viewBox="0 0 6 100"
          preserveAspectRatio="none"
          className="h-full w-[6px] block text-charcoal/55"
          aria-hidden
        >
          <line x1="3" y1="0.5" x2="3" y2="99.5" stroke="currentColor" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          <line x1="0.5" y1="0.5" x2="5.5" y2="0.5" stroke="currentColor" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          <line x1="0.5" y1="99.5" x2="5.5" y2="99.5" stroke="currentColor" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Back-compat: keep the legacy <ScaleRule width=... /> export so any external
// import keeps working. New code should use the named axis components.
// ---------------------------------------------------------------------------

interface LegacyScaleRuleProps {
  widthInches: number;
  imageWidthCeilingInches?: number;
}

export function ScaleRule({ widthInches }: LegacyScaleRuleProps) {
  return <ScaleRuleWidth inches={widthInches} />;
}

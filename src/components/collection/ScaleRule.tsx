/**
 * Architectural scale annotations that wrap the measurement zone.
 *
 * - `ScaleRuleWidth`  — horizontal hairline that fills its parent's width,
 *                       labeled with the width in inches.
 * - `ScaleRuleHeight` — vertical hairline that fills its parent's height,
 *                       labeled with the height in inches (rotated 90°).
 *
 * The rule no longer sizes itself relative to a global ceiling — the parent
 * (the measurement zone in QuickViewModal) controls the bounding box, and
 * the rule simply spans it. This means the rules formally wrap the image's
 * actual frame, not floating chrome on the stage.
 *
 * Visual register: charcoal/55, 0.4-stroke hairline, serifed end caps,
 * 10px label with 0.28em tracking. Pure SVG, no animation.
 */

function format(n: number): string {
  return Number.isInteger(n) ? `${n}″` : `${n.toFixed(1)}″`;
}

interface AxisProps {
  /** Inches along the relevant axis. */
  inches: number;
}

export function ScaleRuleWidth({ inches }: AxisProps) {
  const label = format(inches);

  return (
    <div
      className="w-full pointer-events-none select-none"
      aria-label={`Width: ${label}`}
    >
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
      <div className="text-center text-[10px] uppercase tracking-[0.28em] text-charcoal/65 tabular-nums mt-1.5">
        {label}
      </div>
    </div>
  );
}

export function ScaleRuleHeight({ inches }: AxisProps) {
  const label = format(inches);

  return (
    <div
      className="h-full flex items-center pointer-events-none select-none"
      aria-label={`Height: ${label}`}
    >
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
      <div
        className="ml-2 text-[10px] uppercase tracking-[0.28em] text-charcoal/65 tabular-nums whitespace-nowrap origin-left"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
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

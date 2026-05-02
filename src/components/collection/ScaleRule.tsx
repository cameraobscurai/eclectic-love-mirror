/**
 * Architectural scale rule, drawn in charcoal hairline.
 *
 * Renders a horizontal measurement bar with serifed end caps and a centered
 * width label. Width is given in inches; the rendered length is computed as
 * a fraction of `imageWidthCeilingInches` (default 84") so a long sofa fills
 * the frame and a small bowl renders short — the user *sees* relative size,
 * not just reads a number.
 *
 * Pure SVG, no animation, no fonts beyond what the rest of the modal uses.
 */

interface ScaleRuleProps {
  /** Actual width of the piece in inches. */
  widthInches: number;
  /**
   * Inches that map to 100% of the rule's container width. Defaults to 84"
   * (the long side of a generous sofa) — bigger pieces still fit; smaller
   * pieces visibly shrink.
   */
  imageWidthCeilingInches?: number;
}

export function ScaleRule({
  widthInches,
  imageWidthCeilingInches = 84,
}: ScaleRuleProps) {
  // Rule width as a percentage of the available container — clamp 8%..100%.
  const pct = Math.max(
    8,
    Math.min(100, (widthInches / imageWidthCeilingInches) * 100),
  );

  // Format: integer if whole, otherwise one decimal.
  const formatted = Number.isInteger(widthInches)
    ? `${widthInches}″`
    : `${widthInches.toFixed(1)}″`;

  return (
    <div
      className="w-full flex justify-center pointer-events-none select-none"
      aria-label={`Width: ${formatted}`}
    >
      <div className="relative" style={{ width: `${pct}%` }}>
        {/* Centered label sits above the rule */}
        <div className="text-center text-[10px] uppercase tracking-[0.28em] text-charcoal/65 tabular-nums mb-1.5">
          {formatted}
        </div>
        <svg
          viewBox="0 0 100 6"
          preserveAspectRatio="none"
          className="w-full h-[6px] block"
          aria-hidden
        >
          {/* Horizontal hairline */}
          <line
            x1="0.5"
            y1="3"
            x2="99.5"
            y2="3"
            stroke="currentColor"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
            className="text-charcoal/55"
          />
          {/* Serif end caps */}
          <line
            x1="0.5"
            y1="0.5"
            x2="0.5"
            y2="5.5"
            stroke="currentColor"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
            className="text-charcoal/55"
          />
          <line
            x1="99.5"
            y1="0.5"
            x2="99.5"
            y2="5.5"
            stroke="currentColor"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
            className="text-charcoal/55"
          />
        </svg>
      </div>
    </div>
  );
}

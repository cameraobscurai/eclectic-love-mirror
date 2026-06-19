import { type CSSProperties, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// ParallaxMedia
//
// Dimensional scroll-driven parallax for image frames.
// Wraps any child media (typically <MediaAperture/>) in a fixed-ratio outer
// shell so layout never shifts — only the inner content drifts + zooms +
// brightens as the frame crosses the viewport.
//
// Implementation: pure CSS scroll-driven animations via `animation-timeline:
// view()`. Zero JS during scroll. When unsupported (Firefox, older Safari),
// the inner content renders at its rest state — identical to today.
//
// Auto-disabled under prefers-reduced-motion and on coarse-pointer devices
// (mobile/tablet) via media queries baked into the keyframes.
//
// Usage:
//   <ParallaxMedia depth="md">
//     <MediaAperture picture={...} ratio="4/5" ... />
//   </ParallaxMedia>
// ---------------------------------------------------------------------------

type Depth = "sm" | "md" | "lg";

interface Props {
  children: ReactNode;
  /** Drift / zoom intensity. sm = subtle, md = default, lg = cinematic. */
  depth?: Depth;
  /** Class on the outer wrapper (use for margin / max-width sizing). */
  className?: string;
  /** Inline style on the outer wrapper. */
  style?: CSSProperties;
}

const DEPTH_VARS: Record<Depth, CSSProperties> = {
  // CSS custom props consumed by the keyframes below.
  // y    = vertical drift in % of frame height across the viewport pass
  // s0/s1 = scale start / end
  // b0/b1 = brightness start / end (filter)
  sm: { ["--pmy" as string]: "4%",  ["--pms0" as string]: "1.00", ["--pms1" as string]: "1.04", ["--pmb0" as string]: "0.96", ["--pmb1" as string]: "1.00" },
  md: { ["--pmy" as string]: "8%",  ["--pms0" as string]: "0.98", ["--pms1" as string]: "1.06", ["--pmb0" as string]: "0.92", ["--pmb1" as string]: "1.00" },
  lg: { ["--pmy" as string]: "12%", ["--pms0" as string]: "0.96", ["--pms1" as string]: "1.08", ["--pmb0" as string]: "0.88", ["--pmb1" as string]: "1.00" },
};

export function ParallaxMedia({
  children,
  depth = "md",
  className,
  style,
}: Props) {
  return (
    <div
      className={className}
      style={{ ...DEPTH_VARS[depth], ...style }}
      data-parallax-media
    >
      <div className="parallax-media__inner">{children}</div>
    </div>
  );
}

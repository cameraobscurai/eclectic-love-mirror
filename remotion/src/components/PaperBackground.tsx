import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";

// Persistent paper backdrop — subtle warm wash that drifts across the entire
// 24s timeline so the video never feels static between scenes.
export const PaperBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 60]);
  const tilt = interpolate(frame, [0, durationInFrames], [-2, 2]);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper, overflow: "hidden" }}>
      {/* warm radial wash */}
      <div
        style={{
          position: "absolute",
          inset: -200,
          background: `radial-gradient(60% 50% at ${30 + drift / 6}% ${
            55 + tilt
          }%, rgba(232,225,214,0.95) 0%, rgba(247,244,238,1) 60%, rgba(212,205,196,0.5) 100%)`,
        }}
      />
      {/* faint horizontal rule, editorial spine */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${COLORS.charcoal}22 30%, ${COLORS.charcoal}22 70%, transparent 100%)`,
          transform: `translateY(${tilt * 4}px)`,
        }}
      />
      {/* grain dots — very low opacity, lots of them, drifting */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.08 }}
      >
        <defs>
          <pattern id="grain" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill={COLORS.charcoal} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

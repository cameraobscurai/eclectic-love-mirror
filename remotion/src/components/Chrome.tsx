import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY } from "../fonts";

// Minimal persistent header — wordmark only. The IndexCard carries step + label.
export const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inOp = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = Math.min(inOp, outOp);

  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: op,
        color: COLORS.charcoal,
        fontFamily: DISPLAY,
        fontSize: 28,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        fontWeight: 400,
        pointerEvents: "none",
      }}
    >
      Eclectic&nbsp;Hive
    </div>
  );
};

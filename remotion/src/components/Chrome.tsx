import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, GUTTER } from "../theme";
import { BODY } from "../fonts";

// Persistent site masthead — matches the /stylebrief header band.
// "STUDIO" micro label left, "ECLECTIC HIVE" tracked caps centered.
export const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const inOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const op = inOp;

  const labelStyle: React.CSSProperties = {
    color: COLORS.charcoal,
    fontFamily: BODY,
    fontSize: 14,
    letterSpacing: "0.32em",
    textTransform: "uppercase",
    fontWeight: 500,
  };

  return (
    <div style={{ position: "absolute", top: 90, left: GUTTER, right: GUTTER, opacity: op, pointerEvents: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ ...labelStyle, opacity: 0.45 }}>STUDIO</span>
        <span style={{ ...labelStyle, opacity: 0.95 }}>ECLECTIC HIVE</span>
        <span style={{ ...labelStyle, opacity: 0.45 }}>STYLE BRIEF</span>
      </div>
      <div style={{ marginTop: 24, height: 1, background: COLORS.rule }} />
    </div>
  );
};

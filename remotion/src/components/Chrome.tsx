import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";

// Persistent editorial chrome: top-left wordmark + top-right step counter +
// bottom rule with running label. Fades in once at the very start and stays.
export const Chrome: React.FC<{ step: number; label: string }> = ({ step, label }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const chromeIn = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const chromeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const op = Math.min(chromeIn, chromeOut);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: op }}>
      {/* top-left wordmark */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 56,
          color: COLORS.charcoal,
          fontFamily: DISPLAY,
          fontSize: 28,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 400,
        }}
      >
        Eclectic&nbsp;Hive
      </div>
      <div
        style={{
          position: "absolute",
          top: 116,
          left: 56,
          color: COLORS.charcoal,
          opacity: 0.55,
          fontFamily: BODY,
          fontSize: 11,
          letterSpacing: "0.34em",
          textTransform: "uppercase",
        }}
      >
        The Style Brief
      </div>

      {/* top-right step indicator */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 56,
          textAlign: "right",
          color: COLORS.charcoal,
          fontFamily: BODY,
          fontSize: 11,
          letterSpacing: "0.34em",
          textTransform: "uppercase",
        }}
      >
        <div style={{ opacity: 0.5 }}>0{step} / 05</div>
        <div style={{ marginTop: 6, fontWeight: 500 }}>{label}</div>
      </div>

      {/* bottom rule */}
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 86,
          height: 1,
          background: `${COLORS.charcoal}33`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 56,
          bottom: 50,
          color: COLORS.charcoal,
          opacity: 0.45,
          fontFamily: BODY,
          fontSize: 10,
          letterSpacing: "0.34em",
          textTransform: "uppercase",
        }}
      >
        eclectichive.com / stylebrief
      </div>
      <div
        style={{
          position: "absolute",
          right: 56,
          bottom: 50,
          color: COLORS.charcoal,
          opacity: 0.45,
          fontFamily: BODY,
          fontSize: 10,
          letterSpacing: "0.34em",
          textTransform: "uppercase",
        }}
      >
        Denver · Mountain West
      </div>
    </div>
  );
};

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 05 — SENT. "Sent." alone first, 30f silent hold, then tagline by
// opacity only. Long 120f tail. No background motion.

export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();

  // "Sent." enters: opacity + slow +4px upward drift
  const sentOp = interpolate(frame, [4, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sentY = interpolate(frame, [4, 24], [4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Tagline: opacity only, no movement, starts AFTER 30f hold
  const taglineOp = interpolate(frame, [54, 78], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Footer line + handle, even later
  const footerOp = interpolate(frame, [72, 92], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Chrome step={5} label="Sent" />

      <div style={{ textAlign: "center", width: 1200 }}>
        <div
          style={{
            color: COLORS.charcoal,
            opacity: 0.55,
            fontFamily: BODY,
            fontSize: 12,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          Step Five
        </div>

        {/* SENT. — alone for 30f */}
        <div
          style={{
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 220,
            fontWeight: 300,
            letterSpacing: "0.02em",
            lineHeight: 1.0,
            opacity: sentOp,
            transform: `translateY(${sentY}px)`,
          }}
        >
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>Sent.</em>
        </div>

        {/* Tagline — opacity only, no movement */}
        <div
          style={{
            marginTop: 64,
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 36,
            fontStyle: "italic",
            fontWeight: 400,
            opacity: taglineOp,
          }}
        >
          We'll be in touch within two business days.
        </div>

        {/* Footer mark */}
        <div
          style={{
            marginTop: 96,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 28,
            opacity: footerOp,
          }}
        >
          <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            Eclectic Hive
          </span>
          <span style={{ width: 60, height: 1, background: COLORS.charcoal, opacity: 0.5 }} />
          <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            eclectichive.com / stylebrief
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

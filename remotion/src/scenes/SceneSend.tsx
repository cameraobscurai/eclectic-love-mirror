import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 05 — SENT. Vertical 1080×1920. "Sent." alone, big, with a slow zoom-in
// (1 → 1.04). 30f hold, then tagline fades up. Footer mark last.

export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();

  const sentOp = interpolate(frame, [4, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sentY = interpolate(frame, [4, 28], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sentZoom = interpolate(frame, [0, 168], [1.0, 1.05]);

  const taglineOp = interpolate(frame, [60, 84], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footerOp = interpolate(frame, [82, 102], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Chrome step={5} label="Sent" />

      <div style={{ textAlign: "center", width: 920, transform: `scale(${sentZoom})` }}>
        <div
          style={{
            color: COLORS.charcoal,
            opacity: 0.55,
            fontFamily: BODY,
            fontSize: 13,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            marginBottom: 36,
          }}
        >
          Step Five · 05 / 05
        </div>

        <div
          style={{
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 240,
            fontWeight: 300,
            letterSpacing: "0.01em",
            lineHeight: 1.0,
            opacity: sentOp,
            transform: `translateY(${sentY}px)`,
          }}
        >
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>Sent.</em>
        </div>

        <div
          style={{
            marginTop: 64,
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 34,
            fontStyle: "italic",
            fontWeight: 400,
            opacity: taglineOp,
            lineHeight: 1.3,
            padding: "0 40px",
          }}
        >
          We'll be in touch within<br />two business days.
        </div>

        <div
          style={{
            marginTop: 96,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 22,
            opacity: footerOp,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            Eclectic Hive
          </span>
          <span style={{ width: 60, height: 1, background: COLORS.charcoal, opacity: 0.5 }} />
          <span style={{ fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            eclectichive.com
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

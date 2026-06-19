import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 05 — SEND. A single deep editorial card: large statement, signature,
// soft envelope motif sliding across the screen as the close.
export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 90 } });
  const subIn = spring({ frame: frame - 36, fps, config: { damping: 22, stiffness: 90 } });
  const sigIn = spring({ frame: frame - 60, fps, config: { damping: 22, stiffness: 90 } });
  const ruleIn = spring({ frame: frame - 24, fps, config: { damping: 22, stiffness: 80 } });

  // Envelope rule sweep
  const sweep = interpolate(frame, [80, 150], [-200, 1200], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Chrome step={5} label="Sent" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* tiny eyebrow */}
        <div
          style={{
            opacity: interpolate(titleIn, [0, 1], [0, 0.55]),
            fontFamily: BODY,
            fontSize: 12,
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            color: COLORS.charcoal,
            marginBottom: 36,
          }}
        >
          Step Five
        </div>

        {/* primary statement */}
        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [30, 0])}px)`,
            fontFamily: DISPLAY,
            fontSize: 180,
            lineHeight: 0.92,
            fontWeight: 300,
            color: COLORS.charcoal,
            letterSpacing: "-0.015em",
          }}
        >
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>Sent.</em>
        </div>

        {/* hairline sweep — acts as the "send" motion */}
        <div
          style={{
            marginTop: 48,
            width: 720,
            height: 1,
            background: `${COLORS.charcoal}30`,
            position: "relative",
            transform: `scaleX(${ruleIn})`,
            transformOrigin: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -3,
              left: sweep,
              width: 120,
              height: 7,
              background: COLORS.charcoal,
              opacity: interpolate(frame, [80, 100, 150], [0, 1, 0]),
            }}
          />
        </div>

        {/* subline */}
        <div
          style={{
            marginTop: 44,
            opacity: subIn,
            transform: `translateY(${interpolate(subIn, [0, 1], [16, 0])}px)`,
            fontFamily: DISPLAY,
            fontSize: 38,
            fontStyle: "italic",
            color: COLORS.charcoal,
            opacity: subIn * 0.85,
            maxWidth: 900,
          }}
        >
          We'll be in touch within two business days.
        </div>

        {/* signature row */}
        <div
          style={{
            marginTop: 64,
            opacity: sigIn,
            transform: `translateY(${interpolate(sigIn, [0, 1], [12, 0])}px)`,
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <span
            style={{
              fontFamily: BODY,
              fontSize: 11,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: COLORS.charcoal,
              opacity: 0.6,
            }}
          >
            Eclectic Hive
          </span>
          <span
            style={{
              width: 50,
              height: 1,
              background: `${COLORS.charcoal}55`,
            }}
          />
          <span
            style={{
              fontFamily: BODY,
              fontSize: 11,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: COLORS.charcoal,
              opacity: 0.6,
            }}
          >
            eclectichive.com / stylebrief
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

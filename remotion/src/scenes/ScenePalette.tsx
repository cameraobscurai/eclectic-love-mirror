import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, SAMPLE_PALETTE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 02 — PALETTE. Sample image columns on the right; on the left, color
// chips extract one at a time into a horizontal palette band.
export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineIn = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });

  return (
    <AbsoluteFill>
      <Chrome step={2} label="Extract Palette" />

      {/* Right column — three source thumbs that gently breathe */}
      <div
        style={{
          position: "absolute",
          right: 200,
          top: 200,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {[
          ["#3a342c", "#7a6a55"],
          ["#c89c6a", "#e8e1d6"],
          ["#6e3a2b", "#1a1a1a"],
        ].map((g, i) => {
          const breathe = Math.sin(frame / 30 + i) * 4;
          const sp = spring({ frame: frame - (6 + i * 5), fps, config: { damping: 18, stiffness: 120 } });
          return (
            <div
              key={i}
              style={{
                width: 380,
                height: 200,
                opacity: sp,
                transform: `translateY(${breathe}px) scale(${interpolate(sp, [0, 1], [0.96, 1])})`,
                background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
                boxShadow: "0 20px 50px -18px rgba(26,26,26,0.35)",
                border: `1px solid ${COLORS.charcoal}22`,
                position: "relative",
              }}
            >
              {/* color-pick ping that emerges from each thumb at the moment its chip lands */}
              <div
                style={{
                  position: "absolute",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: COLORS.cream,
                  border: `2px solid ${COLORS.charcoal}`,
                  left: 60 + i * 80,
                  top: 60 + (i % 2) * 60,
                  opacity: interpolate(frame, [40 + i * 14, 60 + i * 14], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transform: `scale(${interpolate(frame, [40 + i * 14, 60 + i * 14], [0.3, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })})`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Left — headline */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 180,
          opacity: headlineIn,
          transform: `translateY(${interpolate(headlineIn, [0, 1], [30, 0])}px)`,
        }}
      >
        <div
          style={{
            color: COLORS.charcoal,
            opacity: 0.55,
            fontFamily: BODY,
            fontSize: 12,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          Step Two
        </div>
        <div
          style={{
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 132,
            lineHeight: 0.95,
            fontWeight: 300,
            letterSpacing: "-0.01em",
          }}
        >
          Your
          <br />
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>palette</em>,
          <br />
          extracted.
        </div>
      </div>

      {/* Bottom palette band — chips drop in proportionally with hex labels */}
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 200,
          bottom: 200,
          display: "flex",
          gap: 12,
        }}
      >
        {SAMPLE_PALETTE.map((hex, i) => {
          const delay = 36 + i * 6;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 130 } });
          const h = interpolate(sp, [0, 1], [0, 180]);
          const op = interpolate(sp, [0, 1], [0, 1]);
          // Determine readable ink color
          const rgb = hex.replace("#", "").match(/.{2}/g)!.map((x) => parseInt(x, 16) / 255);
          const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
          const ink = lum > 0.58 ? COLORS.charcoal : COLORS.cream;
          return (
            <div
              key={hex}
              style={{
                flex: 1,
                height: h,
                background: hex,
                opacity: op,
                display: "flex",
                alignItems: "flex-end",
                padding: 14,
                fontFamily: BODY,
                fontSize: 11,
                color: ink,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {hex.toUpperCase()}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

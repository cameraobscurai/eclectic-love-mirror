import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, REAL_PALETTE, INSPO } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 02 — PALETTE. Three real inspo thumbs breathe on the right while the
// real extracted palette band lands hex-by-hex along the bottom.
const SOURCE_THUMBS = [INSPO[0], INSPO[1], INSPO[2]];

export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineIn = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });

  return (
    <AbsoluteFill>
      <Chrome step={2} label="Extract Palette" />

      <div style={{ position: "absolute", right: 200, top: 200, display: "flex", flexDirection: "column", gap: 24 }}>
        {SOURCE_THUMBS.map((src, i) => {
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
                boxShadow: "0 20px 50px -18px rgba(26,26,26,0.35)",
                border: `1px solid ${COLORS.charcoal}22`,
                position: "relative",
                overflow: "hidden",
                background: COLORS.cream,
              }}
            >
              <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div
                style={{
                  position: "absolute",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: REAL_PALETTE[1 + i * 2],
                  border: `2px solid ${COLORS.cream}`,
                  boxShadow: `0 0 0 1px ${COLORS.charcoal}`,
                  left: 60 + i * 80,
                  top: 60 + (i % 2) * 60,
                  opacity: interpolate(frame, [40 + i * 14, 60 + i * 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  transform: `scale(${interpolate(frame, [40 + i * 14, 60 + i * 14], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 160,
          top: 180,
          opacity: headlineIn,
          transform: `translateY(${interpolate(headlineIn, [0, 1], [30, 0])}px)`,
        }}
      >
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 28 }}>
          Step Two
        </div>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 132, lineHeight: 0.95, fontWeight: 300, letterSpacing: "-0.01em" }}>
          Your<br />
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>palette</em>,<br />
          extracted.
        </div>
      </div>

      <div style={{ position: "absolute", left: 160, right: 200, bottom: 200, display: "flex", gap: 12 }}>
        {REAL_PALETTE.map((hex, i) => {
          const delay = 36 + i * 6;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 130 } });
          const h = interpolate(sp, [0, 1], [0, 180]);
          const op = interpolate(sp, [0, 1], [0, 1]);
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

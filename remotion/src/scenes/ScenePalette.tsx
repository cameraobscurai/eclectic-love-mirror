import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO, PRODUCTS, REAL_PALETTE, SWATCH_ORIGINS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 03 — PALETTE. Vertical 1080×1920.
// All 13 source assets visible: 5 inspo tiles row + 8 product chips row.
// 8 swatches build as full-width bands below, each extracting from a DIFFERENT
// source via a hairline + traveling dot. This is the moment the viewer should
// realize "they pull from EVERYTHING I picked."

const SCENE_LEN = 228;
const HEADLINE_IN = 18;
const CONSTELLATION_IN = 28;
const FIRST_SWATCH = 60;
const SWATCH_STAGGER = 14;
const OUTRO_START = SCENE_LEN - 30;

// Constellation layout
const INSPO_ROW_Y = 460;
const INSPO_W = 188;
const INSPO_H = 232;
const INSPO_GAP = 8;
const INSPO_LEFT = (1080 - (5 * INSPO_W + 4 * INSPO_GAP)) / 2;

const PROD_ROW_Y = INSPO_ROW_Y + INSPO_H + 24;
const PROD_W = 116;
const PROD_H = 116;
const PROD_GAP = 14;
const PROD_LEFT = (1080 - (8 * PROD_W + 7 * PROD_GAP)) / 2;

// Swatch bands (8 stacked full-width)
const SW_LEFT = 80;
const SW_WIDTH = 920;
const SW_HEIGHT = 78;
const SW_GAP = 8;
const SW_TOP = 1050;

export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOp = interpolate(frame, [0, HEADLINE_IN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const outroOp = interpolate(frame, [OUTRO_START, SCENE_LEN], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // helper — source origin in frame px
  const sourcePos = (i: number) => {
    const o = SWATCH_ORIGINS[i];
    if (o.kind === "inspo") {
      const left = INSPO_LEFT + o.idx * (INSPO_W + INSPO_GAP);
      return { x: left + o.x * INSPO_W, y: INSPO_ROW_Y + o.y * INSPO_H };
    }
    const left = PROD_LEFT + o.idx * (PROD_W + PROD_GAP);
    return { x: left + o.x * PROD_W, y: PROD_ROW_Y + o.y * PROD_H };
  };

  return (
    <AbsoluteFill style={{ opacity: outroOp }}>
      <Chrome step={3} label="Extract Palette" />

      {/* Headline */}
      <div style={{ position: "absolute", left: 64, right: 64, top: 200, opacity: headlineOp }}>
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 13, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 22 }}>
          Step Three · 03 / 05
        </div>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 92, lineHeight: 0.95, fontWeight: 300 }}>
          We pull your <em style={{ fontStyle: "italic", fontWeight: 400 }}>palette</em><br />
          from everything.
        </div>
      </div>

      {/* Inspo row */}
      {INSPO.map((src, i) => {
        const sp = spring({ frame: frame - (CONSTELLATION_IN + i * 4), fps, config: { damping: 18, stiffness: 180 } });
        const op = interpolate(sp, [0, 1], [0, 1]);
        const y = interpolate(sp, [0, 1], [12, 0]);
        return (
          <div
            key={"inspo" + i}
            style={{
              position: "absolute",
              left: INSPO_LEFT + i * (INSPO_W + INSPO_GAP),
              top: INSPO_ROW_Y + y,
              width: INSPO_W,
              height: INSPO_H,
              opacity: op,
              background: COLORS.cream,
              padding: 6,
              boxShadow: "0 14px 36px -16px rgba(26,26,26,0.32)",
            }}
          >
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        );
      })}

      {/* Product chip row */}
      {PRODUCTS.map((p, i) => {
        const sp = spring({ frame: frame - (CONSTELLATION_IN + 8 + i * 3), fps, config: { damping: 18, stiffness: 180 } });
        const op = interpolate(sp, [0, 1], [0, 1]);
        const y = interpolate(sp, [0, 1], [10, 0]);
        return (
          <div
            key={"prod" + i}
            style={{
              position: "absolute",
              left: PROD_LEFT + i * (PROD_W + PROD_GAP),
              top: PROD_ROW_Y + y,
              width: PROD_W,
              height: PROD_H,
              opacity: op,
              background: COLORS.cream,
              border: `1px solid ${COLORS.charcoal}14`,
              padding: 8,
              boxShadow: "0 8px 22px -12px rgba(26,26,26,0.28)",
            }}
          >
            <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          </div>
        );
      })}

      {/* Swatch bands */}
      {REAL_PALETTE.map((sw, i) => {
        const startFrame = FIRST_SWATCH + i * SWATCH_STAGGER;
        const t = interpolate(frame, [startFrame, startFrame + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        const src = sourcePos(i);
        const swTop = SW_TOP + i * (SW_HEIGHT + SW_GAP);
        const dx = SW_LEFT + 40; // dot lands at left edge of band
        const dy = swTop + SW_HEIGHT / 2;

        const cx = interpolate(t, [0, 1], [src.x, dx]);
        const cy = interpolate(t, [0, 1], [src.y, dy]);
        const lineOp = interpolate(t, [0, 0.3, 0.7, 1], [0, 0.55, 0.4, 0]);

        // swatch reveal — clip-path wipe from left
        const reveal = spring({ frame: frame - (startFrame + 18), fps, config: { damping: 16, stiffness: 180 } });
        const wipeR = interpolate(reveal, [0, 1], [0, 100]);
        const bandOp = interpolate(reveal, [0, 0.3, 1], [0, 1, 1]);

        const len = Math.hypot(dx - src.x, dy - src.y);
        const angle = Math.atan2(dy - src.y, dx - src.x) * 180 / Math.PI;

        const labelOp = interpolate(frame, [startFrame + 24, startFrame + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        // text color on swatch — light text on dark bands, dark on light
        const lightBg = i <= 3;
        const textColor = lightBg ? "#1a1a1a" : "#faf6ec";

        return (
          <div key={i}>
            {/* hairline */}
            {t > 0 && t < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: src.x, top: src.y,
                  width: len, height: 1,
                  background: COLORS.charcoal,
                  opacity: lineOp * 0.5,
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "0 0",
                }}
              />
            )}

            {/* band */}
            <div
              style={{
                position: "absolute",
                left: SW_LEFT,
                top: swTop,
                width: SW_WIDTH,
                height: SW_HEIGHT,
                background: sw.hex,
                opacity: bandOp,
                clipPath: `inset(0 ${100 - wipeR}% 0 0)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: 80,
                paddingRight: 32,
                boxShadow: "0 6px 18px -10px rgba(26,26,26,0.28)",
              }}
            >
              <div style={{ opacity: labelOp, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 28, color: textColor, fontWeight: 400 }}>
                {sw.name}
              </div>
              <div style={{ opacity: labelOp * 0.7, fontFamily: BODY, fontSize: 11, letterSpacing: "0.28em", color: textColor }}>
                {sw.hex}
              </div>
            </div>

            {/* traveling dot */}
            {t > 0 && t < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: cx - 6, top: cy - 6,
                  width: 12, height: 12,
                  borderRadius: "50%",
                  background: sw.hex,
                  boxShadow: `0 0 0 2px ${COLORS.cream}, 0 4px 10px -2px rgba(26,26,26,0.5)`,
                }}
              />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

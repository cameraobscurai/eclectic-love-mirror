import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO, PRODUCTS, REAL_PALETTE, SWATCH_ORIGINS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard } from "../components/IndexCard";

// SCENE 03 — PALETTE. All 13 sources visible inside the card. Hairlines pull
// each swatch from a different source. The card frames the whole act.

const SCENE_LEN = 240;
const CONST_IN = 14;
const FIRST_SWATCH = 56;
const SWATCH_STAGGER = 14;

// Inner content geometry (relative to IndexCard content area: 968 × ~1232)
const INSPO_W = 168;
const INSPO_H = 200;
const INSPO_GAP = 8;
const INSPO_TOP = 80;
const INSPO_LEFT = (968 - (5 * INSPO_W + 4 * INSPO_GAP)) / 2;

const PROD_W = 104;
const PROD_H = 104;
const PROD_GAP = 8;
const PROD_TOP = INSPO_TOP + INSPO_H + 20;
const PROD_LEFT = (968 - (8 * PROD_W + 7 * PROD_GAP)) / 2;

const SW_WIDTH = 820;
const SW_HEIGHT = 64;
const SW_GAP = 5;
const SW_TOP = PROD_TOP + PROD_H + 36;
const SW_LEFT = (968 - SW_WIDTH) / 2;

export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sourcePos = (i: number) => {
    const o = SWATCH_ORIGINS[i];
    if (o.kind === "inspo") {
      const left = INSPO_LEFT + o.idx * (INSPO_W + INSPO_GAP);
      return { x: left + o.x * INSPO_W, y: INSPO_TOP + o.y * INSPO_H };
    }
    const left = PROD_LEFT + o.idx * (PROD_W + PROD_GAP);
    return { x: left + o.x * PROD_W, y: PROD_TOP + o.y * PROD_H };
  };

  return (
    <AbsoluteFill>
      <IndexCard step={3} label="Palette" subtitle="From everything you chose." sceneLen={SCENE_LEN}>
        {/* small note top right */}
        <div
          style={{
            position: "absolute", top: 30, right: 32,
            color: COLORS.charcoal, opacity: 0.45,
            fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase",
          }}
        >
          13 Sources · 08 Tones
        </div>

        {/* Inspo row */}
        {INSPO.map((src, i) => {
          const sp = spring({ frame: frame - (CONST_IN + i * 4), fps, config: { damping: 18, stiffness: 180 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [10, 0]);
          return (
            <div
              key={"i" + i}
              style={{
                position: "absolute",
                left: INSPO_LEFT + i * (INSPO_W + INSPO_GAP),
                top: INSPO_TOP + y,
                width: INSPO_W, height: INSPO_H,
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
          const sp = spring({ frame: frame - (CONST_IN + 8 + i * 3), fps, config: { damping: 18, stiffness: 180 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [8, 0]);
          return (
            <div
              key={"p" + i}
              style={{
                position: "absolute",
                left: PROD_LEFT + i * (PROD_W + PROD_GAP),
                top: PROD_TOP + y,
                width: PROD_W, height: PROD_H,
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
          const dx = SW_LEFT + 36;
          const dy = swTop + SW_HEIGHT / 2;

          const cx = interpolate(t, [0, 1], [src.x, dx]);
          const cy = interpolate(t, [0, 1], [src.y, dy]);
          const lineOp = interpolate(t, [0, 0.3, 0.7, 1], [0, 0.55, 0.4, 0]);

          const reveal = spring({ frame: frame - (startFrame + 18), fps, config: { damping: 16, stiffness: 180 } });
          const wipeR = interpolate(reveal, [0, 1], [0, 100]);
          const bandOp = interpolate(reveal, [0, 0.3, 1], [0, 1, 1]);

          const len = Math.hypot(dx - src.x, dy - src.y);
          const angle = Math.atan2(dy - src.y, dx - src.x) * 180 / Math.PI;

          const labelOp = interpolate(frame, [startFrame + 24, startFrame + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const lightBg = i <= 3;
          const textColor = lightBg ? "#1a1a1a" : "#faf6ec";

          return (
            <div key={i}>
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
              <div
                style={{
                  position: "absolute",
                  left: SW_LEFT, top: swTop,
                  width: SW_WIDTH, height: SW_HEIGHT,
                  background: sw.hex,
                  opacity: bandOp,
                  clipPath: `inset(0 ${100 - wipeR}% 0 0)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 64,
                  paddingRight: 28,
                  boxShadow: "0 6px 18px -10px rgba(26,26,26,0.28)",
                }}
              >
                <div style={{ opacity: labelOp, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 24, color: textColor, fontWeight: 400 }}>
                  {sw.name}
                </div>
                <div style={{ opacity: labelOp * 0.7, fontFamily: BODY, fontSize: 10, letterSpacing: "0.28em", color: textColor }}>
                  {sw.hex}
                </div>
              </div>
              {t > 0 && t < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: cx - 5, top: cy - 5,
                    width: 10, height: 10,
                    borderRadius: "50%",
                    background: sw.hex,
                    boxShadow: `0 0 0 2px ${COLORS.cream}, 0 4px 10px -2px rgba(26,26,26,0.5)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </IndexCard>
    </AbsoluteFill>
  );
};

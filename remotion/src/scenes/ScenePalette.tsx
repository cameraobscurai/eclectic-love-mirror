import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO, PRODUCTS, REAL_PALETTE, SWATCH_ORIGINS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard, INNER_W } from "../components/IndexCard";

// SCENE 03 — PALETTE. Mirrors the actual site palette UI:
// black "GENERATE PALETTE" button → a flush row of 8 equal swatches
// with hex labels in tabular nums underneath. Above: tiny source strip
// (inspo thumbs + product thumbs) showing where colors are pulled from.

const SCENE_LEN = 240;

// Source strip (top) — small thumbnails
const SOURCE_TOP = 0;
const INSPO_W = 130;
const INSPO_H = 160;
const INSPO_GAP = 10;
const INSPO_LEFT = 0;

const PROD_W = 78;
const PROD_H = 78;
const PROD_GAP = 8;
const PROD_LEFT = INSPO_LEFT + 5 * INSPO_W + 4 * INSPO_GAP + 24;

// Button row
const BTN_TOP = SOURCE_TOP + INSPO_H + 36;

// Swatch row — exactly like site: flush, equal width, hex labels under
const SW_TOP = BTN_TOP + 80;
const SW_H = 280;
const SW_W = INNER_W / REAL_PALETTE.length;

const BUTTON_AT = 18;
const FIRST_SWATCH = 50;
const SWATCH_STAGGER = 8;

export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sourcePos = (i: number) => {
    const o = SWATCH_ORIGINS[i];
    if (o.kind === "inspo") {
      const left = INSPO_LEFT + o.idx * (INSPO_W + INSPO_GAP);
      return { x: left + o.x * INSPO_W, y: SOURCE_TOP + o.y * INSPO_H };
    }
    const left = PROD_LEFT + (o.idx % 4) * (PROD_W + PROD_GAP);
    const row = Math.floor(o.idx / 4);
    return { x: left + o.x * PROD_W, y: SOURCE_TOP + row * (PROD_H + PROD_GAP) + o.y * PROD_H };
  };

  // Button state: idle → pressed → "Reading…"
  const btnPressed = frame >= BUTTON_AT && frame < FIRST_SWATCH;
  const btnLabel = frame < BUTTON_AT ? "GENERATE PALETTE"
    : frame < FIRST_SWATCH ? "READING…"
    : "RE-GENERATE PALETTE";

  return (
    <AbsoluteFill>
      <IndexCard step={3} label="Palette" subtitle="Pulled from everything you chose." sceneLen={SCENE_LEN}>
        {/* INSPO strip */}
        {INSPO.map((src, i) => {
          const sp = spring({ frame: frame - (4 + i * 3), fps, config: { damping: 22, stiffness: 160 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [8, 0]);
          return (
            <div
              key={"i" + i}
              style={{
                position: "absolute",
                left: INSPO_LEFT + i * (INSPO_W + INSPO_GAP),
                top: SOURCE_TOP + y,
                width: INSPO_W, height: INSPO_H,
                opacity: op,
                background: "rgba(26,26,26,0.05)",
                overflow: "hidden",
              }}
            >
              <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          );
        })}

        {/* PRODUCT strip — 4×2 mini */}
        {PRODUCTS.map((p, i) => {
          const sp = spring({ frame: frame - (12 + i * 3), fps, config: { damping: 22, stiffness: 160 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const col = i % 4;
          const row = Math.floor(i / 4);
          return (
            <div
              key={"p" + i}
              style={{
                position: "absolute",
                left: PROD_LEFT + col * (PROD_W + PROD_GAP),
                top: SOURCE_TOP + row * (PROD_H + PROD_GAP),
                width: PROD_W, height: PROD_H,
                opacity: op,
                background: COLORS.cream,
                border: `1px solid ${COLORS.rule}`,
                padding: 6,
              }}
            >
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
          );
        })}

        {/* GENERATE PALETTE button — black, like the site */}
        <div
          style={{
            position: "absolute",
            left: 0, top: BTN_TOP,
            background: COLORS.charcoal,
            color: COLORS.cream,
            padding: "16px 28px",
            fontFamily: BODY,
            fontSize: 13,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            transform: btnPressed ? "translateY(2px)" : "translateY(0)",
            opacity: btnPressed ? 0.85 : 1,
          }}
        >
          {/* sparkles icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="1.5">
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
            <path d="M19 5l-2 2M7 17l-2 2M19 19l-2-2M7 7l-2-2" />
          </svg>
          {btnLabel}
        </div>

        {/* Combined Palette label */}
        <div
          style={{
            position: "absolute",
            left: 0, top: SW_TOP - 32,
            color: COLORS.charcoal,
            fontFamily: BODY, fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
            opacity: interpolate(frame, [FIRST_SWATCH - 4, FIRST_SWATCH + 4], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          Combined Palette
        </div>

        {/* Swatch row — flush, equal width, hex labels under (site-style) */}
        {REAL_PALETTE.map((sw, i) => {
          const startFrame = FIRST_SWATCH + i * SWATCH_STAGGER;
          const reveal = spring({ frame: frame - startFrame, fps, config: { damping: 22, stiffness: 180 } });
          const op = interpolate(reveal, [0, 1], [0, 1]);
          const wipeR = interpolate(reveal, [0, 1], [0, 100]);

          // hairline from source
          const t = interpolate(frame, [startFrame - 6, startFrame + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const src = sourcePos(i);
          const dx = i * SW_W + SW_W / 2;
          const dy = SW_TOP;
          const len = Math.hypot(dx - src.x, dy - src.y);
          const angle = Math.atan2(dy - src.y, dx - src.x) * 180 / Math.PI;
          const lineOp = interpolate(t, [0, 0.4, 0.7, 1], [0, 0.5, 0.3, 0]);

          const labelOp = interpolate(frame, [startFrame + 8, startFrame + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={i}>
              {t > 0 && t < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: src.x, top: src.y,
                    width: len, height: 1,
                    background: COLORS.charcoal,
                    opacity: lineOp,
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: "0 0",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: i * SW_W, top: SW_TOP,
                  width: SW_W, height: SW_H,
                  background: sw.hex,
                  opacity: op,
                  clipPath: `inset(${100 - wipeR}% 0 0 0)`,  // wipe down from top
                }}
              />
              {/* hex label below swatch */}
              <div
                style={{
                  position: "absolute",
                  left: i * SW_W,
                  top: SW_TOP + SW_H + 10,
                  width: SW_W,
                  textAlign: "center",
                  color: COLORS.charcoal,
                  opacity: labelOp * 0.6,
                  fontFamily: BODY,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {sw.hex}
              </div>
              {/* name in italic above hex */}
              <div
                style={{
                  position: "absolute",
                  left: i * SW_W,
                  top: SW_TOP + SW_H + 30,
                  width: SW_W,
                  textAlign: "center",
                  color: COLORS.charcoal,
                  opacity: labelOp * 0.45,
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  fontSize: 16,
                }}
              >
                {sw.name}
              </div>
            </div>
          );
        })}
      </IndexCard>
    </AbsoluteFill>
  );
};

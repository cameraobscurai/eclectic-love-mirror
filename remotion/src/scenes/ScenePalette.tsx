import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO, PRODUCTS, REAL_PALETTE, SWATCH_ORIGINS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard, INNER_W } from "../components/IndexCard";

// SCENE 03 — PALETTE. Body composed as: PULLED FROM source row → button →
// hero swatch wall (420 tall) with hex + italic name footer → italic closer.
// Cohesion: shared section labels, hairline dividers, "08 TONES" counter,
// italic closer matching Scene 4's "Yours, The Hive" and Scene 5's "Sent.".

const SCENE_LEN = 240;

// --- Layout constants (relative to the 936×1120 inner content box) ---
const LABEL_1 = 0;                 // "PULLED FROM"
const SOURCE_TOP = 24;             // inspo + product chips row
const INSPO_W = 130;
const INSPO_H = 160;
const INSPO_GAP = 10;
const PROD_W = 56;
const PROD_H = 56;
const PROD_GAP = 8;
const PROD_LEFT = 5 * INSPO_W + 4 * INSPO_GAP + 24;

const DIV_1 = 210;
const BTN_TOP = 236;
const DIV_2 = 320;

const LABEL_2 = 344;               // "COMBINED PALETTE / 08 TONES"
const SW_TOP = 376;
const SW_H = 420;
const SW_W = INNER_W / REAL_PALETTE.length;
const HEX_TOP = SW_TOP + SW_H + 14;
const NAME_TOP = HEX_TOP + 22;

const DIV_3 = NAME_TOP + 46;       // ~862
const CLOSER_TOP = DIV_3 + 30;     // ~892

// --- Timing ---
const BUTTON_AT = 22;
const FIRST_SWATCH = 56;
const SWATCH_STAGGER = 7;
const CLOSER_AT = FIRST_SWATCH + REAL_PALETTE.length * SWATCH_STAGGER + 12;

export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sourcePos = (i: number) => {
    const o = SWATCH_ORIGINS[i];
    if (o.kind === "inspo") {
      const left = o.idx * (INSPO_W + INSPO_GAP);
      return { x: left + o.x * INSPO_W, y: SOURCE_TOP + o.y * INSPO_H };
    }
    const left = PROD_LEFT + o.idx * (PROD_W + PROD_GAP);
    return { x: left + o.x * PROD_W, y: SOURCE_TOP + o.y * PROD_H };
  };

  const btnPressed = frame >= BUTTON_AT && frame < FIRST_SWATCH;
  const btnLabel = frame < BUTTON_AT ? "GENERATE PALETTE"
    : frame < FIRST_SWATCH ? "READING…"
    : "RE-GENERATE PALETTE";

  // Reveal helpers
  const revealOp = (at: number) => interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const revealY = (at: number) => interpolate(frame, [at, at + 14], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const label1Op = revealOp(0);
  const div1Op = interpolate(frame, [BUTTON_AT - 6, BUTTON_AT + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const div2Op = interpolate(frame, [FIRST_SWATCH - 10, FIRST_SWATCH], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const label2Op = div2Op;
  const div3Op = interpolate(frame, [CLOSER_AT - 8, CLOSER_AT + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const closerOp = revealOp(CLOSER_AT);
  const closerY = revealY(CLOSER_AT);

  return (
    <AbsoluteFill>
      <IndexCard step={3} label="Palette" subtitle="Pulled from everything you chose." sceneLen={SCENE_LEN}>
        {/* PULLED FROM label */}
        <div
          style={{
            position: "absolute", left: 0, top: LABEL_1,
            color: COLORS.charcoal, opacity: label1Op * 0.55,
            fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase",
          }}
        >
          Pulled From
        </div>

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
                left: i * (INSPO_W + INSPO_GAP),
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

        {/* PRODUCT chips — single inline row, smaller */}
        {PRODUCTS.map((p, i) => {
          const sp = spring({ frame: frame - (12 + i * 2), fps, config: { damping: 22, stiffness: 160 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          // Two rows of 4 stacked vertically inside the inspo band height
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

        {/* Divider 1 */}
        <div style={{ position: "absolute", left: 0, right: 0, top: DIV_1, height: 1, background: COLORS.rule, opacity: div1Op }} />

        {/* GENERATE button */}
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="1.5">
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
            <path d="M19 5l-2 2M7 17l-2 2M19 19l-2-2M7 7l-2-2" />
          </svg>
          {btnLabel}
        </div>

        {/* Divider 2 */}
        <div style={{ position: "absolute", left: 0, right: 0, top: DIV_2, height: 1, background: COLORS.rule, opacity: div2Op }} />

        {/* COMBINED PALETTE / 08 TONES row */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: LABEL_2,
            display: "flex", justifyContent: "space-between",
            opacity: label2Op,
            color: COLORS.charcoal,
            fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase",
          }}
        >
          <span style={{ opacity: 0.55 }}>Combined Palette</span>
          <span style={{ opacity: 0.45 }}>08 Tones</span>
        </div>

        {/* Swatch wall — hero */}
        {REAL_PALETTE.map((sw, i) => {
          const startFrame = FIRST_SWATCH + i * SWATCH_STAGGER;
          const reveal = spring({ frame: frame - startFrame, fps, config: { damping: 22, stiffness: 180 } });
          const op = interpolate(reveal, [0, 1], [0, 1]);
          const wipeR = interpolate(reveal, [0, 1], [0, 100]);

          // hairline from source → swatch top center
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
                  clipPath: `inset(${100 - wipeR}% 0 0 0)`,
                }}
              />
              {/* hex */}
              <div
                style={{
                  position: "absolute",
                  left: i * SW_W,
                  top: HEX_TOP,
                  width: SW_W,
                  textAlign: "center",
                  color: COLORS.charcoal,
                  opacity: labelOp * 0.65,
                  fontFamily: BODY,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {sw.hex}
              </div>
              {/* italic name */}
              <div
                style={{
                  position: "absolute",
                  left: i * SW_W,
                  top: NAME_TOP,
                  width: SW_W,
                  textAlign: "center",
                  color: COLORS.charcoal,
                  opacity: labelOp * 0.55,
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  fontSize: 18,
                }}
              >
                {sw.name}
              </div>
            </div>
          );
        })}

        {/* Divider 3 */}
        <div style={{ position: "absolute", left: 0, right: 0, top: DIV_3, height: 1, background: COLORS.rule, opacity: div3Op }} />

        {/* Italic closer */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: CLOSER_TOP,
            textAlign: "center",
            color: COLORS.charcoal,
            opacity: closerOp * 0.75,
            transform: `translateY(${closerY}px)`,
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontSize: 26,
          }}
        >
          Eight tones — composed.
        </div>
      </IndexCard>
    </AbsoluteFill>
  );
};

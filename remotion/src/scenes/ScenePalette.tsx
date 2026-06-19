import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { COLORS, INSPO, REAL_PALETTE, SWATCH_ORIGINS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 03 — PALETTE. Open on the amber color bridge from ScenePin (1f), then
// build to a 2-image inspo strip + 8 swatches that each animate FROM a real
// pixel coord ON the inspo image OUT to their swatch position via a hairline.
// Lightest → darkest, 12f apart. Hold 66f still. Outro fades swatches to cream
// + holds 12f on white (page-turn into SceneBrief).

const SCENE_LEN = 168;
const BRIDGE_END = 8;     // amber bridge fades out 0→8
const FIRST_SWATCH = 18;
const SWATCH_STAGGER = 9;
const HOLD_FRAME = FIRST_SWATCH + REAL_PALETTE.length * SWATCH_STAGGER + 28; // ~118
const OUTRO_FADE_START = SCENE_LEN - 30; // 18f swatches fade + 12f white hold
const OUTRO_WHITE_START = SCENE_LEN - 12;

// Two inspo images visible (the courtyard table + linen macro)
const SHOWN_INSPO = [
  { src: INSPO[0], x: 1380, y: 220, w: 440, h: 320 },
  { src: INSPO[1], x: 1380, y: 580, w: 440, h: 320 },
];

// Final swatch row geometry
const SWATCH_TOP = 760;
const SWATCH_W = 150;
const SWATCH_H = 150;
const SWATCH_GAP = 16;
const SWATCH_ROW_LEFT = 160;

export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;

  // Amber bridge fade out
  const bridgeOp = interpolate(frame, [0, BRIDGE_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Headline fade in
  const headlineOp = interpolate(frame, [BRIDGE_END, BRIDGE_END + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Outro white sweep
  const outroOp = interpolate(frame, [OUTRO_FADE_START, OUTRO_WHITE_START], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // ensure cards/swatches still visible until fade-out
  const contentOp = interpolate(frame, [OUTRO_FADE_START, OUTRO_WHITE_START], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  void HOLD_FRAME;

  return (
    <AbsoluteFill>
      <Chrome step={3} label="Extract Palette" />

      <div style={{ opacity: contentOp, position: "absolute", inset: 0 }}>
        {/* Two inspo cards on the right */}
        {SHOWN_INSPO.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x, top: s.y,
              width: s.w, height: s.h,
              opacity: 0.92,
              boxShadow: "0 18px 50px -18px rgba(26,26,26,0.35)",
              background: COLORS.cream,
              padding: 8,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile(s.src)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ))}

        {/* Headline */}
        <div
          style={{
            position: "absolute",
            left: 160,
            top: 280,
            opacity: headlineOp,
            maxWidth: 980,
          }}
        >
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 24 }}>
            Step Three
          </div>
          <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 132, lineHeight: 0.95, fontWeight: 300 }}>
            Your <em style={{ fontStyle: "italic", fontWeight: 400 }}>palette</em>,<br />
            extracted.
          </div>
        </div>

        {/* Swatch row + extraction dots + hairlines */}
        {REAL_PALETTE.map((sw, i) => {
          const startFrame = FIRST_SWATCH + i * SWATCH_STAGGER;
          const t = interpolate(frame, [startFrame, startFrame + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          // origin coord on the corresponding inspo card
          const origin = SWATCH_ORIGINS[i] || { inspoIndex: 0 as 0, x: 0.5, y: 0.5 };
          const inspoCard = SHOWN_INSPO[origin.inspoIndex];
          const ox = inspoCard.x + 8 + origin.x * (inspoCard.w - 16);
          const oy = inspoCard.y + 8 + origin.y * (inspoCard.h - 16);

          // destination swatch coord
          const dx = SWATCH_ROW_LEFT + i * (SWATCH_W + SWATCH_GAP) + SWATCH_W / 2;
          const dy = SWATCH_TOP + SWATCH_H / 2;

          // dot travels along hairline
          const cx = interpolate(t, [0, 1], [ox, dx]);
          const cy = interpolate(t, [0, 1], [oy, dy]);

          // hairline opacity peaks midway then fades
          const lineOp = interpolate(t, [0, 0.3, 0.7, 1], [0, 0.55, 0.35, 0]);

          // swatch box reveal once dot arrives
          const boxT = interpolate(frame, [startFrame + 18, startFrame + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          // hairline geometry as a transformed thin div
          const len = Math.hypot(dx - ox, dy - oy);
          const angle = Math.atan2(dy - oy, dx - ox) * 180 / Math.PI;

          // label text fade
          const labelOp = interpolate(frame, [startFrame + 24, startFrame + 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={i}>
              {/* hairline */}
              <div
                style={{
                  position: "absolute",
                  left: ox, top: oy,
                  width: len, height: 1,
                  background: COLORS.charcoal,
                  opacity: lineOp * 0.35,
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "0 0",
                  pointerEvents: "none",
                }}
              />
              {/* swatch box */}
              <div
                style={{
                  position: "absolute",
                  left: SWATCH_ROW_LEFT + i * (SWATCH_W + SWATCH_GAP),
                  top: SWATCH_TOP,
                  width: SWATCH_W,
                  height: SWATCH_H * boxT,
                  background: sw.hex,
                  boxShadow: "0 6px 18px -10px rgba(26,26,26,0.3)",
                }}
              />
              {/* dot traveling */}
              {t > 0 && t < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: cx - 4, top: cy - 4,
                    width: 8, height: 8,
                    borderRadius: "50%",
                    background: sw.hex,
                    boxShadow: `0 0 0 2px ${COLORS.cream}, 0 4px 10px -2px rgba(26,26,26,0.4)`,
                  }}
                />
              )}
              {/* name + hex below swatch */}
              <div style={{
                position: "absolute",
                left: SWATCH_ROW_LEFT + i * (SWATCH_W + SWATCH_GAP),
                top: SWATCH_TOP + SWATCH_H + 14,
                width: SWATCH_W,
                textAlign: "left",
                opacity: labelOp,
              }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 18, fontStyle: "italic", color: COLORS.charcoal, fontWeight: 400, marginBottom: 4 }}>
                  {sw.name}
                </div>
                <div style={{ fontFamily: BODY, fontSize: 10, letterSpacing: "0.22em", color: COLORS.charcoal, opacity: 0.55 }}>
                  {sw.hex}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* amber bridge */}
      <div style={{ position: "absolute", inset: 0, background: "#A46539", opacity: bridgeOp, pointerEvents: "none" }} />
      {/* white hold-on-white outro */}
      <div style={{ position: "absolute", inset: 0, background: COLORS.paper, opacity: outroOp, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

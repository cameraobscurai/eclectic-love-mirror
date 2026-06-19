import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO, REAL_PALETTE, SWATCH_ORIGINS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 03 — PALETTE. Vertical 1080×1920. Open on amber bridge, fade in.
// Two inspo cards top, swatches build as a 2-column grid below. Each swatch
// extracts from a pixel coord via hairline + traveling dot, then snaps in
// with a bounce. Slow scale-up on swatch grid. Outro to white.

const SCENE_LEN = 168;
const BRIDGE_END = 8;
const FIRST_SWATCH = 22;
const SWATCH_STAGGER = 8;
const OUTRO_FADE_START = SCENE_LEN - 30;
const OUTRO_WHITE_START = SCENE_LEN - 12;

// Two inspo cards top, side-by-side
const SHOWN_INSPO = [
  { src: INSPO[0], x: 64,  y: 560, w: 460, h: 360 },
  { src: INSPO[2], x: 556, y: 560, w: 460, h: 360 },
];

// Swatch grid (2 cols × 4 rows) below inspo
const SW_COLS = 2;
const SW_W = 460;
const SW_H = 130;
const SW_GAP_X = 32;
const SW_GAP_Y = 18;
const SW_LEFT = 64;
const SW_TOP = 980;

export const ScenePalette: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bridgeOp = interpolate(frame, [0, BRIDGE_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineOp = interpolate(frame, [BRIDGE_END, BRIDGE_END + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // slow Ken Burns push on inspo cards (1 → 1.04 across scene)
  const inspoZoom = interpolate(frame, [0, SCENE_LEN], [1.0, 1.04]);

  const outroOp = interpolate(frame, [OUTRO_FADE_START, OUTRO_WHITE_START], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contentOp = interpolate(frame, [OUTRO_FADE_START, OUTRO_WHITE_START], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Chrome step={3} label="Extract Palette" />

      <div style={{ opacity: contentOp, position: "absolute", inset: 0 }}>
        {/* Headline */}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: 220,
            opacity: headlineOp,
          }}
        >
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 13, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 22 }}>
            Step Three · 03 / 05
          </div>
          <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 104, lineHeight: 0.95, fontWeight: 300 }}>
            Your <em style={{ fontStyle: "italic", fontWeight: 400 }}>palette</em>,<br />
            extracted.
          </div>
        </div>

        {/* Inspo cards top */}
        {SHOWN_INSPO.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x, top: s.y,
              width: s.w, height: s.h,
              boxShadow: "0 22px 56px -22px rgba(26,26,26,0.4)",
              background: COLORS.cream,
              padding: 10,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile(s.src)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: `scale(${inspoZoom})` }}
            />
          </div>
        ))}

        {/* Swatches */}
        {REAL_PALETTE.map((sw, i) => {
          const startFrame = FIRST_SWATCH + i * SWATCH_STAGGER;
          const t = interpolate(frame, [startFrame, startFrame + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          const origin = SWATCH_ORIGINS[i] || { inspoIndex: 0 as 0, x: 0.5, y: 0.5 };
          // remap inspoIndex (0 or 1) to the 2 SHOWN_INSPO cards
          const cardIdx = origin.inspoIndex === 0 ? 0 : 1;
          const card = SHOWN_INSPO[cardIdx];
          const ox = card.x + 10 + origin.x * (card.w - 20);
          const oy = card.y + 10 + origin.y * (card.h - 20);

          const col = i % SW_COLS;
          const row = Math.floor(i / SW_COLS);
          const swLeft = SW_LEFT + col * (SW_W + SW_GAP_X);
          const swTop = SW_TOP + row * (SW_H + SW_GAP_Y);
          const dx = swLeft + SW_W / 2;
          const dy = swTop + SW_H / 2;

          const cx = interpolate(t, [0, 1], [ox, dx]);
          const cy = interpolate(t, [0, 1], [oy, dy]);
          const lineOp = interpolate(t, [0, 0.3, 0.7, 1], [0, 0.55, 0.35, 0]);

          // swatch snap-in with bounce
          const snap = spring({ frame: frame - (startFrame + 16), fps, config: { damping: 12, stiffness: 220 } });
          const boxScale = interpolate(snap, [0, 0.5, 1], [0, 1.08, 1]);
          const boxOp = interpolate(snap, [0, 0.3, 1], [0, 1, 1]);

          const len = Math.hypot(dx - ox, dy - oy);
          const angle = Math.atan2(dy - oy, dx - ox) * 180 / Math.PI;

          const labelOp = interpolate(frame, [startFrame + 22, startFrame + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={i}>
              <div
                style={{
                  position: "absolute",
                  left: ox, top: oy,
                  width: len, height: 1,
                  background: COLORS.charcoal,
                  opacity: lineOp * 0.4,
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "0 0",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: swLeft,
                  top: swTop,
                  width: SW_W,
                  height: SW_H,
                  background: sw.hex,
                  opacity: boxOp,
                  transform: `scale(${boxScale})`,
                  transformOrigin: "center center",
                  boxShadow: "0 8px 22px -10px rgba(26,26,26,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 24,
                  paddingRight: 24,
                }}
              >
                <div style={{ opacity: labelOp, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 28, color: "#1a1a1a", mixBlendMode: "multiply", fontWeight: 400 }}>
                  {sw.name}
                </div>
                <div style={{ opacity: labelOp * 0.7, fontFamily: BODY, fontSize: 11, letterSpacing: "0.28em", color: "#1a1a1a", mixBlendMode: "multiply" }}>
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
                    boxShadow: `0 0 0 2px ${COLORS.cream}, 0 4px 10px -2px rgba(26,26,26,0.4)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", inset: 0, background: "#A46539", opacity: bridgeOp, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: COLORS.paper, opacity: outroOp, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

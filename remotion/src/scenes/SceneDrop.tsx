import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 01 — DROP. Vertical 1080×1920. Headline top half, polaroid pile bottom.
// Slow Ken Burns push-in (1 → 1.08) the entire scene for cinematic motion.
// One card intentionally clipped off bottom. Outro scale + fade.

type Tile = {
  src: string;
  cx: number; cy: number;       // center coords (within 1080 canvas)
  w: number; h: number;
  rot: number;
  delay: number;
  vecX: number;
  vecY: number;
  shadow: string;
  clipped?: boolean;
};

// All coords assume a 1080×1920 frame. Pile sits in the bottom 60% of frame.
const TILES: Tile[] = [
  // 1 - Amangiri dinner — hero, largest, slight left tilt, centered
  { src: INSPO[0], cx: 540, cy: 1180, w: 620, h: 460, rot: -3.4, delay: 8,  vecX: -60, vecY: -120,
    shadow: "0 36px 90px -28px rgba(26,26,26,0.55), 0 10px 24px -10px rgba(26,26,26,0.35)" },
  // 2 - Lynden lounge — upper-right
  { src: INSPO[1], cx: 800, cy: 880,  w: 380, h: 380, rot:  5.6, delay: 22, vecX:  80, vecY: -140,
    shadow: "0 26px 70px -22px rgba(26,26,26,0.48)" },
  // 3 - Brush Creek — left, smaller
  { src: INSPO[3], cx: 230, cy: 940,  w: 340, h: 320, rot: -7.2, delay: 36, vecX: -100, vecY: -130,
    shadow: "0 22px 60px -20px rgba(26,26,26,0.42)" },
  // 4 - Dos Mas tablescape — lower-right
  { src: INSPO[2], cx: 760, cy: 1480, w: 420, h: 320, rot:  4.2, delay: 50, vecX:  90, vecY: -100,
    shadow: "0 24px 64px -20px rgba(26,26,26,0.46)" },
  // 5 - Brooke Hot Springs — clipped bottom-left
  { src: INSPO[4], cx: 260, cy: 1720, w: 380, h: 460, rot: -8.4, delay: 64, vecX: -70, vecY:  80,
    clipped: true,
    shadow: "0 18px 48px -18px rgba(26,26,26,0.42)" },
];

const SCENE_LEN = 150;
const OUTRO_START = SCENE_LEN - 24;

export const SceneDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow Ken Burns push (entire scene)
  const kenBurns = interpolate(frame, [0, SCENE_LEN], [1.0, 1.06]);

  // Outro
  const outroT = interpolate(frame, [OUTRO_START, SCENE_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroScale = interpolate(outroT, [0, 1], [1, 1.05]);
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);

  const headlineSp = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineSp, [0, 1], [40, 0]);

  return (
    <AbsoluteFill style={{ opacity: outroOp }}>
      <Chrome step={1} label="Drop Inspiration" />

      {/* Headline — top */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: 220,
          transform: `translateY(${headlineY}px)`,
          opacity: headlineSp,
        }}
      >
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 13, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 24 }}>
          Step One · 01 / 05
        </div>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 112, lineHeight: 0.92, fontWeight: 300, letterSpacing: "-0.01em" }}>
          Drop the<br />
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>images</em><br />
          that move you.
        </div>
      </div>

      {/* Polaroid pile — bottom 60%, with Ken Burns push */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${kenBurns * outroScale})`,
          transformOrigin: "50% 65%",
        }}
      >
        {TILES.map((t, i) => {
          const sp = spring({ frame: frame - t.delay, fps, config: { damping: 14, stiffness: 78, mass: 1.15 } });
          const dropY = interpolate(sp, [0, 1], [t.vecY * 3, 0]);
          const driftX = interpolate(sp, [0, 1], [t.vecX, 0]);
          const op = interpolate(sp, [0, 0.4, 1], [0, 0.6, 1]);
          const rotEntry = interpolate(sp, [0, 1], [t.rot - 14, t.rot]);
          const float = Math.sin((frame - t.delay) / 40 + i) * 1.4;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: t.cx - t.w / 2 + driftX,
                top: t.cy - t.h / 2 + dropY + float,
                width: t.w,
                height: t.h,
                opacity: op,
                transform: `rotate(${rotEntry}deg)`,
                boxShadow: t.shadow,
                background: COLORS.cream,
                padding: 12,
                paddingBottom: 28,
                border: `1px solid ${COLORS.charcoal}22`,
                overflow: "hidden",
                clipPath: t.clipped ? "inset(0 0 22% 0)" : undefined,
              }}
            >
              <Img
                src={staticFile(t.src)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

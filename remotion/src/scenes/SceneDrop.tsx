import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 01 — DROP. 5 inspiration polaroids, each with deliberate rotation,
// stagger, vector and shadow variance. One card intentionally clipped.
// Hold 54f dead-still after last card lands; outro scale 1→1.04 + fade.
type Tile = {
  src: string;
  x: number; y: number;
  w: number; h: number;
  rot: number;          // final resting rotation (odd values)
  delay: number;        // frames before drop
  vecX: number;         // entry vector x offset
  shadow: string;
  clipped?: boolean;    // hangs off the bottom edge
};

const TILES: Tile[] = [
  // Hero: courtyard table (warmest, biggest, slight left tilt)
  { src: INSPO[0], x: -240, y: -180, w: 360, h: 280, rot: -3.7, delay: 8,  vecX: -80,
    shadow: "0 30px 80px -22px rgba(26,26,26,0.55), 0 8px 22px -10px rgba(26,26,26,0.35)" },
  // Architecture (cool stone)
  { src: INSPO[3], x:  180, y: -210, w: 290, h: 290, rot:  5.2, delay: 20, vecX:  60,
    shadow: "0 22px 60px -18px rgba(26,26,26,0.45), 0 6px 14px -8px rgba(26,26,26,0.28)" },
  // Linen macro (textile diversity)
  { src: INSPO[1], x:  460, y:  -40, w: 230, h: 230, rot: -2.1, delay: 34, vecX:  100,
    shadow: "0 18px 50px -16px rgba(26,26,26,0.4), 0 4px 10px -6px rgba(26,26,26,0.22)" },
  // Kilim flat-lay (color punch, lower-left)
  { src: INSPO[4], x: -260, y:  120, w: 320, h: 240, rot:  8.6, delay: 48, vecX: -120,
    shadow: "0 26px 70px -20px rgba(26,26,26,0.5), 0 6px 18px -10px rgba(26,26,26,0.32)" },
  // Candle still-life — clipped at bottom edge (intentional imperfection)
  { src: INSPO[2], x:  120, y:  260, w: 280, h: 360, rot: -6.0, delay: 62, vecX:  40,
    clipped: true,
    shadow: "0 14px 42px -16px rgba(26,26,26,0.42), 0 4px 10px -6px rgba(26,26,26,0.24)" },
];

const LAST_LAND = 62 + 28;       // last delay + spring settle ≈ 90f
const HOLD_END = 150;            // scene total
const OUTRO_START = HOLD_END - 24;

export const SceneDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Outro: gentle scale-in + fade (camera lean)
  const outroT = interpolate(frame, [OUTRO_START, HOLD_END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroScale = interpolate(outroT, [0, 1], [1, 1.04]);
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);

  const headlineSp = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineSp, [0, 1], [40, 0]);
  const _ = LAST_LAND; void _;

  return (
    <AbsoluteFill style={{ opacity: outroOp, transform: `scale(${outroScale})`, transformOrigin: "center center" }}>
      <Chrome step={1} label="Drop Inspiration" />

      {/* Collage canvas right of headline */}
      <div style={{ position: "absolute", right: 120, top: "50%", width: 880, height: 720, transform: "translateY(-50%)" }}>
        {TILES.map((t, i) => {
          const sp = spring({ frame: frame - t.delay, fps, config: { damping: 14, stiffness: 80, mass: 1.1 } });
          const dropY = interpolate(sp, [0, 1], [-340, 0]);
          const driftX = interpolate(sp, [0, 1], [t.vecX, 0]);
          const op = interpolate(sp, [0, 0.4, 1], [0, 0.6, 1]);
          const rotEntry = interpolate(sp, [0, 1], [t.rot - 12, t.rot]);
          // tiny perpetual breathe — under 1.5px so it doesn't read as bounce
          const float = Math.sin((frame - t.delay) / 38 + i) * 1.2;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 440 + t.x + driftX,
                top: 360 + t.y + dropY + float,
                width: t.w,
                height: t.h,
                opacity: op,
                transform: `rotate(${rotEntry}deg)`,
                boxShadow: t.shadow,
                background: COLORS.cream,
                padding: 10,
                paddingBottom: 24,
                border: `1px solid ${COLORS.charcoal}22`,
                overflow: "hidden",
                clipPath: t.clipped ? "inset(0 0 28% 0)" : undefined,
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

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: "50%",
          transform: `translateY(calc(-50% + ${headlineY}px))`,
          opacity: headlineSp,
          maxWidth: 720,
        }}
      >
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 28 }}>
          Step One
        </div>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 132, lineHeight: 0.95, fontWeight: 300, letterSpacing: "-0.01em" }}>
          Drop the<br />
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>images</em> that<br />
          move you.
        </div>
        <div style={{ marginTop: 36, color: COLORS.charcoal, opacity: 0.7, fontFamily: BODY, fontSize: 14, letterSpacing: "0.32em", textTransform: "uppercase", fontWeight: 300 }}>
          Up to eight pieces of inspiration
        </div>
      </div>
    </AbsoluteFill>
  );
};

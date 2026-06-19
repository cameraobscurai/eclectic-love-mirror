import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 01 — DROP. Vertical 1080×1920.
// A literal upload act: photos enter from off-screen (top), arc down into a
// dashed drop-zone, stack as polaroids, while an "X of 5 photos added" ticker
// climbs. Hand-feel: each photo enters on its own beat, slight rotation.

const SCENE_LEN = 186;
const OUTRO_START = SCENE_LEN - 24;

// Drop-zone bounds in 1080×1920 frame
const ZONE_X = 80;
const ZONE_Y = 760;
const ZONE_W = 920;
const ZONE_H = 920;

// Tile entry stages — staggered every ~22f. Each photo starts off-screen above,
// arcs to a resting spot in the zone, ends rotated slightly.
type Tile = {
  src: string;
  startFrame: number;
  // resting position (within zone, in frame coords)
  restX: number;
  restY: number;
  w: number; h: number;
  rot: number;        // final rotation
  rotStart: number;   // entry rotation
};

const TILES: Tile[] = [
  // Photo 1 — biggest, lands center-back
  { src: INSPO[0], startFrame: 30,  restX: 540, restY: 1140, w: 540, h: 400, rot: -2.5,  rotStart: -28 },
  // Photo 2 — upper right
  { src: INSPO[1], startFrame: 56,  restX: 800, restY: 970,  w: 320, h: 320, rot:  6.8,  rotStart:  32 },
  // Photo 3 — lower left
  { src: INSPO[3], startFrame: 82,  restX: 280, restY: 1290, w: 340, h: 280, rot: -8.4,  rotStart: -34 },
  // Photo 4 — lower right
  { src: INSPO[2], startFrame: 108, restX: 770, restY: 1380, w: 360, h: 280, rot:  4.6,  rotStart:  30 },
  // Photo 5 — front, slight overlap bottom-left
  { src: INSPO[4], startFrame: 134, restX: 340, restY: 1540, w: 360, h: 440, rot: -5.6,  rotStart: -22 },
];

export const SceneDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // counter ticks up as each photo lands (use startFrame + 14 = roughly landed)
  const landed = TILES.filter((t) => frame >= t.startFrame + 14).length;

  // outro
  const outroT = interpolate(frame, [OUTRO_START, SCENE_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);
  const outroScale = interpolate(outroT, [0, 1], [1, 1.04]);

  const headlineSp = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineSp, [0, 1], [40, 0]);

  // drop-zone pulse (highlight when a new photo enters)
  const zonePulse = TILES.reduce((acc, t) => {
    const since = frame - t.startFrame;
    if (since < 0 || since > 18) return acc;
    return Math.max(acc, 1 - since / 18);
  }, 0);
  const zoneBorderOp = 0.25 + zonePulse * 0.55;
  const zoneFillOp = 0.04 + zonePulse * 0.10;

  // counter pulse
  const lastLandFrame = TILES.filter((t) => frame >= t.startFrame + 14)
    .map((t) => t.startFrame + 14)
    .pop() ?? -100;
  const counterSp = spring({ frame: frame - lastLandFrame, fps, config: { damping: 10, stiffness: 240 } });
  const counterScale = interpolate(counterSp, [0, 0.5, 1], [0.86, 1.18, 1]);

  return (
    <AbsoluteFill style={{ opacity: outroOp }}>
      <Chrome step={1} label="Drop Inspo" />

      {/* Headline — top */}
      <div style={{ position: "absolute", left: 64, right: 64, top: 200, opacity: headlineSp, transform: `translateY(${headlineY}px)` }}>
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 13, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 22 }}>
          Step One · 01 / 05
        </div>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 104, lineHeight: 0.92, fontWeight: 300, letterSpacing: "-0.01em" }}>
          Drop the<br />
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>images</em> that<br />
          move you.
        </div>
      </div>

      {/* Drop zone + ticker */}
      <div style={{ position: "absolute", left: ZONE_X, top: ZONE_Y - 64, right: ZONE_X, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
          Inspiration · Drag &amp; Drop
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, transform: `scale(${counterScale})`, transformOrigin: "100% 100%" }}>
          <span style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 64, fontWeight: 300, lineHeight: 1 }}>
            {String(landed).padStart(2, "0")}
          </span>
          <span style={{ color: COLORS.charcoal, opacity: 0.5, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            / 05 added
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", left: ZONE_X, top: ZONE_Y, width: ZONE_W, height: ZONE_H, transform: `scale(${outroScale})`, transformOrigin: "50% 50%" }}>
        {/* dashed border */}
        <svg width={ZONE_W} height={ZONE_H} style={{ position: "absolute", inset: 0 }}>
          <rect
            x="2" y="2" width={ZONE_W - 4} height={ZONE_H - 4}
            fill={COLORS.charcoal} fillOpacity={zoneFillOp}
            stroke={COLORS.charcoal} strokeOpacity={zoneBorderOp}
            strokeWidth="1.5"
            strokeDasharray="14 10"
          />
        </svg>

        {/* hint label when empty */}
        {landed === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: COLORS.charcoal, opacity: 0.4, fontFamily: BODY, fontSize: 14, letterSpacing: "0.42em", textTransform: "uppercase" }}>
              Drop photos here
            </div>
          </div>
        )}

        {/* tiles dropping in */}
        {TILES.map((t, i) => {
          const sp = spring({ frame: frame - t.startFrame, fps, config: { damping: 14, stiffness: 80, mass: 1.2 } });
          if (sp <= 0) return null;
          // entry: from top of frame, arcs to rest
          const entryX = interpolate(sp, [0, 1], [t.restX + (i % 2 === 0 ? -140 : 160), t.restX]);
          const entryY = interpolate(sp, [0, 1], [-300, t.restY]);
          const rot = interpolate(sp, [0, 1], [t.rotStart, t.rot]);
          const op = interpolate(sp, [0, 0.4, 1], [0, 0.85, 1]);
          // float once landed
          const settled = Math.max(0, frame - (t.startFrame + 18));
          const float = Math.sin(settled / 50 + i) * 1.2;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: entryX - ZONE_X - t.w / 2,
                top: entryY - ZONE_Y - t.h / 2 + float,
                width: t.w,
                height: t.h,
                opacity: op,
                transform: `rotate(${rot}deg)`,
                background: COLORS.cream,
                padding: 12,
                paddingBottom: 28,
                border: `1px solid ${COLORS.charcoal}22`,
                boxShadow: "0 32px 80px -28px rgba(26,26,26,0.55), 0 10px 22px -10px rgba(26,26,26,0.35)",
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

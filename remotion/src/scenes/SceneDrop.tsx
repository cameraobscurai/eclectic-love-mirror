import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO } from "../theme";
import { BODY } from "../fonts";
import { IndexCard } from "../components/IndexCard";

// SCENE 01 — INSPO. Photos drop into the card's content area, building a pile.
// The card IS the drop zone. Counter ticks in the upper right.

const SCENE_LEN = 186;

// Content area is ~968 wide × ~1239 tall (inside IndexCard).
// All tile coordinates are relative to that inner box.
type Tile = {
  src: string;
  startFrame: number;
  restX: number; restY: number;
  w: number; h: number;
  rot: number; rotStart: number;
};

const TILES: Tile[] = [
  // hero centerpiece
  { src: INSPO[0], startFrame: 26, restX: 484, restY: 600,  w: 540, h: 400, rot: -2.5,  rotStart: -28 },
  // upper right
  { src: INSPO[1], startFrame: 52, restX: 740, restY: 430,  w: 320, h: 320, rot:  6.8,  rotStart:  32 },
  // mid left
  { src: INSPO[3], startFrame: 78, restX: 215, restY: 560,  w: 340, h: 280, rot: -8.4,  rotStart: -34 },
  // lower right
  { src: INSPO[2], startFrame: 104, restX: 685, restY: 830, w: 360, h: 280, rot:  4.6,  rotStart:  30 },
  // bottom front
  { src: INSPO[4], startFrame: 130, restX: 320, restY: 940, w: 360, h: 430, rot: -5.6,  rotStart: -22 },
];

export const SceneDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const landed = TILES.filter((t) => frame >= t.startFrame + 14).length;
  const lastLand = TILES.filter((t) => frame >= t.startFrame + 14).map((t) => t.startFrame + 14).pop() ?? -100;
  const counterSp = spring({ frame: frame - lastLand, fps, config: { damping: 10, stiffness: 240 } });
  const counterScale = interpolate(counterSp, [0, 0.5, 1], [0.85, 1.18, 1]);

  return (
    <AbsoluteFill>
      <IndexCard step={1} label="Inspo" subtitle="What pulls you in." sceneLen={SCENE_LEN}>
        {/* Counter — upper right of content */}
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            transform: `scale(${counterScale})`,
            transformOrigin: "100% 50%",
          }}
        >
          <span style={{ color: COLORS.charcoal, fontFamily: BODY, fontSize: 36, fontWeight: 300, lineHeight: 1 }}>
            {String(landed).padStart(2, "0")}
          </span>
          <span style={{ color: COLORS.charcoal, opacity: 0.5, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            / 05
          </span>
        </div>

        {/* Photo pile */}
        {TILES.map((t, i) => {
          const sp = spring({ frame: frame - t.startFrame, fps, config: { damping: 14, stiffness: 80, mass: 1.2 } });
          if (sp <= 0) return null;
          const entryX = interpolate(sp, [0, 1], [t.restX + (i % 2 === 0 ? -120 : 140), t.restX]);
          const entryY = interpolate(sp, [0, 1], [-280, t.restY]);
          const rot = interpolate(sp, [0, 1], [t.rotStart, t.rot]);
          const op = interpolate(sp, [0, 0.4, 1], [0, 0.85, 1]);
          const settled = Math.max(0, frame - (t.startFrame + 18));
          const float = Math.sin(settled / 50 + i) * 1.0;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: entryX - t.w / 2,
                top: entryY - t.h / 2 + float,
                width: t.w,
                height: t.h,
                opacity: op,
                transform: `rotate(${rot}deg)`,
                background: COLORS.cream,
                padding: 10,
                paddingBottom: 24,
                border: `1px solid ${COLORS.charcoal}22`,
                boxShadow: "0 28px 70px -26px rgba(26,26,26,0.55), 0 8px 18px -8px rgba(26,26,26,0.32)",
              }}
            >
              <Img src={staticFile(t.src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          );
        })}
      </IndexCard>
    </AbsoluteFill>
  );
};

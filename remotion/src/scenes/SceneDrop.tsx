import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 01 — DROP. Real inspiration thumbnails cascade into a pinned collage.
const TILES = [
  { src: INSPO[0], x: -260, y: -180, w: 240, h: 300 },
  { src: INSPO[1], x:   30, y: -210, w: 280, h: 200 },
  { src: INSPO[2], x:  320, y: -160, w: 220, h: 260 },
  { src: INSPO[3], x: -240, y:  140, w: 240, h: 200 },
  { src: INSPO[4], x:   60, y:   60, w: 220, h: 320 },
  { src: INSPO[0], x:  320, y:  120, w: 220, h: 220 },
];

export const SceneDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineIn = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineIn, [0, 1], [40, 0]);

  return (
    <AbsoluteFill>
      <Chrome step={1} label="Drop Inspiration" />

      <div style={{ position: "absolute", right: 200, top: "50%", width: 760, height: 620, transform: "translateY(-50%)" }}>
        {TILES.map((t, i) => {
          const delay = 14 + i * 7;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 110 } });
          const y = interpolate(sp, [0, 1], [-220, t.y]);
          const op = interpolate(sp, [0, 1], [0, 1]);
          const rot = interpolate(sp, [0, 1], [-6, (i % 2 === 0 ? -1 : 1) * 1.5]);
          const float = Math.sin((frame - delay) / 22 + i) * 4;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 380 + t.x,
                top: 280 + y + float,
                width: t.w,
                height: t.h,
                opacity: op,
                transform: `rotate(${rot}deg)`,
                boxShadow: "0 24px 60px -20px rgba(26,26,26,0.45), 0 6px 16px -8px rgba(26,26,26,0.3)",
                background: COLORS.cream,
                padding: 8,
                border: `1px solid ${COLORS.charcoal}22`,
                overflow: "hidden",
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

      <div
        style={{
          position: "absolute",
          left: 160,
          top: "50%",
          transform: `translateY(calc(-50% + ${headlineY}px))`,
          opacity: headlineIn,
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
        <div style={{ marginTop: 36, color: COLORS.charcoal, opacity: 0.7, fontFamily: BODY, fontSize: 16, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 300 }}>
          Up to eight pieces of inspiration
        </div>
      </div>
    </AbsoluteFill>
  );
};

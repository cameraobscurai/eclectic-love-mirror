import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 01 — DROP. A column of inspiration thumbnails cascades into a frame.
// Soft warm tones meant to evoke pinned mood images without using real photos.
const TILES = [
  { c: ["#8a6a44", "#c89c6a"], x: -260, y: -180, w: 220, h: 280 },
  { c: ["#3a342c", "#7a6a55"], x: 20, y: -220, w: 280, h: 200 },
  { c: ["#e8e1d6", "#b8ad9f"], x: 320, y: -160, w: 220, h: 240 },
  { c: ["#6e3a2b", "#a36a4a"], x: -240, y: 140, w: 240, h: 200 },
  { c: ["#1a1a1a", "#3a342c"], x: 60, y: 60, w: 220, h: 320 },
  { c: ["#d4cdc4", "#e8e1d6"], x: 320, y: 120, w: 220, h: 220 },
];

export const SceneDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineIn = spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineIn, [0, 1], [40, 0]);

  return (
    <AbsoluteFill>
      <Chrome step={1} label="Drop Inspiration" />

      {/* Right side: cascading tile collage */}
      <div
        style={{
          position: "absolute",
          right: 200,
          top: "50%",
          width: 760,
          height: 620,
          transform: "translateY(-50%)",
        }}
      >
        {TILES.map((t, i) => {
          const delay = 14 + i * 7;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 110 } });
          const y = interpolate(sp, [0, 1], [-220, t.y]);
          const op = interpolate(sp, [0, 1], [0, 1]);
          const rot = interpolate(sp, [0, 1], [-6, (i % 2 === 0 ? -1 : 1) * 1.5]);
          // gentle float once landed
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
                background: `linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})`,
                boxShadow: "0 24px 60px -20px rgba(26,26,26,0.35), 0 6px 16px -8px rgba(26,26,26,0.25)",
                border: `1px solid ${COLORS.charcoal}22`,
              }}
            />
          );
        })}
      </div>

      {/* Left side: editorial headline */}
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
        <div
          style={{
            color: COLORS.charcoal,
            opacity: 0.55,
            fontFamily: BODY,
            fontSize: 12,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          Step One
        </div>
        <div
          style={{
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 132,
            lineHeight: 0.95,
            fontWeight: 300,
            letterSpacing: "-0.01em",
          }}
        >
          Drop the
          <br />
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>images</em> that
          <br />
          move you.
        </div>
        <div
          style={{
            marginTop: 36,
            color: COLORS.charcoal,
            opacity: 0.7,
            fontFamily: BODY,
            fontSize: 16,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 300,
          }}
        >
          Up to eight pieces of inspiration
        </div>
      </div>
    </AbsoluteFill>
  );
};

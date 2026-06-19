import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 02 — PIN. The eight curated catalog pieces fill a 4×2 grid; each
// lights up with a check chip as the client "pins" it. Mirrors the real
// CollectionPicker behavior on /stylebrief.

// One tile per real product, no repeats.
const GRID = PRODUCTS;

// All eight get pinned, staggered in selection order.
const PINS = GRID.map((_, i) => i);

export const ScenePin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headIn = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });

  return (
    <AbsoluteFill>
      <Chrome step={2} label="Pin the Pieces" />

      <div
        style={{
          position: "absolute",
          top: 180,
          left: 160,
          opacity: headIn,
          transform: `translateY(${interpolate(headIn, [0, 1], [24, 0])}px)`,
        }}
      >
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 18 }}>
          Step Two
        </div>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 96, lineHeight: 0.95, fontWeight: 300, letterSpacing: "-0.01em" }}>
          Pin the pieces you <em style={{ fontStyle: "italic", fontWeight: 400 }}>want</em>.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          bottom: 130,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(2, 260px)",
          gap: 18,
        }}
      >
        {GRID.map((t, i) => {
          const delay = 12 + i * 3;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [30, 0]);
          const pinIdx = PINS.indexOf(i);
          const pinned = pinIdx >= 0;
          const pinAt = 80 + pinIdx * 12;
          const pinSp = pinned ? spring({ frame: frame - pinAt, fps, config: { damping: 14, stiffness: 160 } }) : 0;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                background: COLORS.cream,
                opacity: op,
                transform: `translateY(${y}px)`,
                border: `1px solid ${pinned && pinSp > 0.4 ? COLORS.charcoal : COLORS.charcoal + "22"}`,
                boxShadow: pinned
                  ? `0 0 0 ${pinSp * 2}px ${COLORS.charcoal}, 0 16px 40px -16px rgba(26,26,26,${0.3 + pinSp * 0.2})`
                  : "0 12px 30px -16px rgba(26,26,26,0.2)",
                overflow: "hidden",
              }}
            >
              <Img
                src={staticFile(t.src)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: 14,
                  background: COLORS.cream,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 10,
                  right: 10,
                  fontFamily: BODY,
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.charcoal,
                  opacity: 0.7,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.title}
              </div>
              {pinned && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    background: COLORS.charcoal,
                    color: COLORS.cream,
                    display: "grid",
                    placeItems: "center",
                    opacity: pinSp,
                    transform: `scale(${interpolate(pinSp, [0, 1], [0.2, 1])})`,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5 L5 9 L9.5 3.5" stroke={COLORS.cream} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          top: 220,
          right: 160,
          textAlign: "right",
          color: COLORS.charcoal,
          opacity: 0.85,
          fontFamily: DISPLAY,
          fontWeight: 300,
        }}
      >
        <div style={{ fontSize: 96, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {Math.min(PINS.length, Math.max(0, Math.floor((frame - 80) / 12) + 1)).toString().padStart(2, "0")}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.34em", textTransform: "uppercase", marginTop: 4, opacity: 0.6 }}>
          Pinned
        </div>
      </div>
    </AbsoluteFill>
  );
};

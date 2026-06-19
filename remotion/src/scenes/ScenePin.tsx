import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 02 — PIN. Vertical 1080×1920. Headline + counter top.
// 2×4 product grid below with a slow upward pan (camera scrolls through the
// pinboard). Pin checkmarks snap with bounce. Hard cut to amber at end.

const COLS = 2;
const CARD_W = 440;
const CARD_H = 380;
const GAP = 28;

const WAVE_DELAYS = [12, 12, 30, 30, 48, 48, 66, 66];
const HERO_INDEX = 0;
const PINNED_AT = WAVE_DELAYS;

const SCENE_LEN = 170;
const OUTRO_START = SCENE_LEN - 1;

export const ScenePin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pinned =
    frame < 12 ? 0 :
    frame < 30 ? 2 :
    frame < 48 ? 4 :
    frame < 66 ? 6 :
    8;

  // counter scale pulse on tick
  const lastTick = pinned === 0 ? -1 : pinned === 2 ? 12 : pinned === 4 ? 30 : pinned === 6 ? 48 : 66;
  const counterPulse = spring({ frame: frame - lastTick, fps, config: { damping: 10, stiffness: 240 } });
  const counterScale = interpolate(counterPulse, [0, 0.5, 1], [0.85, 1.12, 1]);

  const headlineSp = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineSp, [0, 1], [28, 0]);

  // Camera pans grid upward across scene (parallax — 90px total)
  const panY = interpolate(frame, [0, SCENE_LEN], [60, -30]);

  const bridge = frame >= OUTRO_START ? 1 : 0;

  const gridLeft = (1080 - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
  const gridTop = 520;

  return (
    <AbsoluteFill>
      <Chrome step={2} label="Pin the Pieces" />

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: 220,
          opacity: headlineSp,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 13, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 22 }}>
          Step Two · 02 / 05
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
          <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 80, lineHeight: 1.0, fontWeight: 300, letterSpacing: "-0.005em", flex: 1 }}>
            Pin the pieces<br />you <em style={{ fontStyle: "italic", fontWeight: 400 }}>want</em>.
          </div>
          <div style={{ textAlign: "right", transform: `scale(${counterScale})`, transformOrigin: "100% 0" }}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 96, lineHeight: 1, fontWeight: 300, letterSpacing: "0.02em" }}>
              {String(pinned).padStart(2, "0")}
            </div>
            <div style={{ marginTop: 8, color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
              Pinned
            </div>
          </div>
        </div>
      </div>

      {/* Grid with vertical pan */}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${panY}px)` }}>
        {PRODUCTS.map((p, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const isHero = i === HERO_INDEX;

          const sp = spring({ frame: frame - WAVE_DELAYS[i], fps, config: { damping: 18, stiffness: 180 } });
          const dropY = interpolate(sp, [0, 1], [-20, 0]);
          const op = interpolate(sp, [0, 1], [0, 1]);

          const pinSp = spring({ frame: frame - (PINNED_AT[i] + 18), fps, config: { damping: 10, stiffness: 260 } });
          const pinScale = interpolate(pinSp, [0, 0.5, 1], [0, 1.25, 1]);
          const pinOp = interpolate(pinSp, [0, 0.3, 1], [0, 1, 1]);

          const left = gridLeft + col * (CARD_W + GAP);
          const top = gridTop + row * (CARD_H + GAP);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left,
                top: top + dropY,
                width: CARD_W,
                height: CARD_H,
                opacity: op,
                background: COLORS.cream,
                boxShadow: isHero
                  ? "0 28px 70px -22px rgba(26,26,26,0.35), 0 8px 18px -8px rgba(26,26,26,0.2)"
                  : "0 16px 44px -18px rgba(26,26,26,0.22), 0 4px 10px -6px rgba(26,26,26,0.12)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Img
                  src={staticFile(p.src)}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 4, right: 4,
                    width: 32, height: 32,
                    background: COLORS.charcoal,
                    color: COLORS.cream,
                    fontFamily: BODY,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pinOp,
                    transform: `scale(${pinScale})`,
                  }}
                >
                  ✓
                </div>
              </div>
              <div style={{ marginTop: 14, color: COLORS.charcoal, opacity: 0.8, fontFamily: BODY, fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase" }}>
                {p.title}
              </div>
            </div>
          );
        })}
      </div>

      {bridge ? <div style={{ position: "absolute", inset: 0, background: "#A46539" }} /> : null}
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 02 — PIN. 8 products in 4×2 grid, revealed in 3 waves (2→3→3).
// Hero pin (index 0) lands first and renders slightly larger.
// Pin counter ticks 0 → 2 → 5 → 8. Hold 60f. Outro: last frame hard-cuts to
// the dominant warm color (color bridge into ScenePalette).

const COLS = 4;
const ROWS = 2;
const CARD_W = 320;
const CARD_H = 260;
const GAP = 28;

// Reveal waves (frame each card starts animating in)
const WAVE_DELAYS = [12, 12, 30, 30, 30, 48, 48, 48];
const HERO_INDEX = 0;
const PINNED_AT = [12, 12, 30, 30, 30, 48, 48, 48];

const SCENE_LEN = 170;
const OUTRO_START = SCENE_LEN - 1; // 1f match-cut bridge at the very end

export const ScenePin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Wave sequence: count of pinned-so-far drives the top-right counter
  const pinned =
    frame < 12 ? 0 :
    frame < 30 ? 2 :
    frame < 48 ? 5 :
    8;

  const headlineSp = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineSp, [0, 1], [28, 0]);

  // 1-frame color bridge to palette amber
  const bridge = frame >= OUTRO_START ? 1 : 0;

  const gridLeft = (1920 - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
  const gridTop = 480;

  return (
    <AbsoluteFill>
      <Chrome step={2} label="Pin the Pieces" />

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 220,
          opacity: headlineSp,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 22 }}>
          Step Two
        </div>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 92, lineHeight: 1.0, fontWeight: 300, letterSpacing: "-0.005em" }}>
          Pin the pieces you <em style={{ fontStyle: "italic", fontWeight: 400 }}>want</em>.
        </div>
      </div>

      {/* Pinned counter top-right */}
      <div style={{ position: "absolute", right: 200, top: 240, textAlign: "right" }}>
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 88, lineHeight: 1, fontWeight: 300, letterSpacing: "0.04em" }}>
          {String(pinned).padStart(2, "0")}
        </div>
        <div style={{ marginTop: 14, color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
          Pinned
        </div>
      </div>

      {/* Product grid */}
      {PRODUCTS.map((p, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const isHero = i === HERO_INDEX;
        const heroBump = isHero ? 1.06 : 1.0;

        const sp = spring({ frame: frame - WAVE_DELAYS[i], fps, config: { damping: 18, stiffness: 180 } });
        const dropY = interpolate(sp, [0, 1], [-14, 0]);
        const op = interpolate(sp, [0, 1], [0, 1]);

        // pin tick appears AFTER card lands (delay + 18f)
        const pinSp = spring({ frame: frame - (PINNED_AT[i] + 18), fps, config: { damping: 14, stiffness: 220 } });
        const pinOp = interpolate(pinSp, [0, 1], [0, 1]);

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
              transform: `scale(${heroBump})`,
              transformOrigin: "center center",
              background: COLORS.cream,
              boxShadow: isHero
                ? "0 24px 64px -20px rgba(26,26,26,0.35), 0 6px 14px -6px rgba(26,26,26,0.18)"
                : "0 14px 40px -16px rgba(26,26,26,0.22), 0 4px 10px -6px rgba(26,26,26,0.12)",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <Img
                src={staticFile(p.src)}
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
              {/* pin checkmark */}
              <div
                style={{
                  position: "absolute",
                  top: 4, right: 4,
                  width: 22, height: 22,
                  background: COLORS.charcoal,
                  color: COLORS.cream,
                  fontFamily: BODY,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pinOp,
                }}
              >
                ✓
              </div>
            </div>
            <div style={{ marginTop: 12, color: COLORS.charcoal, opacity: 0.75, fontFamily: BODY, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase" }}>
              {p.title}
            </div>
          </div>
        );
      })}

      {/* 1-frame color bridge — fills the screen with amber, leads into palette */}
      {bridge ? (
        <div style={{ position: "absolute", inset: 0, background: "#A46539" }} />
      ) : null}
    </AbsoluteFill>
  );
};

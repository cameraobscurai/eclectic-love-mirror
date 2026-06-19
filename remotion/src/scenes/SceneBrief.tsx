import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS, REAL_PALETTE, PAPER_TEXTURE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 04 — THE BRIEF. Vertical 1080×1920.
// A printed brief auto-composes section by section, each section flying in
// from below. Slow scale push (1.0 → 1.02) for life. Bottom-aligned so the
// pinned proof-sheet never gets cut off.

const SCENE_LEN = 258;
const DOC_IN = 26;
const OUTRO_START = SCENE_LEN - 30;

// Section reveal beats
const T_TITLE = 28;
const T_META = 60;
const T_PALETTE = 100;
const T_PINNED = 144;
const T_SIGN = 200;

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const docSp = spring({ frame: frame - 2, fps, config: { damping: 22, stiffness: 90 } });
  const docY = interpolate(docSp, [0, 1], [60, 0]);
  const docOp = interpolate(docSp, [0, 1], [0, 1]);

  const docZoom = interpolate(frame, [0, SCENE_LEN], [1.0, 1.025]);
  const outroT = interpolate(frame, [OUTRO_START, SCENE_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroScale = interpolate(outroT, [0, 1], [1, 0.94]);
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Chrome step={4} label="Your Brief" />

      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          top: 188,
          bottom: 140,
          transform: `translateY(${docY}px) scale(${docZoom * outroScale})`,
          transformOrigin: "50% 0%",
          opacity: docOp * outroOp,
          background: "#FBF7EE",
          boxShadow: "0 50px 110px -34px rgba(26,26,26,0.45), 0 14px 32px -14px rgba(26,26,26,0.22)",
          padding: "48px 48px 40px",
          overflow: "hidden",
        }}
      >
        {/* Paper grain */}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${staticFile(PAPER_TEXTURE)})`,
            backgroundSize: "cover",
            opacity: 0.16,
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />

        {/* Header rail */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            Style Brief · No. 0042
          </div>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            By Eclectic Hive
          </div>
        </div>

        <Reveal frame={frame} at={T_TITLE} fps={fps}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 84, lineHeight: 0.95, fontWeight: 300, letterSpacing: "-0.01em" }}>
              The <em style={{ fontStyle: "italic", fontWeight: 400 }}>Ridgeline</em><br />Dinner.
            </div>
          </div>
        </Reveal>

        <Reveal frame={frame} at={T_META} fps={fps}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", rowGap: 16, columnGap: 28, marginBottom: 36 }}>
            <Label>Client</Label><Value>Hayes / Ridgeline Estate</Value>
            <Label>Occasion</Label><Value italic>Late-Summer Welcome Dinner</Value>
            <Label>Guests</Label><Value>64</Value>
            <Label>Mood</Label><Value italic>Sand-washed, candle-warmed,<br />low and long.</Value>
          </div>
        </Reveal>

        <Reveal frame={frame} at={T_PALETTE} fps={fps}>
          <div style={{ height: 1, background: `${COLORS.charcoal}40`, marginBottom: 22 }} />
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 14 }}>
            Palette
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0, marginBottom: 36 }}>
            {REAL_PALETTE.map((sw, i) => (
              <div key={i} style={{ height: 56, background: sw.hex }} />
            ))}
          </div>
        </Reveal>

        <Reveal frame={frame} at={T_PINNED} fps={fps}>
          <div style={{ height: 1, background: `${COLORS.charcoal}40`, marginBottom: 22 }} />
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 14 }}>
            Pinned Pieces · 08
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
            {PRODUCTS.map((p, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  background: COLORS.cream,
                  border: `1px solid ${COLORS.charcoal}1a`,
                  padding: 6,
                  overflow: "hidden",
                }}
              >
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </div>
            ))}
          </div>
        </Reveal>

        {/* signature */}
        <Reveal frame={frame} at={T_SIGN} fps={fps}>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 28, fontWeight: 400 }}>
              — The Hive
            </div>
            <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase" }}>
              Sept · 26 · 2026
            </div>
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

const Reveal: React.FC<{ frame: number; at: number; fps: number; children: React.ReactNode }> = ({ frame, at, fps, children }) => {
  const sp = spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 120 } });
  const op = interpolate(sp, [0, 1], [0, 1]);
  const y = interpolate(sp, [0, 1], [22, 0]);
  return <div style={{ opacity: op, transform: `translateY(${y}px)` }}>{children}</div>;
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", paddingTop: 6 }}>
    {children}
  </div>
);

const Value: React.FC<{ children: React.ReactNode; italic?: boolean }> = ({ children, italic }) => (
  <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: italic ? 26 : 28, fontWeight: 400, fontStyle: italic ? "italic" : "normal", lineHeight: 1.15 }}>
    {children}
  </div>
);

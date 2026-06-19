import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS, REAL_PALETTE, PAPER_TEXTURE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 04 — THE BRIEF. Vertical 1080×1920. A printed document fills the
// frame. Camera slowly scrolls down the page (translateY pan) — like a hand
// running over a real brief. Outro: scale down + fade.

const SCENE_LEN = 170;
const ENTER_END = 40;
const OUTRO_START = SCENE_LEN - 24;

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;

  const t = interpolate(frame, [0, ENTER_END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardOp = interpolate(t, [0, 0.4, 1], [0, 0.6, 1]);
  const cardEnterY = interpolate(t, [0, 1], [40, 0]);

  // slow scroll down the page across the scene
  const scrollY = interpolate(frame, [ENTER_END, SCENE_LEN], [0, -120]);

  const outroT = interpolate(frame, [OUTRO_START, SCENE_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroScale = interpolate(outroT, [0, 1], [1, 0.96]);
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);

  const titleOp = interpolate(frame, [18, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const metaOp = interpolate(frame, [32, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paletteOp = interpolate(frame, [48, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stripOp = interpolate(frame, [64, 86], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.paper, overflow: "hidden" }}>
      <Chrome step={4} label="Your Brief" />

      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 200,
          minHeight: 1680,
          transform: `translateY(${cardEnterY + scrollY}px) scale(${outroScale})`,
          transformOrigin: "50% 30%",
          opacity: cardOp * outroOp,
          background: "#FBF7EE",
          boxShadow: "0 50px 110px -34px rgba(26,26,26,0.4), 0 14px 32px -14px rgba(26,26,26,0.2)",
          padding: "60px 56px",
        }}
      >
        {/* Paper grain */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${staticFile(PAPER_TEXTURE)})`,
            backgroundSize: "cover",
            opacity: 0.18,
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />

        {/* Header rail */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 60 }}>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            Style Brief · No. 0042
          </div>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            By Eclectic Hive
          </div>
        </div>

        {/* Title */}
        <div style={{ opacity: titleOp, marginBottom: 56 }}>
          <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 96, lineHeight: 0.95, fontWeight: 300, letterSpacing: "-0.01em" }}>
            The <em style={{ fontStyle: "italic", fontWeight: 400 }}>Ridgeline</em><br />Dinner.
          </div>
        </div>

        {/* Meta */}
        <div style={{ opacity: metaOp, display: "grid", gridTemplateColumns: "200px 1fr", rowGap: 22, columnGap: 32, marginBottom: 56 }}>
          <Label>Client</Label>
          <Value>Hayes / Ridgeline Estate</Value>
          <Label>Occasion</Label>
          <Value italic>Late-Summer Welcome Dinner</Value>
          <Label>Guests</Label>
          <Value>64</Value>
          <Label>Scope</Label>
          <Value>Full-service design + production</Value>
          <Label>Mood</Label>
          <Value italic>Sand-washed, candle-warmed,<br />low and long</Value>
        </div>

        <div style={{ height: 1, background: `${COLORS.charcoal}40`, marginBottom: 40, opacity: paletteOp }} />

        {/* Palette */}
        <div style={{ opacity: paletteOp, marginBottom: 56 }}>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 18 }}>
            Palette
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
            {REAL_PALETTE.map((sw, i) => (
              <div key={i} style={{ height: 80, background: sw.hex }} />
            ))}
          </div>
        </div>

        {/* Pinned proof-sheet */}
        <div style={{ opacity: stripOp }}>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 18 }}>
            Pinned Pieces
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {PRODUCTS.map((p, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  background: COLORS.cream,
                  border: `1px solid ${COLORS.charcoal}1a`,
                  padding: 8,
                  overflow: "hidden",
                }}
              >
                <Img
                  src={staticFile(p.src)}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", paddingTop: 8 }}>
    {children}
  </div>
);

const Value: React.FC<{ children: React.ReactNode; italic?: boolean }> = ({ children, italic }) => (
  <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: italic ? 30 : 32, fontWeight: 400, fontStyle: italic ? "italic" : "normal", lineHeight: 1.15 }}>
    {children}
  </div>
);

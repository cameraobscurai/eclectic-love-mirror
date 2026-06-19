import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS, REAL_PALETTE, PAPER_TEXTURE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 04 — THE BRIEF. A printed document drifts up onto cream. Paper grain
// overlay on card. Broken hierarchy (display caps name, italic occasion at
// 11pt, palette column offset). Pinned pieces render as proof-sheet strip.
// Hold 90f. Outro: scale 1→0.97 + fade.

const SCENE_LEN = 170;
const ENTER_END = 40;
const OUTRO_START = SCENE_LEN - 24;

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;

  const t = interpolate(frame, [0, ENTER_END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardY = interpolate(t, [0, 1], [16, 0]);
  const cardOp = interpolate(t, [0, 0.4, 1], [0, 0.6, 1]);

  const outroT = interpolate(frame, [OUTRO_START, SCENE_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroScale = interpolate(outroT, [0, 1], [1, 0.97]);
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);

  // Reveal sub-blocks
  const titleOp = interpolate(frame, [18, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const metaOp = interpolate(frame, [32, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paletteOp = interpolate(frame, [48, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stripOp = interpolate(frame, [62, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <Chrome step={4} label="Your Brief" />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1280,
          minHeight: 800,
          transform: `translate(-50%, calc(-50% + ${cardY}px)) scale(${outroScale})`,
          transformOrigin: "center center",
          opacity: cardOp * outroOp,
          background: "#FBF7EE",
          boxShadow: "0 40px 100px -30px rgba(26,26,26,0.35), 0 12px 30px -12px rgba(26,26,26,0.18)",
          padding: "72px 88px",
        }}
      >
        {/* Paper grain overlay */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 84 }}>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            Style Brief · No. 0042
          </div>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            Prepared by Eclectic Hive
          </div>
        </div>

        {/* Title (display caps tracked wide) */}
        <div style={{ opacity: titleOp, marginBottom: 56 }}>
          <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 96, lineHeight: 1.0, fontWeight: 300, letterSpacing: "-0.005em" }}>
            The <em style={{ fontStyle: "italic", fontWeight: 400 }}>Ridgeline</em> Dinner.
          </div>
        </div>

        {/* Meta rows — labels left-rail, values offset right */}
        <div style={{ opacity: metaOp, display: "grid", gridTemplateColumns: "180px 1fr", rowGap: 18, columnGap: 40, marginBottom: 48 }}>
          <Label>Client</Label>
          <Value>Hayes / Ridgeline Estate</Value>
          <Label>Occasion</Label>
          <Value italic>Late-Summer Welcome Dinner</Value>
          <Label>Guests</Label>
          <Value>64</Value>
          <Label>Scope</Label>
          <Value>Full-service design + production</Value>
          <Label>Mood</Label>
          <Value italic>Sand-washed, candle-warmed, low and long</Value>
        </div>

        {/* Single rule line */}
        <div style={{ height: 1, background: `${COLORS.charcoal}40`, marginBottom: 36, opacity: paletteOp }} />

        {/* Palette row — offset slightly right of meta values */}
        <div style={{ opacity: paletteOp, marginBottom: 44, paddingLeft: 40 }}>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 16 }}>
            Palette
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {REAL_PALETTE.map((sw, i) => (
              <div key={i} style={{ width: 110, height: 44, background: sw.hex }} />
            ))}
          </div>
        </div>

        {/* Pinned pieces — proof-sheet strip */}
        <div style={{ opacity: stripOp, paddingLeft: 40 }}>
          <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 16 }}>
            Pinned Pieces
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {PRODUCTS.map((p, i) => (
              <div
                key={i}
                style={{
                  width: 96,
                  height: 96,
                  background: COLORS.cream,
                  border: `1px solid ${COLORS.charcoal}1a`,
                  padding: 6,
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
  <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", paddingTop: 6 }}>
    {children}
  </div>
);

const Value: React.FC<{ children: React.ReactNode; italic?: boolean }> = ({ children, italic }) => (
  <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: italic ? 26 : 28, fontWeight: 400, fontStyle: italic ? "italic" : "normal", lineHeight: 1.2 }}>
    {children}
  </div>
);

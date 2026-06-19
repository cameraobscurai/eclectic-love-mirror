import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS, REAL_PALETTE, PAPER_TEXTURE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard } from "../components/IndexCard";

// SCENE 04 — BRIEF. The card content area becomes the brief itself, composing
// section by section: title, meta, palette strip, pinned proof-sheet, signature.

const SCENE_LEN = 258;
const T_TITLE = 18;
const T_META = 56;
const T_PALETTE = 100;
const T_PINNED = 142;
const T_SIGN = 196;

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <IndexCard step={4} label="Brief" subtitle="Composed for you." sceneLen={SCENE_LEN}>
        {/* paper grain over content */}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${staticFile(PAPER_TEXTURE)})`,
            backgroundSize: "cover",
            opacity: 0.14,
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />

        {/* doc number top right */}
        <div
          style={{
            position: "absolute", top: 30, right: 32,
            color: COLORS.charcoal, opacity: 0.5,
            fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase",
          }}
        >
          Brief · No. 0042
        </div>

        <div style={{ position: "absolute", left: 40, right: 40, top: 28 }}>
          <Reveal frame={frame} at={T_TITLE} fps={fps}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 76, lineHeight: 0.95, fontWeight: 300, letterSpacing: "-0.01em", marginBottom: 32 }}>
              The <em style={{ fontStyle: "italic", fontWeight: 400 }}>Ridgeline</em><br />Dinner.
            </div>
          </Reveal>

          <Reveal frame={frame} at={T_META} fps={fps}>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", rowGap: 14, columnGap: 24, marginBottom: 32 }}>
              <Label>Client</Label><Value>Hayes / Ridgeline Estate</Value>
              <Label>Occasion</Label><Value italic>Late-Summer Welcome Dinner</Value>
              <Label>Guests</Label><Value>64</Value>
              <Label>Mood</Label><Value italic>Sand-washed, candle-warmed,<br />low and long.</Value>
            </div>
          </Reveal>

          <Reveal frame={frame} at={T_PALETTE} fps={fps}>
            <div style={{ height: 1, background: `${COLORS.charcoal}40`, marginBottom: 18 }} />
            <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 12 }}>
              Palette
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0, marginBottom: 28 }}>
              {REAL_PALETTE.map((sw, i) => (
                <div key={i} style={{ height: 52, background: sw.hex }} />
              ))}
            </div>
          </Reveal>

          <Reveal frame={frame} at={T_PINNED} fps={fps}>
            <div style={{ height: 1, background: `${COLORS.charcoal}40`, marginBottom: 18 }} />
            <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 12 }}>
              Pinned · 08
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

          <Reveal frame={frame} at={T_SIGN} fps={fps}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 26, fontWeight: 400 }}>
                — The Hive
              </div>
              <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase" }}>
                Sept · 26 · 2026
              </div>
            </div>
          </Reveal>
        </div>
      </IndexCard>
    </AbsoluteFill>
  );
};

const Reveal: React.FC<{ frame: number; at: number; fps: number; children: React.ReactNode }> = ({ frame, at, fps, children }) => {
  const sp = spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 120 } });
  const op = interpolate(sp, [0, 1], [0, 1]);
  const y = interpolate(sp, [0, 1], [18, 0]);
  return <div style={{ opacity: op, transform: `translateY(${y}px)` }}>{children}</div>;
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase", paddingTop: 6 }}>
    {children}
  </div>
);

const Value: React.FC<{ children: React.ReactNode; italic?: boolean }> = ({ children, italic }) => (
  <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: italic ? 24 : 26, fontWeight: 400, fontStyle: italic ? "italic" : "normal", lineHeight: 1.15 }}>
    {children}
  </div>
);

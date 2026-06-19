import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS, REAL_PALETTE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard, INNER_W } from "../components/IndexCard";

// SCENE 04 — BRIEF. Mirrors the brief preview rows from the site:
// label-on-left / value-on-right grid with hairline dividers, palette strip,
// pinned proof sheet, signature. Flat white. No paper texture.

const SCENE_LEN = 258;
const T_HEADER = 8;
const T_ROWS = 36;
const T_PALETTE = 110;
const T_PINNED = 160;
const T_SIGN = 220;

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <IndexCard step={4} label="Brief" subtitle="Composed for you, ready to send." sceneLen={SCENE_LEN}>
        {/* doc number top right */}
        <Reveal frame={frame} at={T_HEADER} fps={fps}>
          <div
            style={{
              position: "absolute", left: 0, right: 0, top: 0,
              display: "flex", justifyContent: "space-between",
              color: COLORS.charcoal, opacity: 0.5,
              fontFamily: BODY, fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
            }}
          >
            <span>Style Brief · No. 0042</span>
            <span>09 · 26 · 26</span>
          </div>
        </Reveal>

        {/* hero title */}
        <Reveal frame={frame} at={T_HEADER + 8} fps={fps}>
          <div
            style={{
              position: "absolute", left: 0, top: 36,
              color: COLORS.charcoal,
              fontFamily: DISPLAY,
              fontSize: 84,
              lineHeight: 0.95,
              fontWeight: 400,
              letterSpacing: "-0.01em",
            }}
          >
            The <em style={{ fontStyle: "italic" }}>Ridgeline</em><br />Dinner.
          </div>
        </Reveal>

        {/* meta rows */}
        <Reveal frame={frame} at={T_ROWS} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 240 }}>
            {[
              ["For", "Hayes / Ridgeline Estate"],
              ["Occasion", "Late-Summer Welcome Dinner"],
              ["Guests", "64"],
              ["Mood", "Sand-washed · candle-warmed · low + long"],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "200px 1fr", padding: "16px 0", borderBottom: `1px solid ${COLORS.rule}` }}>
                <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase", paddingTop: 6 }}>
                  {label}
                </div>
                <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 26, fontStyle: i === 3 ? "italic" : "normal" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* palette row */}
        <Reveal frame={frame} at={T_PALETTE} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 540 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase" }}>
                Color Palette · 08 Tones
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0 }}>
              {REAL_PALETTE.map((sw, i) => (
                <div key={i} style={{ height: 64, background: sw.hex }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0, marginTop: 8 }}>
              {REAL_PALETTE.map((sw, i) => (
                <div key={i} style={{ textAlign: "center", color: COLORS.charcoal, opacity: 0.5, fontFamily: BODY, fontSize: 10, letterSpacing: "0.18em", fontVariantNumeric: "tabular-nums" }}>
                  {sw.hex}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* pinned row */}
        <Reveal frame={frame} at={T_PINNED} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 720 }}>
            <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase", marginBottom: 14 }}>
              Pieces You Pinned · 08
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {PRODUCTS.map((p, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1 / 1",
                    background: COLORS.cream,
                    border: `1px solid ${COLORS.rule}`,
                    padding: 10,
                  }}
                >
                  <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* signature */}
        <Reveal frame={frame} at={T_SIGN} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1180, paddingTop: 18, borderTop: `1px solid ${COLORS.rule}`, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 28 }}>
              — Yours, The Hive
            </div>
            <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase" }}>
              Ready to Send
            </div>
          </div>
        </Reveal>

        {/* hide unused */}
        <div style={{ display: "none" }}>{INNER_W}</div>
      </IndexCard>
    </AbsoluteFill>
  );
};

const Reveal: React.FC<{ frame: number; at: number; fps: number; children: React.ReactNode }> = ({ frame, at, fps, children }) => {
  const sp = spring({ frame: frame - at, fps, config: { damping: 26, stiffness: 120 } });
  const op = interpolate(sp, [0, 1], [0, 1]);
  const y = interpolate(sp, [0, 1], [14, 0]);
  return <div style={{ opacity: op, transform: `translateY(${y}px)` }}>{children}</div>;
};

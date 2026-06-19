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
      <IndexCard step={4} label="Brief" subtitle="Composed from everything you chose." sceneLen={SCENE_LEN}>
        {/* doc number top right */}
        <Reveal frame={frame} at={T_HEADER} fps={fps}>
          <div
            style={{
              position: "absolute", left: 0, right: 0, top: 0,
              display: "flex", justifyContent: "space-between",
              color: COLORS.charcoal, opacity: 0.5,
              fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase",
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
              position: "absolute", left: 0, top: 56,
              color: COLORS.charcoal,
              fontFamily: DISPLAY,
              fontSize: 84,
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.015em",
            }}
          >
            The <em style={{ fontStyle: "italic" }}>Ridgeline</em><br />Dinner.
          </div>
        </Reveal>

        {/* meta rows — tighter typography, generous row padding */}
        <Reveal frame={frame} at={T_ROWS} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 290 }}>
            {[
              ["For", "Hayes / Ridgeline Estate"],
              ["Occasion", "Late-Summer Welcome Dinner"],
              ["Guests", "64"],
              ["Mood", "Sand-washed · candle-warmed · low + long"],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "220px 1fr", padding: "22px 0", borderBottom: `1px solid ${COLORS.rule}` }}>
                <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase", paddingTop: 8 }}>
                  {label}
                </div>
                <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 28, fontStyle: i === 3 ? "italic" : "normal", lineHeight: 1.2 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* palette row */}
        <Reveal frame={frame} at={T_PALETTE} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 640 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
                Combined Palette
              </div>
              <div style={{ color: COLORS.charcoal, opacity: 0.45, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
                08 Tones
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0 }}>
              {REAL_PALETTE.map((sw, i) => (
                <div key={i} style={{ height: 72, background: sw.hex }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0, marginTop: 12 }}>
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
          <div style={{ position: "absolute", left: 0, right: 0, top: 850 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
                Pieces You Pinned
              </div>
              <div style={{ color: COLORS.charcoal, opacity: 0.45, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
                08 / 08
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {PRODUCTS.map((p, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1 / 1",
                    background: COLORS.cream,
                    border: `1px solid ${COLORS.rule}`,
                    padding: 12,
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
          <div style={{ position: "absolute", left: 0, right: 0, top: 1100, paddingTop: 24, borderTop: `1px solid ${COLORS.rule}`, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 30 }}>
              — Yours, The Hive
            </div>
            <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
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

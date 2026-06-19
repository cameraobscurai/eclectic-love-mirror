import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS, REAL_PALETTE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard, INNER_W } from "../components/IndexCard";

// SCENE 04 — BRIEF. The doc owns the page: IndexCard's serif title +
// italic subtitle are hidden so the doc's own header ("The Ridgeline Dinner.")
// is the only big serif on screen. Sections separated by hairlines that
// mirror Scene 3. Palette band shape is byte-identical to Scene 3.

const SCENE_LEN = 258;

// Layout (relative to the inner content box, which starts at STEP_TOP+70 = 320)
const META_TOP = 0;
const TITLE_TOP = 50;
const DIV_1 = 260;
const ROWS_TOP = 290;
const ROW_PAD = 14;
const ROW_VALUE_FS = 24;
const ROW_LABEL_FS = 12;
const ROW_H = 50;
const DIV_2 = ROWS_TOP + ROW_H * 4 + 14;          // 504
const PAL_LABEL_TOP = DIV_2 + 24;                   // 528
const PAL_SW_TOP = PAL_LABEL_TOP + 32;              // 560
const PAL_SW_H = 56;
const PAL_HEX_TOP = PAL_SW_TOP + PAL_SW_H + 14;     // 630
const DIV_3 = PAL_HEX_TOP + 50;                     // 680
const PIN_LABEL_TOP = DIV_3 + 24;                   // 704
const PIN_TOP = PIN_LABEL_TOP + 32;                 // 736
const PIN_THUMB_GAP = 8;
const PIN_THUMB_W = (INNER_W - 7 * PIN_THUMB_GAP) / 8;  // 110
const DIV_4 = PIN_TOP + PIN_THUMB_W + 22;
const SIGN_TOP = DIV_4 + 20;

// Timing
const T_META = 6;
const T_TITLE = T_META + 6;
const T_ROWS = 38;
const T_PALETTE = 110;
const T_PINNED = 160;
const T_SIGN = 218;

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <IndexCard step={4} label="Brief" subtitle="Composed from everything you chose." sceneLen={SCENE_LEN} hideTitle hideSubtitle>
        {/* doc meta */}
        <Reveal frame={frame} at={T_META} fps={fps}>
          <div
            style={{
              position: "absolute", left: 0, right: 0, top: META_TOP,
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
        <Reveal frame={frame} at={T_TITLE} fps={fps}>
          <div
            style={{
              position: "absolute", left: 0, top: TITLE_TOP,
              color: COLORS.charcoal,
              fontFamily: DISPLAY,
              fontSize: 88,
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.015em",
            }}
          >
            The <em style={{ fontStyle: "italic" }}>Ridgeline</em><br />Dinner.
          </div>
        </Reveal>

        {/* div 1 */}
        <Divider top={DIV_1} frame={frame} at={T_ROWS - 6} />

        {/* meta rows */}
        <Reveal frame={frame} at={T_ROWS} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: ROWS_TOP }}>
            {[
              ["For", "Hayes / Ridgeline Estate"],
              ["Occasion", "Late-Summer Welcome Dinner"],
              ["Guests", "64"],
              ["Mood", "Sand-washed · candle-warmed · low + long"],
            ].map(([label, value], i, arr) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
                  padding: `${ROW_PAD}px 0`,
                  borderBottom: i === arr.length - 1 ? "none" : `1px solid ${COLORS.rule}`,
                  height: ROW_H,
                  alignItems: "center",
                }}
              >
                <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: ROW_LABEL_FS, letterSpacing: "0.34em", textTransform: "uppercase" }}>
                  {label}
                </div>
                <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: ROW_VALUE_FS, fontStyle: i === 3 ? "italic" : "normal", lineHeight: 1.2 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* div 2 */}
        <Divider top={DIV_2} frame={frame} at={T_PALETTE - 6} />

        {/* palette band — shape matches Scene 3 */}
        <Reveal frame={frame} at={T_PALETTE} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: PAL_LABEL_TOP, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
              Combined Palette
            </span>
            <span style={{ color: COLORS.charcoal, opacity: 0.45, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
              08 Tones
            </span>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: PAL_SW_TOP, display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0 }}>
            {REAL_PALETTE.map((sw, i) => (
              <div key={i} style={{ height: PAL_SW_H, background: sw.hex }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: PAL_HEX_TOP, display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0 }}>
            {REAL_PALETTE.map((sw, i) => (
              <div key={i} style={{ textAlign: "center", color: COLORS.charcoal, opacity: 0.5, fontFamily: BODY, fontSize: 10, letterSpacing: "0.18em", fontVariantNumeric: "tabular-nums" }}>
                {sw.hex}
              </div>
            ))}
          </div>
        </Reveal>

        {/* div 3 */}
        <Divider top={DIV_3} frame={frame} at={T_PINNED - 6} />

        {/* pinned — single row of 8 */}
        <Reveal frame={frame} at={T_PINNED} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: PIN_LABEL_TOP, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
              Pieces You Pinned
            </span>
            <span style={{ color: COLORS.charcoal, opacity: 0.45, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
              08 / 08
            </span>
          </div>
          <div style={{ position: "absolute", left: 0, top: PIN_TOP, display: "flex", gap: PIN_THUMB_GAP }}>
            {PRODUCTS.map((p, i) => (
              <div
                key={i}
                style={{
                  width: PIN_THUMB_W,
                  height: PIN_THUMB_W,
                  background: COLORS.cream,
                  border: `1px solid ${COLORS.rule}`,
                  padding: 8,
                }}
              >
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </div>
            ))}
          </div>
        </Reveal>

        {/* div 4 */}
        <Divider top={DIV_4} frame={frame} at={T_SIGN - 6} />

        {/* signature */}
        <Reveal frame={frame} at={T_SIGN} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: SIGN_TOP, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 30 }}>
              — Yours, The Hive
            </div>
            <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
              Ready to Send
            </div>
          </div>
        </Reveal>
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

const Divider: React.FC<{ top: number; frame: number; at: number }> = ({ top, frame, at }) => {
  const op = interpolate(frame, [at, at + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", left: 0, right: 0, top, height: 1, background: COLORS.rule, opacity: op }} />;
};

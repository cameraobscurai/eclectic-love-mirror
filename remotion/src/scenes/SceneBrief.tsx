import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile, Easing } from "remotion";
import { COLORS, PRODUCTS, REAL_PALETTE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard, INNER_W } from "../components/IndexCard";

// SCENE 04 — BRIEF. The brief assembles itself under a slow push-out.
// Title builds word-by-word, values type in, swatches drop, pins land,
// signature handwrites. Single ease, no jitter.

const SCENE_LEN = 360; // assembly ~248f + composed hold + 42f lift outro
const T_LIFT = SCENE_LEN - 42; // 318 — brief lifts away here

// Layout
const META_TOP = 0;
const TITLE_TOP = 50;
const TITLE_H = 200;
const TITLE_RULE_TOP = TITLE_TOP + TITLE_H + 18;   // 268
const DIV_1 = TITLE_RULE_TOP + 10;                  // 278 — re-use as section break
const ROWS_TOP = DIV_1 + 22;                        // 300
const ROW_PAD = 14;
const ROW_VALUE_FS = 24;
const ROW_LABEL_FS = 12;
const ROW_H = 50;
const DIV_2 = ROWS_TOP + ROW_H * 4 + 14;            // 514
const PAL_LABEL_TOP = DIV_2 + 24;                   // 538
const PAL_SW_TOP = PAL_LABEL_TOP + 32;              // 570
const PAL_SW_H = 56;
const PAL_HEX_TOP = PAL_SW_TOP + PAL_SW_H + 14;     // 640
const DIV_3 = PAL_HEX_TOP + 50;                     // 690
const PIN_LABEL_TOP = DIV_3 + 24;                   // 714
const PIN_TOP = PIN_LABEL_TOP + 32;                 // 746
const PIN_THUMB_GAP = 8;
const PIN_THUMB_W = (INNER_W - 7 * PIN_THUMB_GAP) / 8;  // 110
const DIV_4 = PIN_TOP + PIN_THUMB_W + 22;
const SIGN_TOP = DIV_4 + 20;

// Timing
const T_META = 6;
const T_WORD1 = 14;    // "The"
const T_WORD2 = 24;    // "Ridgeline"
const T_WORD3 = 38;    // "Dinner."
const T_TITLE_RULE = 52;
const T_ROWS = 60;     // first row begins
const ROW_STAGGER = 8;
const T_PALETTE = 120;
const SW_STAGGER = 3;
const T_HEX = T_PALETTE + 28;
const T_PINNED = 162;
const PIN_STAGGER = 4;
const T_SIGN = 218;

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera: open at 1.08 biased high (read the title), drift down + zoom out to 1.0,
  // settle for last 30 frames.
  const camProgress = interpolate(
    frame,
    [0, SCENE_LEN - 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) },
  );
  const cameraScale = interpolate(camProgress, [0, 1], [1.06, 1.0]);
  const cameraY = interpolate(camProgress, [0, 1], [-22, 0]);

  // Lift outro — whole brief rises and fades while Send rises underneath
  const liftP = interpolate(frame, [T_LIFT, SCENE_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const liftY = liftP * -80;
  const liftScale = interpolate(liftP, [0, 1], [1, 0.965]);
  const liftOp = interpolate(liftP, [0, 1], [1, 0]);

  return (
    <AbsoluteFill style={{ transform: `translateY(${liftY}px) scale(${liftScale})`, transformOrigin: "50% 40%", opacity: liftOp }}>
      <IndexCard
        step={4}
        label="Brief"
        subtitle="Composed from everything you chose."
        sceneLen={SCENE_LEN}
        hideTitle hideSubtitle
        cameraScale={cameraScale}
        cameraY={cameraY}
        cameraOriginY={18}
      >
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

        {/* HERO TITLE — word by word */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: TITLE_TOP,
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 96,
            lineHeight: 0.98,
            fontWeight: 400,
            letterSpacing: "-0.015em",
            whiteSpace: "pre-wrap",
          }}
        >
          <Word frame={frame} at={T_WORD1} fps={fps}>The </Word>
          <Word frame={frame} at={T_WORD2} fps={fps} italic>Ridgeline</Word>
          {"\n"}
          <Word frame={frame} at={T_WORD3} fps={fps}>Dinner</Word>
          <Period frame={frame} at={T_WORD3 + 10} fps={fps} />
        </div>

        {/* underline draws under title */}
        <DrawLine frame={frame} at={T_TITLE_RULE} fps={fps} top={TITLE_RULE_TOP} duration={20} />

        {/* TYPEWRITER META ROWS */}
        <div style={{ position: "absolute", left: 0, right: 0, top: ROWS_TOP }}>
          {[
            ["For", "Hayes / Ridgeline Estate"],
            ["Occasion", "Late-Summer Welcome Dinner"],
            ["Guests", "64"],
            ["Mood", "Sand-washed · candle-warmed · low + long"],
          ].map(([label, value], i, arr) => {
            const rowAt = T_ROWS + i * ROW_STAGGER;
            const labelOp = interpolate(frame, [rowAt, rowAt + 10], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const typeProgress = interpolate(frame, [rowAt + 4, rowAt + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
            const ruleOp = interpolate(frame, [rowAt + 16, rowAt + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
                  padding: `${ROW_PAD}px 0`,
                  borderBottom: i === arr.length - 1 ? "none" : `1px solid ${COLORS.rule}`,
                  borderBottomColor: i === arr.length - 1 ? "transparent" : `rgba(26,26,26,${0.10 * ruleOp})`,
                  height: ROW_H,
                  alignItems: "center",
                }}
              >
                <div style={{ color: COLORS.charcoal, opacity: labelOp / 0.55 * 0.55, fontFamily: BODY, fontSize: ROW_LABEL_FS, letterSpacing: "0.34em", textTransform: "uppercase" }}>
                  {label}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      color: COLORS.charcoal,
                      fontFamily: DISPLAY,
                      fontSize: ROW_VALUE_FS,
                      fontStyle: i === 3 ? "italic" : "normal",
                      lineHeight: 1.2,
                      clipPath: `inset(0 ${(1 - typeProgress) * 100}% 0 0)`,
                    }}
                  >
                    {value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DrawLine frame={frame} at={T_PALETTE - 8} fps={fps} top={DIV_2} duration={14} />

        {/* PALETTE BAND — staggered drop */}
        <Reveal frame={frame} at={T_PALETTE} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: PAL_LABEL_TOP, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
              Combined Palette
            </span>
            <span style={{ color: COLORS.charcoal, opacity: 0.45, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase", fontVariantNumeric: "tabular-nums" }}>
              <Ticker frame={frame} startAt={T_PALETTE} stepFrames={SW_STAGGER} max={REAL_PALETTE.length} pad2 /> Tones
            </span>
          </div>
        </Reveal>
        <div style={{ position: "absolute", left: 0, right: 0, top: PAL_SW_TOP, display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0 }}>
          {REAL_PALETTE.map((sw, i) => {
            const at = T_PALETTE + i * SW_STAGGER;
            const sp = spring({ frame: frame - at, fps, config: { damping: 20, stiffness: 200 } });
            const op = interpolate(sp, [0, 1], [0, 1]);
            const sY = interpolate(sp, [0, 1], [0.7, 1]);
            return (
              <div key={i} style={{ height: PAL_SW_H, background: sw.hex, opacity: op, transform: `scaleY(${sY})`, transformOrigin: "50% 0%" }} />
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: PAL_HEX_TOP, display: "grid", gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`, gap: 0 }}>
          {REAL_PALETTE.map((sw, i) => {
            const at = T_HEX + i * 2;
            const op = interpolate(frame, [at, at + 10], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ textAlign: "center", color: COLORS.charcoal, opacity: op, fontFamily: BODY, fontSize: 10, letterSpacing: "0.18em", fontVariantNumeric: "tabular-nums" }}>
                {sw.hex}
              </div>
            );
          })}
        </div>

        <DrawLine frame={frame} at={T_PINNED - 8} fps={fps} top={DIV_3} duration={14} />

        {/* PINNED — pin-drop */}
        <Reveal frame={frame} at={T_PINNED} fps={fps}>
          <div style={{ position: "absolute", left: 0, right: 0, top: PIN_LABEL_TOP, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
              Pieces You Pinned
            </span>
            <span style={{ color: COLORS.charcoal, opacity: 0.45, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase", fontVariantNumeric: "tabular-nums" }}>
              <Ticker frame={frame} startAt={T_PINNED} stepFrames={PIN_STAGGER} max={PRODUCTS.length} pad2 /> / 08
            </span>
          </div>
        </Reveal>
        <div style={{ position: "absolute", left: 0, top: PIN_TOP, display: "flex", gap: PIN_THUMB_GAP }}>
          {PRODUCTS.map((p, i) => {
            const at = T_PINNED + i * PIN_STAGGER;
            const sp = spring({ frame: frame - at, fps, config: { damping: 18, stiffness: 180 } });
            const op = interpolate(sp, [0, 1], [0, 1]);
            const scl = interpolate(sp, [0, 1], [0.92, 1]);
            // pin tick: border flashes charcoal then fades to rule
            const flash = interpolate(frame, [at, at + 4, at + 16], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const borderColor = `rgba(26,26,26,${0.10 + flash * 0.7})`;
            return (
              <div
                key={i}
                style={{
                  width: PIN_THUMB_W,
                  height: PIN_THUMB_W,
                  background: COLORS.cream,
                  border: `1px solid ${borderColor}`,
                  padding: 8,
                  opacity: op,
                  transform: `scale(${scl})`,
                }}
              >
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </div>
            );
          })}
        </div>

        <DrawLine frame={frame} at={T_SIGN - 8} fps={fps} top={DIV_4} duration={14} />

        {/* SIGNATURE — handwrite */}
        {(() => {
          const sigProgress = interpolate(frame, [T_SIGN, T_SIGN + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
          const pillBase = interpolate(frame, [T_SIGN + 20, T_SIGN + 30], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const pillPulse = interpolate(frame, [SCENE_LEN - 40, SCENE_LEN - 30, SCENE_LEN - 20], [0, 1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const pillOp = Math.max(pillBase, pillPulse);
          return (
            <div style={{ position: "absolute", left: 0, right: 0, top: SIGN_TOP, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ overflow: "hidden" }}>
                <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 34, clipPath: `inset(0 ${(1 - sigProgress) * 100}% 0 0)` }}>
                  — Yours, The Hive
                </div>
              </div>
              <div style={{ color: COLORS.charcoal, opacity: pillOp, fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase" }}>
                Ready to Send
              </div>
            </div>
          );
        })()}
      </IndexCard>
    </AbsoluteFill>
  );
};

// ——— helpers ———

const Reveal: React.FC<{ frame: number; at: number; fps: number; children: React.ReactNode }> = ({ frame, at, fps, children }) => {
  const sp = spring({ frame: frame - at, fps, config: { damping: 26, stiffness: 120 } });
  const op = interpolate(sp, [0, 1], [0, 1]);
  const y = interpolate(sp, [0, 1], [14, 0]);
  return <div style={{ opacity: op, transform: `translateY(${y}px)` }}>{children}</div>;
};

const Word: React.FC<{ frame: number; at: number; fps: number; italic?: boolean; children: React.ReactNode }> = ({ frame, at, fps, italic, children }) => {
  const sp = spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 140 } });
  const op = interpolate(sp, [0, 1], [0, 1]);
  const y = interpolate(sp, [0, 1], [18, 0]);
  const sc = interpolate(sp, [0, 1], [1.03, 1]);
  return (
    <span style={{ display: "inline-block", opacity: op, transform: `translateY(${y}px) scale(${sc})`, fontStyle: italic ? "italic" : "normal" }}>
      {children}
    </span>
  );
};

const Period: React.FC<{ frame: number; at: number; fps: number }> = ({ frame, at, fps }) => {
  const sp = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 220 } });
  const op = interpolate(sp, [0, 1], [0, 1]);
  const sc = interpolate(sp, [0, 0.6, 1], [0.4, 1.2, 1]);
  return (
    <span style={{ display: "inline-block", opacity: op, transform: `scale(${sc})`, transformOrigin: "50% 100%" }}>.</span>
  );
};

const DrawLine: React.FC<{ frame: number; at: number; fps: number; top: number; duration: number }> = ({ frame, at, top, duration }) => {
  const p = interpolate(frame, [at, at + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  return (
    <div
      style={{
        position: "absolute", left: 0, top, height: 1,
        width: `${p * 100}%`,
        background: COLORS.rule,
      }}
    />
  );
};

const Ticker: React.FC<{ frame: number; startAt: number; stepFrames: number; max: number; pad2?: boolean }> = ({ frame, startAt, stepFrames, max, pad2 }) => {
  const elapsed = Math.max(0, frame - startAt);
  const n = Math.min(max, Math.floor(elapsed / stepFrames) + 1);
  const v = pad2 ? String(n).padStart(2, "0") : String(n);
  return <>{v}</>;
};

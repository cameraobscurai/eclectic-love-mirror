import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 02 — PIN. Vertical 1080×1920. Headline + counter top.
// 4×2 product grid (compact, all visible). A traveling cursor dot moves card
// to card and "taps" each one — pin checkmark appears with bounce, card kicks
// down 4px, counter pulses up by 1.

const COLS = 4;
const ROWS = 2;
const CARD_W = 224;
const CARD_H = 280;
const GAP = 20;

const SCENE_LEN = 210;
const HEADLINE_END = 40;
const FIRST_TAP = 50;
const TAP_STAGGER = 18;
const OUTRO_START = SCENE_LEN - 24;

// tap order: hero first, then a deliberate sweep
const TAP_ORDER = [0, 2, 5, 7, 1, 4, 3, 6];

export const ScenePin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridLeft = (1080 - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
  const gridTop = 720;

  // per-product tap time
  const tapAt: Record<number, number> = {};
  TAP_ORDER.forEach((pi, i) => { tapAt[pi] = FIRST_TAP + i * TAP_STAGGER; });

  // count pinned so far
  const pinned = TAP_ORDER.filter((pi) => frame >= tapAt[pi]).length;

  const lastTapFrame = Math.max(-100, ...TAP_ORDER.filter((pi) => frame >= tapAt[pi]).map((pi) => tapAt[pi]));
  const counterSp = spring({ frame: frame - lastTapFrame, fps, config: { damping: 10, stiffness: 240 } });
  const counterScale = interpolate(counterSp, [0, 0.5, 1], [0.86, 1.18, 1]);

  const headlineSp = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });
  const headlineY = interpolate(headlineSp, [0, 1], [28, 0]);

  // cursor position — interpolated between successive card centers
  const cursor = (() => {
    if (frame < FIRST_TAP - 8) return null;
    // build keyframes: arrive 6f before tap, hold 6f after
    type KF = { f: number; x: number; y: number };
    const kfs: KF[] = [];
    TAP_ORDER.forEach((pi) => {
      const col = pi % COLS;
      const row = Math.floor(pi / COLS);
      const cx = gridLeft + col * (CARD_W + GAP) + CARD_W / 2;
      const cy = gridTop + row * (CARD_H + GAP) + CARD_H / 2;
      kfs.push({ f: tapAt[pi] - 4, x: cx, y: cy });
      kfs.push({ f: tapAt[pi] + 4, x: cx, y: cy });
    });
    // find current segment
    for (let i = 0; i < kfs.length - 1; i++) {
      if (frame >= kfs[i].f && frame <= kfs[i + 1].f) {
        const t = (frame - kfs[i].f) / Math.max(1, kfs[i + 1].f - kfs[i].f);
        const e = t * t * (3 - 2 * t); // smoothstep
        return { x: kfs[i].x + (kfs[i + 1].x - kfs[i].x) * e, y: kfs[i].y + (kfs[i + 1].y - kfs[i].y) * e };
      }
    }
    if (frame > kfs[kfs.length - 1].f) return kfs[kfs.length - 1];
    return kfs[0];
  })();

  const outroT = interpolate(frame, [OUTRO_START, SCENE_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);

  return (
    <AbsoluteFill style={{ opacity: outroOp }}>
      <Chrome step={2} label="Pin Pieces" />

      <div style={{ position: "absolute", left: 64, right: 64, top: 200, opacity: headlineSp, transform: `translateY(${headlineY}px)` }}>
        <div style={{ color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 13, letterSpacing: "0.42em", textTransform: "uppercase", marginBottom: 22 }}>
          Step Two · 02 / 05
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
          <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 84, lineHeight: 0.95, fontWeight: 300, letterSpacing: "-0.005em", flex: 1 }}>
            Pin from our<br />actual <em style={{ fontStyle: "italic", fontWeight: 400 }}>inventory</em>.
          </div>
          <div style={{ textAlign: "right", transform: `scale(${counterScale})`, transformOrigin: "100% 0" }}>
            <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 92, lineHeight: 1, fontWeight: 300, letterSpacing: "0.02em" }}>
              {String(pinned).padStart(2, "0")}
            </div>
            <div style={{ marginTop: 6, color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase" }}>
              Pinned / 08
            </div>
          </div>
        </div>
      </div>

      {/* category rail */}
      <div style={{ position: "absolute", left: 64, right: 64, top: 660, display: "flex", gap: 18, opacity: interpolate(frame, [HEADLINE_END - 14, HEADLINE_END + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {["Tables", "Lighting", "Seating", "Bars", "Serveware", "Tableware", "Candlelight", "Rugs"].map((c, i) => (
          <div key={i} style={{ color: COLORS.charcoal, opacity: i === 0 ? 0.95 : 0.4, fontFamily: BODY, fontSize: 10, letterSpacing: "0.34em", textTransform: "uppercase", borderBottom: i === 0 ? `1px solid ${COLORS.charcoal}` : "none", paddingBottom: 4 }}>
            {c}
          </div>
        ))}
      </div>

      {/* Grid */}
      {PRODUCTS.map((p, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const left = gridLeft + col * (CARD_W + GAP);
        const top = gridTop + row * (CARD_H + GAP);

        // card mount
        const sp = spring({ frame: frame - (HEADLINE_END + i * 4), fps, config: { damping: 18, stiffness: 180 } });
        const mountY = interpolate(sp, [0, 1], [-16, 0]);
        const mountOp = interpolate(sp, [0, 1], [0, 1]);

        // tap response
        const t = tapAt[i] ?? -100;
        const tapSp = spring({ frame: frame - t, fps, config: { damping: 10, stiffness: 260 } });
        const tapKick = interpolate(tapSp, [0, 0.5, 1], [0, 6, 0]);
        const pinScale = interpolate(tapSp, [0, 0.5, 1], [0, 1.25, 1]);
        const pinOp = interpolate(tapSp, [0, 0.3, 1], [0, 1, 1]);
        const dimAfter = frame >= t ? 1 : 0.86;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left, top: top + mountY + tapKick,
              width: CARD_W, height: CARD_H,
              opacity: mountOp * dimAfter,
              background: COLORS.cream,
              boxShadow: frame >= t
                ? "0 22px 56px -22px rgba(26,26,26,0.32), 0 6px 14px -8px rgba(26,26,26,0.18)"
                : "0 12px 32px -16px rgba(26,26,26,0.22), 0 3px 8px -4px rgba(26,26,26,0.12)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              border: frame >= t ? `1px solid ${COLORS.charcoal}` : `1px solid ${COLORS.charcoal}1a`,
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
                  top: 2, right: 2,
                  width: 28, height: 28,
                  background: COLORS.charcoal,
                  color: COLORS.cream,
                  fontFamily: BODY, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: pinOp,
                  transform: `scale(${pinScale})`,
                }}
              >
                ✓
              </div>
            </div>
            <div style={{ marginTop: 10, color: COLORS.charcoal, opacity: 0.8, fontFamily: BODY, fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {p.title}
            </div>
          </div>
        );
      })}

      {/* cursor */}
      {cursor && (
        <div style={{ position: "absolute", left: cursor.x - 12, top: cursor.y - 12, width: 24, height: 24, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: COLORS.charcoal, mixBlendMode: "difference" }} />
          <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `1px solid ${COLORS.charcoal}`, opacity: 0.4 }} />
        </div>
      )}
    </AbsoluteFill>
  );
};

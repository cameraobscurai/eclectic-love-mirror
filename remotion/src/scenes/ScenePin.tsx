import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS } from "../theme";
import { BODY } from "../fonts";
import { IndexCard } from "../components/IndexCard";

// SCENE 02 — INVENTORY. 4×2 product grid inside the card. A cursor dot
// taps each in sequence; checkmarks bloom, counter ticks.

const SCENE_LEN = 216;
const HEADER_END = 18;
const FIRST_TAP = 36;
const TAP_STAGGER = 18;

const COLS = 4;
const CARD_W = 210;
const CARD_H = 252;
const GAP = 16;

const TAP_ORDER = [0, 2, 5, 7, 1, 4, 3, 6];

export const ScenePin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const innerW = 968;
  const gridLeft = (innerW - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
  const gridTop = 130;

  const tapAt: Record<number, number> = {};
  TAP_ORDER.forEach((pi, i) => { tapAt[pi] = FIRST_TAP + i * TAP_STAGGER; });

  const pinned = TAP_ORDER.filter((pi) => frame >= tapAt[pi]).length;
  const lastTap = Math.max(-100, ...TAP_ORDER.filter((pi) => frame >= tapAt[pi]).map((pi) => tapAt[pi]));
  const counterSp = spring({ frame: frame - lastTap, fps, config: { damping: 10, stiffness: 240 } });
  const counterScale = interpolate(counterSp, [0, 0.5, 1], [0.85, 1.18, 1]);

  // cursor — interpolate between successive card centers
  const cursor = (() => {
    if (frame < FIRST_TAP - 8) return null;
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
    for (let i = 0; i < kfs.length - 1; i++) {
      if (frame >= kfs[i].f && frame <= kfs[i + 1].f) {
        const t = (frame - kfs[i].f) / Math.max(1, kfs[i + 1].f - kfs[i].f);
        const e = t * t * (3 - 2 * t);
        return { x: kfs[i].x + (kfs[i + 1].x - kfs[i].x) * e, y: kfs[i].y + (kfs[i + 1].y - kfs[i].y) * e };
      }
    }
    if (frame > kfs[kfs.length - 1].f) return kfs[kfs.length - 1];
    return kfs[0];
  })();

  // category rail
  const railOp = interpolate(frame, [HEADER_END - 8, HEADER_END + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <IndexCard step={2} label="Inventory" subtitle="What's actually ours." sceneLen={SCENE_LEN}>
        {/* counter top right */}
        <div
          style={{
            position: "absolute", top: 24, right: 32,
            display: "flex", alignItems: "baseline", gap: 10,
            transform: `scale(${counterScale})`,
            transformOrigin: "100% 50%",
          }}
        >
          <span style={{ color: COLORS.charcoal, fontFamily: BODY, fontSize: 36, fontWeight: 300, lineHeight: 1 }}>
            {String(pinned).padStart(2, "0")}
          </span>
          <span style={{ color: COLORS.charcoal, opacity: 0.5, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            / 08 Pinned
          </span>
        </div>

        {/* category rail */}
        <div style={{ position: "absolute", left: 32, top: 36, display: "flex", gap: 16, opacity: railOp }}>
          {["Tables", "Lighting", "Seating", "Bars", "Serveware", "Tableware", "Candle", "Rugs"].map((c, i) => (
            <div
              key={c}
              style={{
                color: COLORS.charcoal,
                opacity: i === 0 ? 0.95 : 0.4,
                fontFamily: BODY,
                fontSize: 9,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                borderBottom: i === 0 ? `1px solid ${COLORS.charcoal}` : "none",
                paddingBottom: 3,
              }}
            >
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

          const sp = spring({ frame: frame - (HEADER_END + 4 + i * 3), fps, config: { damping: 18, stiffness: 180 } });
          const mountY = interpolate(sp, [0, 1], [-14, 0]);
          const mountOp = interpolate(sp, [0, 1], [0, 1]);

          const t = tapAt[i] ?? -100;
          const tapSp = spring({ frame: frame - t, fps, config: { damping: 10, stiffness: 260 } });
          const tapKick = interpolate(tapSp, [0, 0.5, 1], [0, 5, 0]);
          const pinScale = interpolate(tapSp, [0, 0.5, 1], [0, 1.25, 1]);
          const pinOp = interpolate(tapSp, [0, 0.3, 1], [0, 1, 1]);
          const dim = frame >= t ? 1 : 0.86;
          const border = frame >= t ? `1px solid ${COLORS.charcoal}` : `1px solid ${COLORS.charcoal}1a`;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left, top: top + mountY + tapKick,
                width: CARD_W, height: CARD_H,
                opacity: mountOp * dim,
                background: COLORS.cream,
                boxShadow: frame >= t
                  ? "0 18px 44px -20px rgba(26,26,26,0.32), 0 4px 10px -6px rgba(26,26,26,0.18)"
                  : "0 10px 26px -14px rgba(26,26,26,0.22)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                border,
              }}
            >
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                <div
                  style={{
                    position: "absolute",
                    top: 0, right: 0,
                    width: 26, height: 26,
                    background: COLORS.charcoal,
                    color: COLORS.cream,
                    fontFamily: BODY, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: pinOp,
                    transform: `scale(${pinScale})`,
                  }}
                >
                  ✓
                </div>
              </div>
              <div style={{ marginTop: 8, color: COLORS.charcoal, opacity: 0.78, fontFamily: BODY, fontSize: 8, letterSpacing: "0.28em", textTransform: "uppercase", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {p.title}
              </div>
            </div>
          );
        })}

        {/* cursor */}
        {cursor && (
          <div style={{ position: "absolute", left: cursor.x - 11, top: cursor.y - 11, width: 22, height: 22, pointerEvents: "none" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: COLORS.charcoal, mixBlendMode: "difference" }} />
            <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `1px solid ${COLORS.charcoal}`, opacity: 0.4 }} />
          </div>
        )}
      </IndexCard>
    </AbsoluteFill>
  );
};

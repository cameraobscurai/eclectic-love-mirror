import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PRODUCTS } from "../theme";
import { BODY } from "../fonts";
import { IndexCard, INNER_W } from "../components/IndexCard";

// SCENE 02 — INVENTORY. Mirrors the CollectionPicker UI: search bar at top,
// category pills row, then a 4×2 product grid. Cursor taps in sequence,
// checkmark stamps. No floating card, just the site's flat surface.

const SCENE_LEN = 216;
const SEARCH_H = 56;
const PILLS_TOP = SEARCH_H + 24;
const PILLS_H = 32;
const GRID_TOP = PILLS_TOP + PILLS_H + 36;

const COLS = 4;
const GAP = 16;
const CARD_W = (INNER_W - (COLS - 1) * GAP) / COLS;
const CARD_H = CARD_W * 1.18;

const FIRST_TAP = 40;
const TAP_STAGGER = 16;
const TAP_ORDER = [0, 2, 5, 7, 1, 4, 3, 6];

const CATEGORIES = ["TABLES", "LIGHTING", "SEATING", "BARS", "SERVEWARE", "TABLEWARE", "CANDLE", "RUGS"];

export const ScenePin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tapAt: Record<number, number> = {};
  TAP_ORDER.forEach((pi, i) => { tapAt[pi] = FIRST_TAP + i * TAP_STAGGER; });

  const pinned = TAP_ORDER.filter((pi) => frame >= tapAt[pi]).length;

  // cursor path
  const cursor = (() => {
    if (frame < FIRST_TAP - 8) return null;
    const kfs: { f: number; x: number; y: number }[] = [];
    TAP_ORDER.forEach((pi) => {
      const col = pi % COLS;
      const row = Math.floor(pi / COLS);
      const cx = col * (CARD_W + GAP) + CARD_W / 2;
      const cy = GRID_TOP + row * (CARD_H + GAP) + CARD_H / 2;
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

  return (
    <AbsoluteFill>
      <IndexCard step={2} label="Inventory" subtitle="Pin pieces that fit your vision." sceneLen={SCENE_LEN}>
        {/* Search bar — site-style hairline rectangle */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: 0,
            height: SEARCH_H,
            border: `1px solid ${COLORS.rule}`,
            display: "flex", alignItems: "center",
            paddingLeft: 20, paddingRight: 20,
            color: COLORS.charcoal, opacity: 0.55,
            fontFamily: BODY, fontSize: 14, letterSpacing: "0.22em", textTransform: "uppercase",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.charcoal} strokeWidth="1.5" style={{ marginRight: 14, opacity: 0.6 }}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          Search the collection
          <span style={{ marginLeft: "auto", opacity: 0.45, fontSize: 12 }}>
            {String(pinned).padStart(2, "0")} / 08 PINNED
          </span>
        </div>

        {/* Category pills */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: PILLS_TOP,
            display: "flex", gap: 10, flexWrap: "wrap",
          }}
        >
          {CATEGORIES.map((c, i) => (
            <div
              key={c}
              style={{
                padding: "8px 16px",
                border: `1px solid ${i === 0 ? COLORS.charcoal : COLORS.rule}`,
                color: COLORS.charcoal,
                opacity: i === 0 ? 0.95 : 0.55,
                background: i === 0 ? COLORS.charcoal : "transparent",
                fontFamily: BODY,
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              <span style={{ color: i === 0 ? COLORS.cream : COLORS.charcoal }}>{c}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        {PRODUCTS.map((p, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const left = col * (CARD_W + GAP);
          const top = GRID_TOP + row * (CARD_H + GAP);

          const sp = spring({ frame: frame - (10 + i * 3), fps, config: { damping: 20, stiffness: 160 } });
          const mountOp = interpolate(sp, [0, 1], [0, 1]);
          const mountY = interpolate(sp, [0, 1], [10, 0]);

          const t = tapAt[i] ?? -100;
          const tapSp = spring({ frame: frame - t, fps, config: { damping: 11, stiffness: 260 } });
          const tapKick = interpolate(tapSp, [0, 0.5, 1], [0, 4, 0]);
          const pinScale = interpolate(tapSp, [0, 0.5, 1], [0, 1.2, 1]);
          const pinOp = interpolate(tapSp, [0, 0.3, 1], [0, 1, 1]);
          const border = frame >= t ? `1px solid ${COLORS.charcoal}` : `1px solid ${COLORS.rule}`;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left, top: top + mountY + tapKick,
                width: CARD_W, height: CARD_H,
                opacity: mountOp,
                background: COLORS.cream,
                border,
                padding: 14,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                <div
                  style={{
                    position: "absolute", top: 0, right: 0,
                    width: 28, height: 28,
                    background: COLORS.charcoal, color: COLORS.cream,
                    fontFamily: BODY, fontSize: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: pinOp,
                    transform: `scale(${pinScale})`,
                  }}
                >✓</div>
              </div>
              <div style={{ marginTop: 10, color: COLORS.charcoal, opacity: 0.72, fontFamily: BODY, fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {p.title}
              </div>
            </div>
          );
        })}

        {/* cursor */}
        {cursor && (
          <div style={{ position: "absolute", left: cursor.x - 9, top: cursor.y - 9, width: 18, height: 18, pointerEvents: "none" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: COLORS.charcoal }} />
            <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `1px solid ${COLORS.charcoal}`, opacity: 0.35 }} />
          </div>
        )}
      </IndexCard>
    </AbsoluteFill>
  );
};

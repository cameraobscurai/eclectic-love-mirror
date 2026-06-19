import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 03 — PIN. A 4×3 product grid. Tiles light up one by one with a small
// check chip, evoking pinning pieces into the brief.
type Tile = { label: string; tone: [string, string]; shape: "lounge" | "table" | "lamp" | "pillow" | "rug" };
const GRID: Tile[] = [
  { label: "AUSET LINEN BANQUETTE", tone: ["#e8e1d6", "#d4cdc4"], shape: "lounge" },
  { label: "MARRAKECH RUG", tone: ["#6e3a2b", "#8a6a44"], shape: "rug" },
  { label: "OLIVE BRANCH LAMP", tone: ["#3a342c", "#7a6a55"], shape: "lamp" },
  { label: "DONAVER GLASS", tone: ["#d4cdc4", "#b8ad9f"], shape: "table" },
  { label: "BOUCLÉ PILLOW", tone: ["#e8e1d6", "#c89c6a"], shape: "pillow" },
  { label: "ADONIS BAR", tone: ["#1a1a1a", "#3a342c"], shape: "table" },
  { label: "SAGE CANDLE", tone: ["#7a6a55", "#3a342c"], shape: "lamp" },
  { label: "MIDAS FLATWARE", tone: ["#c89c6a", "#8a6a44"], shape: "table" },
  { label: "FUR THROW", tone: ["#b8ad9f", "#e8e1d6"], shape: "pillow" },
  { label: "AKOYA BOWL", tone: ["#e8e1d6", "#d4cdc4"], shape: "table" },
  { label: "SAOL LANTERN", tone: ["#3a342c", "#6e3a2b"], shape: "lamp" },
  { label: "CASA CARTA CHAIR", tone: ["#7a6a55", "#3a342c"], shape: "lounge" },
];

// which tiles get "pinned" (checkmark) and in what order
const PINS = [0, 1, 3, 5, 6, 9];

function Pictogram({ shape, color }: { shape: Tile["shape"]; color: string }) {
  const s = 56;
  if (shape === "lounge")
    return (
      <svg width={s * 2} height={s} viewBox="0 0 112 56" fill="none">
        <path d="M6 36 v-16 q0-10 10-10 h80 q10 0 10 10 v16" stroke={color} strokeWidth="1.5" />
        <rect x="0" y="34" width="112" height="14" fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  if (shape === "table")
    return (
      <svg width={s * 2} height={s} viewBox="0 0 112 56" fill="none">
        <rect x="6" y="20" width="100" height="6" stroke={color} strokeWidth="1.5" />
        <line x1="16" y1="26" x2="16" y2="48" stroke={color} strokeWidth="1.5" />
        <line x1="96" y1="26" x2="96" y2="48" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  if (shape === "lamp")
    return (
      <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
        <path d="M14 22 L42 22 L36 8 L20 8 Z" stroke={color} strokeWidth="1.5" />
        <line x1="28" y1="22" x2="28" y2="48" stroke={color} strokeWidth="1.5" />
        <line x1="18" y1="50" x2="38" y2="50" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  if (shape === "pillow")
    return (
      <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
        <rect x="8" y="14" width="40" height="28" rx="6" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  return (
    <svg width={s * 2} height={s} viewBox="0 0 112 56" fill="none">
      <rect x="6" y="8" width="100" height="40" stroke={color} strokeWidth="1.5" />
      <line x1="6" y1="20" x2="106" y2="20" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <line x1="6" y1="36" x2="106" y2="36" stroke={color} strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

export const ScenePin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headIn = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });

  return (
    <AbsoluteFill>
      <Chrome step={3} label="Pin the Pieces" />

      {/* Headline strip top */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 160,
          opacity: headIn,
          transform: `translateY(${interpolate(headIn, [0, 1], [24, 0])}px)`,
        }}
      >
        <div
          style={{
            color: COLORS.charcoal,
            opacity: 0.55,
            fontFamily: BODY,
            fontSize: 12,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          Step Three
        </div>
        <div
          style={{
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 96,
            lineHeight: 0.95,
            fontWeight: 300,
            letterSpacing: "-0.01em",
          }}
        >
          Pin the pieces you <em style={{ fontStyle: "italic", fontWeight: 400 }}>want</em>.
        </div>
      </div>

      {/* Grid 4 × 3 */}
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          bottom: 130,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(3, 160px)",
          gap: 18,
        }}
      >
        {GRID.map((t, i) => {
          const delay = 12 + i * 3;
          const sp = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110 } });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [30, 0]);
          const pinIdx = PINS.indexOf(i);
          const pinned = pinIdx >= 0;
          const pinAt = 80 + pinIdx * 12;
          const pinSp = pinned
            ? spring({ frame: frame - pinAt, fps, config: { damping: 14, stiffness: 160 } })
            : 0;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                background: `linear-gradient(135deg, ${t.tone[0]}, ${t.tone[1]})`,
                opacity: op,
                transform: `translateY(${y}px)`,
                border: `1px solid ${pinned && pinSp > 0.4 ? COLORS.charcoal : COLORS.charcoal + "22"}`,
                boxShadow: pinned
                  ? `0 0 0 ${pinSp * 2}px ${COLORS.charcoal}, 0 16px 40px -16px rgba(26,26,26,${
                      0.3 + pinSp * 0.2
                    })`
                  : "0 12px 30px -16px rgba(26,26,26,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pictogram shape={t.shape} color={`${COLORS.charcoal}88`} />
              {/* label strip */}
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 10,
                  right: 10,
                  fontFamily: BODY,
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.charcoal,
                  opacity: 0.7,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.label}
              </div>
              {/* pin badge */}
              {pinned && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    background: COLORS.charcoal,
                    color: COLORS.cream,
                    display: "grid",
                    placeItems: "center",
                    opacity: pinSp,
                    transform: `scale(${interpolate(pinSp, [0, 1], [0.2, 1])})`,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5 L5 9 L9.5 3.5" stroke={COLORS.cream} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pinned count chip — counts up as PINS land */}
      <div
        style={{
          position: "absolute",
          top: 220,
          right: 160,
          textAlign: "right",
          color: COLORS.charcoal,
          opacity: 0.85,
          fontFamily: DISPLAY,
          fontWeight: 300,
        }}
      >
        <div style={{ fontSize: 96, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {Math.min(PINS.length, Math.max(0, Math.floor((frame - 80) / 12) + 1))
            .toString()
            .padStart(2, "0")}
        </div>
        <div
          style={{
            fontFamily: BODY,
            fontSize: 11,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            marginTop: 4,
            opacity: 0.6,
          }}
        >
          Pinned
        </div>
      </div>
    </AbsoluteFill>
  );
};

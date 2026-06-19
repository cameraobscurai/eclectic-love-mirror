import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, INSPO } from "../theme";
import { BODY } from "../fonts";
import { IndexCard, INNER_W, INNER_H } from "../components/IndexCard";

// SCENE 01 — INSPO. Mirrors the site's dashed drop zone + thumbnail grid.
// Top: dashed bordered zone with "DROP IMAGES OR CLICK TO BROWSE" + counter.
// Below: 5-up thumbnail grid that fills as images "land".

const SCENE_LEN = 186;
const FIRST_LAND = 32;
const STAGGER = 22;

const DROPZONE_H = 380;
const DROPZONE_TOP = 0;

const THUMB_GAP = 12;
const THUMB_COLS = 5;
const THUMB_W = (INNER_W - (THUMB_COLS - 1) * THUMB_GAP) / THUMB_COLS;
const THUMB_TOP = DROPZONE_TOP + DROPZONE_H + 40;

export const SceneDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const landAt = (i: number) => FIRST_LAND + i * STAGGER;
  const landed = INSPO.filter((_, i) => frame >= landAt(i)).length;
  const lastLand = INSPO.map((_, i) => landAt(i)).filter((f) => frame >= f).pop() ?? -100;
  const counterSp = spring({ frame: frame - lastLand, fps, config: { damping: 12, stiffness: 220 } });
  const counterScale = interpolate(counterSp, [0, 0.5, 1], [0.92, 1.1, 1]);

  // pulse drop zone border subtly
  const hoverPulse = (Math.sin(frame / 14) + 1) / 2; // 0..1
  const dashOpacity = 0.25 + hoverPulse * 0.15;

  return (
    <AbsoluteFill>
      <IndexCard step={1} label="Inspo" subtitle="Drop the images that move you." sceneLen={SCENE_LEN}>
        {/* Drop zone — dashed bordered, exactly like the site */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, top: DROPZONE_TOP,
            height: DROPZONE_H,
            border: `2px dashed rgba(26,26,26,${dashOpacity})`,
            background: "rgba(26,26,26,0.012)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
          }}
        >
          {/* image-plus icon (svg, no lib) */}
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={COLORS.charcoal} strokeOpacity="0.42" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <circle cx="9" cy="9" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
            <path d="M18 4v4M16 6h4" strokeOpacity="0.6" />
          </svg>
          <div
            style={{
              color: COLORS.charcoal,
              fontFamily: BODY,
              fontSize: 16,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 500,
              opacity: 0.7,
            }}
          >
            Drop images or click to browse
          </div>
          <div
            style={{
              color: COLORS.charcoal,
              opacity: 0.45,
              fontFamily: BODY,
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              transform: `scale(${counterScale})`,
              transformOrigin: "50% 50%",
            }}
          >
            <span style={{ fontWeight: 500, color: COLORS.charcoal, opacity: 0.95 }}>
              {String(landed).padStart(2, "0")}
            </span>
            <span> / 05 · 8MB MAX EACH</span>
          </div>
        </div>

        {/* Thumbnail strip — 5 up, fills as images land */}
        {INSPO.map((src, i) => {
          const start = landAt(i);
          const sp = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 140 } });
          if (sp <= 0) return null;
          const left = i * (THUMB_W + THUMB_GAP);
          const op = interpolate(sp, [0, 1], [0, 1]);
          const y = interpolate(sp, [0, 1], [-40, 0]);
          // tiny landing settle wobble
          const settled = Math.max(0, frame - (start + 14));
          const float = Math.sin(settled / 40 + i) * 0.6;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left,
                top: THUMB_TOP + y + float,
                width: THUMB_W,
                height: THUMB_W,  // square like site
                opacity: op,
                background: "rgba(26,26,26,0.05)",
                overflow: "hidden",
              }}
            >
              <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {/* X corner badge like the site */}
              <div
                style={{
                  position: "absolute", top: 6, right: 6,
                  width: 22, height: 22,
                  background: "rgba(26,26,26,0.8)",
                  color: COLORS.cream,
                  fontFamily: BODY,
                  fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0.85,
                }}
              >×</div>
            </div>
          );
        })}

        {/* placeholder empty slots before items land */}
        {INSPO.map((_, i) => {
          if (frame >= landAt(i)) return null;
          const left = i * (THUMB_W + THUMB_GAP);
          return (
            <div
              key={"ph" + i}
              style={{
                position: "absolute",
                left,
                top: THUMB_TOP,
                width: THUMB_W,
                height: THUMB_W,
                border: `1px solid ${COLORS.rule}`,
              }}
            />
          );
        })}

        {/* tiny caption below grid */}
        <div
          style={{
            position: "absolute",
            left: 0, top: THUMB_TOP + THUMB_W + 24,
            color: COLORS.charcoal, opacity: 0.45,
            fontFamily: BODY, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
          }}
        >
          Your Inspo — {String(landed).padStart(2, "0")} of 05
        </div>

        {/* Suppress unused INNER_H warning */}
        <div style={{ display: "none" }}>{INNER_H}</div>
      </IndexCard>
    </AbsoluteFill>
  );
};

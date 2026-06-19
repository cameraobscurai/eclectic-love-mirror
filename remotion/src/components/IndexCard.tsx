import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, GUTTER, STEP_TOP, TITLE_TOP, RULE_TOP, CONTENT_TOP, CONTENT_BOTTOM, CONTENT_W } from "../theme";
import { DISPLAY, BODY } from "../fonts";

// SceneFrame (kept the IndexCard name so scenes don't churn).
// Renders the actual /stylebrief page chrome: STEP 0X micro + serif title +
// hairline + content slot. No floating card, no shadow — flat white site.

type Props = {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;        // legacy — used as STEP title
  subtitle: string;     // small caption line under the rule
  sceneLen: number;
  hideTitle?: boolean;     // doc-owns-page mode: skip serif title + rule + italic subtitle
  hideSubtitle?: boolean;  // hide just the italic subtitle line
  chromeOpacity?: number;  // fade the STEP row (0-1, default 1)
  cameraScale?: number;    // scene-level zoom on inner content (default 1)
  cameraY?: number;        // scene-level y offset (default 0)
  cameraOriginY?: number;  // transform-origin Y % (default 50)
  children: React.ReactNode;
};

// Per-step title strings that mirror the actual form headings on /stylebrief.
const STEP_TITLES: Record<number, string> = {
  1: "Drop Your Inspo.",
  2: "Pin From Our Collection.",
  3: "Generate Your Palette.",
  4: "Your Style Brief.",
  5: "Sent.",
};

export const IndexCard: React.FC<Props> = ({ step, label, subtitle, sceneLen, hideTitle, hideSubtitle, chromeOpacity = 1, cameraScale = 1, cameraY = 0, cameraOriginY = 50, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Soft fade in / out — the site doesn't bounce, it reveals.
  const inOp = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(frame, [sceneLen - 18, sceneLen], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = Math.min(inOp, outOp);

  // Title micro-rise (no scale — the site is calm).
  const titleSp = spring({ frame: frame - 2, fps, config: { damping: 28, stiffness: 110 } });
  const titleY = interpolate(titleSp, [0, 1], [12, 0]);

  // When hideTitle, slide content up into the freed real-estate so the doc owns the page.
  const contentTop = hideTitle ? STEP_TOP + 70 : CONTENT_TOP;
  const contentHeight = CONTENT_BOTTOM - contentTop;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      {/* STEP NN · 0X / 05 */}
      <div
        style={{
          position: "absolute",
          left: GUTTER, right: GUTTER, top: STEP_TOP,
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          color: COLORS.charcoal,
          fontFamily: BODY,
          fontSize: 13,
          letterSpacing: "0.36em",
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: 0.95 * chromeOpacity,
        }}
      >
        <span>Step · 0{step}</span>
        <span style={{ opacity: 0.45 }}>0{step} / 05 · {label}</span>
      </div>

      {!hideTitle && (
        <>
          {/* Big serif title */}
          <div
            style={{
              position: "absolute",
              left: GUTTER, right: GUTTER, top: TITLE_TOP,
              color: COLORS.charcoal,
              fontFamily: DISPLAY,
              fontSize: 84,
              fontWeight: 400,
              lineHeight: 0.98,
              letterSpacing: "-0.015em",
              transform: `translateY(${titleY}px)`,
            }}
          >
            {STEP_TITLES[step]}
          </div>

          {/* Hairline rule */}
          <div
            style={{
              position: "absolute",
              left: GUTTER, right: GUTTER, top: RULE_TOP,
              height: 1, background: COLORS.rule,
            }}
          />

          {!hideSubtitle && (
            <div
              style={{
                position: "absolute",
                left: GUTTER, right: GUTTER, top: RULE_TOP + 28,
                color: COLORS.charcoal,
                opacity: 0.55,
                fontFamily: DISPLAY,
                fontStyle: "italic",
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: "0.005em",
              }}
            >
              {subtitle}
            </div>
          )}
        </>
      )}

      {/* CONTENT SLOT */}
      <div
        style={{
          position: "absolute",
          left: GUTTER, top: contentTop,
          width: CONTENT_W,
          height: contentHeight,
          transform: `translateY(${cameraY}px) scale(${cameraScale})`,
          transformOrigin: `50% ${cameraOriginY}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Expose constants so scenes can compute layout in the inner box.
export const INNER_W = CONTENT_W;
export const INNER_H = CONTENT_BOTTOM - CONTENT_TOP;

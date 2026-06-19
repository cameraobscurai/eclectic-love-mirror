import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, GUTTER } from "../theme";
import { BODY } from "../fonts";

// Bottom progress bar — site-style hairline ticks with caps labels.
// 5 segments separated by tiny gaps; current segment fills with charcoal.
const LABELS = ["INSPO", "INVENTORY", "PALETTE", "BRIEF", "SENT"];

export const StepStack: React.FC<{ active: 1 | 2 | 3 | 4 | 5 }> = ({ active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const introSp = spring({ frame: frame - 4, fps, config: { damping: 26, stiffness: 110 } });
  const introOp = interpolate(introSp, [0, 1], [0, 1]);
  const introY = interpolate(introSp, [0, 1], [12, 0]);

  const fillSp = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 140 } });
  const fillW = interpolate(fillSp, [0, 1], [0, 100]);

  const segW = (1080 - GUTTER * 2 - 4 * 8) / 5;
  const segH = 2;
  const top = 1780;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: introOp, transform: `translateY(${introY}px)`, pointerEvents: "none" }}>
      {/* hairline rule above */}
      <div style={{ position: "absolute", left: GUTTER, right: GUTTER, top: top - 32, height: 1, background: COLORS.rule }} />

      {/* labels row */}
      {LABELS.map((l, i) => {
        const isActive = i + 1 === active;
        const isPast = i + 1 < active;
        return (
          <div
            key={l}
            style={{
              position: "absolute",
              left: GUTTER + i * (segW + 8),
              top: top - 20,
              width: segW,
              color: COLORS.charcoal,
              opacity: isActive ? 0.95 : isPast ? 0.55 : 0.32,
              fontFamily: BODY,
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            <span style={{ opacity: 0.5, marginRight: 8 }}>0{i + 1}</span>{l}
          </div>
        );
      })}

      {/* segments */}
      {[0, 1, 2, 3, 4].map((i) => {
        const isActive = i + 1 === active;
        const isPast = i + 1 < active;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: GUTTER + i * (segW + 8),
              top,
              width: segW,
              height: segH,
              background: isPast ? COLORS.charcoal : COLORS.rule,
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: COLORS.charcoal,
                  clipPath: `inset(0 ${100 - fillW}% 0 0)`,
                }}
              />
            )}
          </div>
        );
      })}

      {/* footer mark — eclectichive.com / studio */}
      <div
        style={{
          position: "absolute",
          left: GUTTER, right: GUTTER, bottom: 50,
          display: "flex", justifyContent: "space-between",
          color: COLORS.charcoal,
          opacity: 0.5,
          fontFamily: BODY,
          fontSize: 11,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
        }}
      >
        <span>eclectichive.com</span>
        <span>Denver · Mountain West</span>
      </div>
    </div>
  );
};

import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { BODY } from "../fonts";

// StepStack — persistent visual progress at the bottom of every frame.
// 5 tiny card-edge pills, the current one filled with charcoal, the rest
// hairline outlines. The pill "fills in" with a sweep when its step begins,
// so the viewer subliminally tracks "01 / 05 → 05 / 05".

const LABELS = ["INSPO", "INVENTORY", "PALETTE", "BRIEF", "DELIVERED"];

export const StepStack: React.FC<{ active: 1 | 2 | 3 | 4 | 5 }> = ({ active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // intro for the whole bar
  const introSp = spring({ frame: frame - 4, fps, config: { damping: 24, stiffness: 100 } });
  const introOp = interpolate(introSp, [0, 1], [0, 1]);
  const introY = interpolate(introSp, [0, 1], [22, 0]);

  // fill sweep when active pill appears
  const fillSp = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 140 } });
  const fillW = interpolate(fillSp, [0, 1], [0, 100]);

  const totalW = 920;
  const gap = 12;
  const pillW = (totalW - gap * 4) / 5;
  const pillH = 6;
  const left = (1080 - totalW) / 2;
  const top = 1740;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: introOp, transform: `translateY(${introY}px)`, pointerEvents: "none" }}>
      {/* pills */}
      {[0, 1, 2, 3, 4].map((i) => {
        const isActive = i + 1 === active;
        const isPast = i + 1 < active;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + i * (pillW + gap),
              top,
              width: pillW,
              height: pillH,
              background: isPast ? COLORS.charcoal : `${COLORS.charcoal}1f`,
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

      {/* labels */}
      {LABELS.map((l, i) => {
        const isActive = i + 1 === active;
        return (
          <div
            key={l}
            style={{
              position: "absolute",
              left: left + i * (pillW + gap),
              top: top + 22,
              width: pillW,
              textAlign: "center",
              color: COLORS.charcoal,
              opacity: isActive ? 0.95 : 0.32,
              fontFamily: BODY,
              fontSize: 10,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {l}
          </div>
        );
      })}

      {/* footer mark */}
      <div
        style={{
          position: "absolute",
          left: 0, right: 0, bottom: 56,
          textAlign: "center",
          color: COLORS.charcoal,
          opacity: 0.4,
          fontFamily: BODY,
          fontSize: 10,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
        }}
      >
        Eclectic Hive · The Style Brief
      </div>
    </div>
  );
};

import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";

// IndexCard — the persistent visual unit of the entire video.
// Every scene is a tactile editorial card with the same chrome:
//   ┌──────────────────────────────────┐
//   │ 01            INSPO              │  ← step + label rail
//   │ ────────────────                  │
//   │                                   │
//   │     [ content ]                   │
//   │                                   │
//   │ ────────────────                  │
//   │ italic subtitle line              │  ← caption rail
//   └──────────────────────────────────┘
//
// Cards rise from below on intro, hang, then drop back below on outro.
// Adjacent scene Sequences overlap 24f so the user sees one card hand off
// to the next — a real shuffle, not a cut.

type Props = {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;
  subtitle: string;
  sceneLen: number;
  introLen?: number;
  outroLen?: number;
  children: React.ReactNode;
};

export const IndexCard: React.FC<Props> = ({
  step, label, subtitle, sceneLen, introLen = 24, outroLen = 24, children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry: rise from below with spring
  const entrySp = spring({ frame: frame - 0, fps, config: { damping: 22, stiffness: 100 } });
  const entryY = interpolate(entrySp, [0, 1], [220, 0]);
  const entryOp = interpolate(frame, [0, introLen], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const entryScale = interpolate(entrySp, [0, 1], [0.96, 1]);

  // Outro: fall back below
  const outroT = interpolate(frame, [sceneLen - outroLen, sceneLen], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroY = interpolate(outroT, [0, 1], [0, 180]);
  const outroOp = interpolate(outroT, [0, 1], [1, 0]);
  const outroScale = interpolate(outroT, [0, 1], [1, 0.97]);

  // Subtle live float
  const float = Math.sin(frame / 60) * 1.2;

  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        top: 200,
        bottom: 260,
        background: "#FBF7EE",
        boxShadow: "0 50px 110px -34px rgba(26,26,26,0.42), 0 16px 36px -16px rgba(26,26,26,0.22)",
        border: `1px solid ${COLORS.charcoal}22`,
        opacity: entryOp * outroOp,
        transform: `translateY(${entryY + outroY + float}px) scale(${entryScale * outroScale})`,
        transformOrigin: "50% 30%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TOP RAIL */}
      <div style={{ padding: "44px 48px 0 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 64, lineHeight: 1, fontWeight: 300, fontStyle: "italic" }}>
            0{step}
          </div>
          <div style={{ color: COLORS.charcoal, fontFamily: BODY, fontSize: 16, letterSpacing: "0.46em", textTransform: "uppercase", fontWeight: 500 }}>
            {label}
          </div>
        </div>
        <div style={{ marginTop: 22, height: 1, background: `${COLORS.charcoal}55` }} />
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {children}
      </div>

      {/* BOTTOM RAIL */}
      <div style={{ padding: "0 48px 40px 48px" }}>
        <div style={{ height: 1, background: `${COLORS.charcoal}55`, marginBottom: 20 }} />
        <div style={{ color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 30, fontWeight: 400, lineHeight: 1.2 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
};

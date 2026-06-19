import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { MainVideo } from "./MainVideo";
import { COLORS } from "./theme";
import { DISPLAY, BODY } from "./fonts";

// 16:9 horizontal wrapper. The portrait piece stays the source of truth and
// sits centered as a magazine page; the rails carry minimal editorial chrome —
// a giant scene numeral on the left, the scene title on the right.

const SCENE_LABELS: { from: number; n: number; title: string }[] = [
  { from: 0,   n: 1, title: "Drop your inspo" },
  { from: 156, n: 2, title: "Pin from our collection" },
  { from: 342, n: 3, title: "Generate your palette" },
  { from: 552, n: 4, title: "Your style brief" },
  { from: 780, n: 5, title: "Sent" },
];

const PAGE_H = 1080;
const PAGE_SCALE = PAGE_H / 1920;       // 0.5625
const PAGE_W = 1080 * PAGE_SCALE;       // 607.5
const SIDE_W = (1920 - PAGE_W) / 2;     // 656.25

export const WideVideo: React.FC = () => {
  const frame = useCurrentFrame();

  let active = SCENE_LABELS[0];
  for (const s of SCENE_LABELS) if (frame >= s.from) active = s;

  const sinceSwap = frame - active.from;
  const titleOp = interpolate(sinceSwap, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const titleY  = interpolate(sinceSwap, [0, 22], [14, 0], { extrapolateRight: "clamp" });
  const numOp   = interpolate(sinceSwap, [0, 28], [0.35, 1], { extrapolateRight: "clamp" });
  const numY    = interpolate(sinceSwap, [0, 28], [18, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {/* Hairlines defining the centered page */}
      <div style={{ position: "absolute", left: SIDE_W - 1, top: 80, bottom: 80, width: 1, background: COLORS.rule }} />
      <div style={{ position: "absolute", right: SIDE_W - 1, top: 80, bottom: 80, width: 1, background: COLORS.rule }} />

      {/* LEFT RAIL — oversized scene numeral, wordmark at the foot */}
      <div
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: SIDE_W,
          padding: "120px 96px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: COLORS.charcoal,
        }}
      >
        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.5 }}>
          Eclectic Hive
        </div>

        <div
          key={`num-${active.n}`}
          style={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontSize: 360,
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
            opacity: numOp,
            transform: `translateY(${numY}px)`,
            color: COLORS.charcoal,
          }}
        >
          0{active.n}
        </div>

        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.36em", textTransform: "uppercase", opacity: 0.5 }}>
          /stylebrief
        </div>
      </div>

      {/* CENTER — the portrait piece */}
      <div
        style={{
          position: "absolute",
          left: SIDE_W,
          top: 0,
          width: PAGE_W,
          height: PAGE_H,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0, top: 0,
            width: 1080, height: 1920,
            transform: `scale(${PAGE_SCALE})`,
            transformOrigin: "0 0",
          }}
        >
          <MainVideo />
        </div>
      </div>

      {/* RIGHT RAIL — scene title + progress */}
      <div
        style={{
          position: "absolute",
          right: 0, top: 0, bottom: 0,
          width: SIDE_W,
          padding: "120px 96px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end",
          textAlign: "right",
          color: COLORS.charcoal,
        }}
      >
        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.5 }}>
          Scene 0{active.n} of 05
        </div>

        <div
          key={`t-${active.n}`}
          style={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontSize: 64,
            lineHeight: 1.04,
            letterSpacing: "-0.015em",
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            maxWidth: SIDE_W - 192,
          }}
        >
          {active.title}.
        </div>

        {/* Vertical scene ticks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end" }}>
          {SCENE_LABELS.map((s) => {
            const on = s.n === active.n;
            const past = s.n < active.n;
            return (
              <div
                key={s.n}
                style={{
                  width: on ? 36 : past ? 18 : 10,
                  height: 1,
                  background: on || past ? COLORS.charcoal : COLORS.rule,
                  opacity: on ? 1 : past ? 0.6 : 0.5,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

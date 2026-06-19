import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { MainVideo } from "./MainVideo";
import { COLORS } from "./theme";
import { DISPLAY, BODY } from "./fonts";

// 16:9 horizontal wrapper. Renders the canonical 1080×1920 portrait piece
// centered as a magazine page on a 1920×1080 paper spread, with editorial
// side rails (wordmark + scene index + tagline). No content rebuild — the
// portrait stays the source of truth.

const SCENE_LABELS: { from: number; n: number; title: string }[] = [
  { from: 0,   n: 1, title: "Drop Your Inspo" },
  { from: 156, n: 2, title: "Pin From Our Collection" },
  { from: 342, n: 3, title: "Generate Your Palette" },
  { from: 552, n: 4, title: "Your Style Brief" },
  { from: 780, n: 5, title: "Sent" },
];

const PAGE_H = 1080;
const PAGE_SCALE = PAGE_H / 1920;       // 0.5625
const PAGE_W = 1080 * PAGE_SCALE;       // 607.5

export const WideVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Active scene from frame.
  let active = SCENE_LABELS[0];
  for (const s of SCENE_LABELS) if (frame >= s.from) active = s;

  // Soft crossfade on scene title swap.
  const sinceSwap = frame - active.from;
  const titleOp = interpolate(sinceSwap, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(sinceSwap, [0, 18], [10, 0], { extrapolateRight: "clamp" });

  // Gentle paper breath on the side rails so the spread doesn't feel static.
  const breath = Math.sin((frame / 30) * 0.35) * 2;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {/* Subtle vertical hairlines defining the centered "page" */}
      <div style={{ position: "absolute", left: (1920 - PAGE_W) / 2 - 1, top: 60, bottom: 60, width: 1, background: COLORS.rule }} />
      <div style={{ position: "absolute", right: (1920 - PAGE_W) / 2 - 1, top: 60, bottom: 60, width: 1, background: COLORS.rule }} />

      {/* LEFT RAIL — brand */}
      <div
        style={{
          position: "absolute",
          left: 72, top: 0, bottom: 0,
          width: (1920 - PAGE_W) / 2 - 144,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          paddingTop: 96, paddingBottom: 96,
          color: COLORS.charcoal,
          transform: `translateY(${breath}px)`,
        }}
      >
        <div>
          <div style={{ fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.55 }}>
            Eclectic Hive
          </div>
          <div style={{ marginTop: 14, height: 1, width: 64, background: COLORS.ruleStrong }} />
          <div
            style={{
              marginTop: 36,
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 44,
              lineHeight: 1.05,
              letterSpacing: "-0.005em",
              opacity: 0.92,
            }}
          >
            A style brief,<br/>built in five<br/>quiet moves.
          </div>
        </div>

        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.36em", textTransform: "uppercase", opacity: 0.45 }}>
          /stylebrief · Est. 2024
        </div>
      </div>

      {/* CENTER — the portrait piece, scaled to height 1080 */}
      <div
        style={{
          position: "absolute",
          left: (1920 - PAGE_W) / 2,
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

      {/* RIGHT RAIL — scene index */}
      <div
        style={{
          position: "absolute",
          right: 72, top: 0, bottom: 0,
          width: (1920 - PAGE_W) / 2 - 144,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          paddingTop: 96, paddingBottom: 96,
          color: COLORS.charcoal,
          textAlign: "right",
          transform: `translateY(${-breath}px)`,
        }}
      >
        <div>
          <div style={{ fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.55 }}>
            Scene 0{active.n} / 05
          </div>
          <div style={{ marginTop: 14, marginLeft: "auto", height: 1, width: 64, background: COLORS.ruleStrong }} />
          <div
            key={active.n}
            style={{
              marginTop: 36,
              fontFamily: DISPLAY,
              fontSize: 52,
              lineHeight: 1.02,
              letterSpacing: "-0.012em",
              opacity: titleOp,
              transform: `translateY(${titleY}px)`,
            }}
          >
            {active.title}.
          </div>
        </div>

        {/* Mini progress dots */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          {SCENE_LABELS.map((s) => {
            const on = s.n <= active.n;
            return (
              <div
                key={s.n}
                style={{
                  width: on ? 22 : 8,
                  height: 2,
                  background: on ? COLORS.charcoal : COLORS.rule,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

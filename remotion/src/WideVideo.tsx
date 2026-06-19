import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { MainVideo } from "./MainVideo";
import { COLORS } from "./theme";
import { DISPLAY, BODY } from "./fonts";

// 16:9 horizontal wrapper. The portrait piece is the source of truth and sits
// centered as a magazine page. Rails carry minimal editorial chrome — a giant
// scene numeral on the left, a verb + epigraph on the right. No word from the
// portrait piece is repeated on the rails.

type Scene = {
  from: number;
  n: number;
  verb: string;           // single word, never echoed inside the portrait piece
  epigraph: string;       // short line — voice, not label
};

const SCENES: Scene[] = [
  { from: 0,   n: 1, verb: "Gather",  epigraph: "What you can't stop looking at." },
  { from: 156, n: 2, verb: "Choose",  epigraph: "From the archive, into the room." },
  { from: 342, n: 3, verb: "Distill", epigraph: "Color reduced to a chord." },
  { from: 552, n: 4, verb: "Compose", epigraph: "One page. Everything in it." },
  { from: 780, n: 5, verb: "Arrive",  epigraph: "Across the table, by morning." },
];

const PAGE_H = 1080;
const PAGE_SCALE = PAGE_H / 1920;       // 0.5625
const PAGE_W = 1080 * PAGE_SCALE;       // 607.5
const SIDE_W = (1920 - PAGE_W) / 2;     // 656.25
const TOTAL = 1020;

export const WideVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let activeIdx = 0;
  for (let i = 0; i < SCENES.length; i++) if (frame >= SCENES[i].from) activeIdx = i;
  const active = SCENES[activeIdx];
  const next = SCENES[activeIdx + 1];
  const scenePos = next
    ? Math.min(1, Math.max(0, (frame - active.from) / (next.from - active.from)))
    : Math.min(1, Math.max(0, (frame - active.from) / (TOTAL - active.from)));

  const sinceSwap = frame - active.from;

  // Numeral: spring up + tiny x drift settling
  const numSpring = spring({ frame: sinceSwap, fps, config: { damping: 22, stiffness: 110, mass: 0.9 } });
  const numOp = interpolate(numSpring, [0, 1], [0, 1]);
  const numY  = interpolate(numSpring, [0, 1], [22, 0]);
  const numX  = interpolate(numSpring, [0, 1], [-6, 0]);

  // Title-side (verb): masked reveal via clip-path, plus a hairline sweep underneath
  const verbReveal = interpolate(sinceSwap, [0, 28], [0, 100], { extrapolateRight: "clamp" });
  const verbY      = interpolate(sinceSwap, [0, 28], [10, 0],  { extrapolateRight: "clamp" });
  const ruleSweep  = interpolate(sinceSwap, [4, 32], [0, 100], { extrapolateRight: "clamp" });
  const epiOp      = interpolate(sinceSwap, [10, 34], [0, 1],  { extrapolateRight: "clamp" });
  const epiY       = interpolate(sinceSwap, [10, 34], [8, 0],  { extrapolateRight: "clamp" });

  // Subtle ambient drift for both rails (very small, ~2px)
  const breath = Math.sin((frame / fps) * 0.6) * 1.2;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {/* Hairlines defining the centered page */}
      <div style={{ position: "absolute", left: SIDE_W - 1, top: 80, bottom: 80, width: 1, background: COLORS.rule }} />
      <div style={{ position: "absolute", right: SIDE_W - 1, top: 80, bottom: 80, width: 1, background: COLORS.rule }} />

      {/* LEFT RAIL — wordmark · oversized numeral · slug */}
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
          transform: `translateY(${breath}px)`,
        }}
      >
        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.5 }}>
          Eclectic Hive
        </div>

        <div style={{ position: "relative" }}>
          <div
            key={`num-${active.n}`}
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 360,
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              opacity: numOp,
              transform: `translate(${numX}px, ${numY}px)`,
              color: COLORS.charcoal,
            }}
          >
            0{active.n}
          </div>
          {/* tiny ordinal */}
          <div
            style={{
              fontFamily: BODY,
              fontSize: 10,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              opacity: 0.45,
              marginTop: 18,
            }}
          >
            Chapter {romanize(active.n)} / V
          </div>
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

      {/* RIGHT RAIL — verb · sweep · epigraph · ticks */}
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
          transform: `translateY(${-breath}px)`,
        }}
      >
        {/* Top: act label, not redundant */}
        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.5 }}>
          An act in five
        </div>

        {/* Middle: VERB with masked reveal + hairline sweep + epigraph */}
        <div style={{ maxWidth: SIDE_W - 192 }}>
          <div
            key={`verb-${active.n}`}
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              transform: `translateY(${verbY}px)`,
              clipPath: `inset(0 0 ${100 - verbReveal}% 0)`,
              WebkitClipPath: `inset(0 0 ${100 - verbReveal}% 0)`,
            }}
          >
            {active.verb}.
          </div>

          {/* hairline that sweeps in under the verb */}
          <div
            style={{
              marginTop: 22,
              marginLeft: "auto",
              width: `${ruleSweep}%`,
              height: 1,
              background: COLORS.charcoal,
              opacity: 0.85,
            }}
          />

          <div
            key={`epi-${active.n}`}
            style={{
              marginTop: 22,
              fontFamily: BODY,
              fontSize: 14,
              lineHeight: 1.5,
              letterSpacing: "0.02em",
              opacity: epiOp * 0.7,
              transform: `translateY(${epiY}px)`,
              maxWidth: 360,
              marginLeft: "auto",
            }}
          >
            {active.epigraph}
          </div>
        </div>

        {/* Vertical scene ticks — active one fills with scene progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end" }}>
          {SCENES.map((s, i) => {
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            const baseW = isActive ? 44 : isPast ? 22 : 12;
            return (
              <div key={s.n} style={{ position: "relative", width: baseW, height: 1 }}>
                <div style={{ position: "absolute", inset: 0, background: COLORS.rule, opacity: 0.6 }} />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    height: 1,
                    width: isActive ? `${scenePos * 100}%` : isPast ? "100%" : "0%",
                    background: COLORS.charcoal,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function romanize(n: number) {
  return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}

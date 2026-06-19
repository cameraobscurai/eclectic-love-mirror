import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { MainVideo } from "./MainVideo";
import { COLORS, INSPO, PRODUCTS, REAL_PALETTE, SCENE_ACCENT } from "./theme";
import { DISPLAY, BODY } from "./fonts";

// 16:9 horizontal wrapper. Portrait piece sits centered. Rails carry
// minimal editorial chrome — giant scene numeral on the left, a verb and a
// visual source ledger on the right. No epigraph — the rail proves the
// choices visually instead of describing them.

type LedgerKind = "inspo" | "products" | "palette" | "brief" | "final";
type Scene = {
  from: number;
  n: number;
  verb: string;
  ledger: LedgerKind;
};

// Verbs anchored to the Atelier triad expanded.
// Rail flips lag StepStack so each chapter holds before the next lands.
// Scene 5 pushed to 900 so the assembled Brief gets real dwell.
const SCENES: Scene[] = [
  { from: 0,   n: 1, verb: "IMAGINED", ledger: "inspo"    },
  { from: 171, n: 2, verb: "SOURCED",  ledger: "products" },
  { from: 357, n: 3, verb: "COMPOSED", ledger: "palette"  },
  { from: 567, n: 4, verb: "DESIGNED", ledger: "brief"    },
  { from: 900, n: 5, verb: "REALIZED", ledger: "final"    },
];

const PAGE_H = 1080;
const PAGE_SCALE = PAGE_H / 1920;       // 0.5625
const PAGE_W = 1080 * PAGE_SCALE;       // 607.5
const SIDE_W = (1920 - PAGE_W) / 2;     // 656.25
const TOTAL = 1110;

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
  const accent = SCENE_ACCENT[activeIdx];

  // Numeral: spring with subtle drift
  const numSpring = spring({ frame: sinceSwap, fps, config: { damping: 22, stiffness: 110, mass: 0.9 } });
  const numOp = interpolate(numSpring, [0, 1], [0, 1]);
  const numY  = interpolate(numSpring, [0, 1], [22, 0]);
  const numX  = interpolate(numSpring, [0, 1], [-6, 0]);

  // Verb: masked reveal
  const verbReveal = interpolate(sinceSwap, [0, 28], [0, 100], { extrapolateRight: "clamp" });
  const verbY      = interpolate(sinceSwap, [0, 28], [10, 0],  { extrapolateRight: "clamp" });

  // Accent rule sweeps in palette-tinted under the verb
  const ruleSweep  = interpolate(sinceSwap, [4, 36], [0, 100], { extrapolateRight: "clamp" });

  // Ledger reveal — staggered
  const ledgerOp = interpolate(sinceSwap, [14, 38], [0, 1], { extrapolateRight: "clamp" });
  const ledgerY  = interpolate(sinceSwap, [14, 38], [8, 0], { extrapolateRight: "clamp" });

  // Ambient breath
  const breath = Math.sin((frame / fps) * 0.6) * 1.2;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {/* hairlines defining the centered page */}
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

      {/* RIGHT RAIL — verb · palette-accent rule · visual ledger · ticks */}
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
        <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", opacity: 0.5 }}>
          An act in five
        </div>

        <div style={{ maxWidth: SIDE_W - 192, width: "100%" }}>
          <div
            key={`verb-${active.n}`}
            style={{
              fontFamily: DISPLAY,
              fontSize: 72,
              lineHeight: 1.0,
              letterSpacing: "0.04em",
              transform: `translateY(${verbY}px)`,
              clipPath: `inset(0 0 ${100 - verbReveal}% 0)`,
              WebkitClipPath: `inset(0 0 ${100 - verbReveal}% 0)`,
            }}
          >
            {active.verb}
          </div>

          {/* palette-tinted accent rule */}
          <div
            style={{
              marginTop: 22,
              marginLeft: "auto",
              width: `${ruleSweep}%`,
              height: 2,
              background: accent,
              opacity: 0.9,
            }}
          />

          {/* visual ledger — proves the choices instead of describing them */}
          <div
            key={`led-${active.n}`}
            style={{
              marginTop: 28,
              opacity: ledgerOp,
              transform: `translateY(${ledgerY}px)`,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Ledger kind={active.ledger} />
          </div>
        </div>

        {/* vertical scene ticks */}
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
                    background: isActive ? accent : COLORS.charcoal,
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

// ——— ledger renderers ———

const THUMB = 56;
const DOT = 28;

const Ledger: React.FC<{ kind: LedgerKind }> = ({ kind }) => {
  if (kind === "inspo") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {INSPO.map((src, i) => (
          <div key={i} style={{ width: THUMB, height: THUMB * 1.25, overflow: "hidden", background: "rgba(26,26,26,0.05)" }}>
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "products") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${DOT * 1.4}px)`, gap: 8, justifyContent: "end" }}>
        {PRODUCTS.map((p, i) => (
          <div key={i} style={{ width: DOT * 1.4, height: DOT * 1.4, border: `1px solid ${COLORS.rule}`, background: COLORS.paper, padding: 4 }}>
            <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "palette") {
    return (
      <div style={{ display: "flex", gap: 0 }}>
        {REAL_PALETTE.map((sw, i) => (
          <div key={i} style={{ width: 44, height: 44, background: sw.hex }} />
        ))}
      </div>
    );
  }
  if (kind === "brief") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 0 }}>
          {REAL_PALETTE.map((sw, i) => (
            <div key={i} style={{ width: 36, height: 36, background: sw.hex }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${DOT}px)`, gap: 6 }}>
          {PRODUCTS.map((p, i) => (
            <div key={i} style={{ width: DOT, height: DOT, border: `1px solid ${COLORS.rule}`, background: COLORS.paper, padding: 3 }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  // final — palette band only, holding the close
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {REAL_PALETTE.map((sw, i) => (
        <div key={i} style={{ width: 44, height: 44, background: sw.hex, opacity: 0.85 }} />
      ))}
    </div>
  );
};

function romanize(n: number) {
  return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}

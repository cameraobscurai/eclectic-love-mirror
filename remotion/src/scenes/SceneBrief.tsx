import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, SAMPLE_PALETTE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 04 — BRIEF. An editorial document composes itself: client, scope,
// palette band, pinned pieces, signature. Lines reveal one at a time.

const LINES: { label: string; value: string }[] = [
  { label: "Client", value: "Hayes / Ridgeline Estate" },
  { label: "Occasion", value: "Late-Summer Welcome Dinner" },
  { label: "Guests", value: "64" },
  { label: "Scope", value: "Full-service design + production" },
  { label: "Mood", value: "Sand-washed, candle-warmed, low and long" },
];

function Reveal({ delay, children }: { delay: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 110 } });
  return (
    <div
      style={{
        opacity: sp,
        transform: `translateY(${interpolate(sp, [0, 1], [16, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
}

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sheetIn = spring({ frame: frame - 2, fps, config: { damping: 22, stiffness: 90 } });

  return (
    <AbsoluteFill>
      <Chrome step={4} label="Your Brief" />

      {/* Document plate — off-white card */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1280,
          height: 760,
          transform: `translate(-50%, calc(-50% + ${interpolate(sheetIn, [0, 1], [40, 0])}px))`,
          opacity: sheetIn,
          background: COLORS.cream,
          boxShadow: "0 40px 100px -30px rgba(26,26,26,0.35), 0 12px 30px -12px rgba(26,26,26,0.2)",
          padding: "72px 88px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* sheet header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Reveal delay={8}>
            <div
              style={{
                fontFamily: BODY,
                fontSize: 11,
                letterSpacing: "0.42em",
                textTransform: "uppercase",
                color: COLORS.charcoal,
                opacity: 0.55,
              }}
            >
              Style Brief · No. 0042
            </div>
          </Reveal>
          <Reveal delay={10}>
            <div
              style={{
                fontFamily: BODY,
                fontSize: 11,
                letterSpacing: "0.42em",
                textTransform: "uppercase",
                color: COLORS.charcoal,
                opacity: 0.55,
              }}
            >
              Prepared by Eclectic Hive
            </div>
          </Reveal>
        </div>

        <div
          style={{
            marginTop: 24,
            height: 1,
            background: `${COLORS.charcoal}33`,
            transform: `scaleX(${interpolate(
              spring({ frame: frame - 6, fps, config: { damping: 22, stiffness: 80 } }),
              [0, 1],
              [0, 1],
            )})`,
            transformOrigin: "left",
          }}
        />

        {/* Title */}
        <div style={{ marginTop: 36 }}>
          <Reveal delay={14}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 88,
                lineHeight: 0.95,
                fontWeight: 300,
                color: COLORS.charcoal,
                letterSpacing: "-0.01em",
              }}
            >
              The <em style={{ fontStyle: "italic", fontWeight: 400 }}>Ridgeline</em>
              <br />
              Dinner.
            </div>
          </Reveal>
        </div>

        {/* Spec list */}
        <div
          style={{
            marginTop: 44,
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            rowGap: 14,
            columnGap: 24,
            color: COLORS.charcoal,
          }}
        >
          {LINES.flatMap((l, i) => [
            <Reveal key={`k-${l.label}`} delay={28 + i * 8}>
              <div
                style={{
                  fontFamily: BODY,
                  fontSize: 11,
                  letterSpacing: "0.34em",
                  textTransform: "uppercase",
                  opacity: 0.55,
                  paddingTop: 6,
                }}
              >
                {l.label}
              </div>
            </Reveal>,
            <Reveal key={`v-${l.label}`} delay={30 + i * 8}>
              <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 400 }}>{l.value}</div>
            </Reveal>,
          ])}
        </div>

        {/* Palette band */}
        <Reveal delay={84}>
          <div style={{ marginTop: 44 }}>
            <div
              style={{
                fontFamily: BODY,
                fontSize: 11,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                opacity: 0.55,
                marginBottom: 12,
                color: COLORS.charcoal,
              }}
            >
              Palette
            </div>
            <div style={{ display: "flex", gap: 6, height: 44 }}>
              {SAMPLE_PALETTE.map((hex, i) => {
                const sp = spring({
                  frame: frame - (94 + i * 3),
                  fps,
                  config: { damping: 16, stiffness: 140 },
                });
                return (
                  <div
                    key={hex}
                    style={{
                      flex: 1,
                      background: hex,
                      transform: `scaleY(${interpolate(sp, [0, 1], [0.2, 1])})`,
                      transformOrigin: "top",
                      opacity: interpolate(sp, [0, 1], [0, 1]),
                    }}
                  />
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* signature row */}
        <Reveal delay={120}>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              paddingTop: 24,
              borderTop: `1px solid ${COLORS.charcoal}22`,
            }}
          >
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 22,
                fontStyle: "italic",
                color: COLORS.charcoal,
                opacity: 0.85,
              }}
            >
              — the brief, ready to send
            </div>
            <div
              style={{
                fontFamily: BODY,
                fontSize: 11,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: COLORS.charcoal,
                opacity: 0.55,
              }}
            >
              06 Pinned Pieces
            </div>
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

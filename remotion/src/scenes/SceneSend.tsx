import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { Chrome } from "../components/Chrome";

// SCENE 05 — SENT. Vertical 1080×1920.
// A miniature brief card sits center, then slides up + away into an "INBOX"
// envelope slot at top. Whoosh trail. Then "Sent." cracks into existence with
// a checkmark seal. Tagline + footer follow.

const SCENE_LEN = 234;
const FLY_START = 40;
const FLY_END = 100;
const SENT_IN = 105;
const TAGLINE_IN = 160;
const FOOTER_IN = 190;

export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // brief mini settling
  const settleSp = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 120 } });
  const settleY = interpolate(settleSp, [0, 1], [80, 0]);
  const settleOp = interpolate(settleSp, [0, 1], [0, 1]);

  // fly into inbox
  const flyT = interpolate(frame, [FLY_START, FLY_END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flyEase = flyT * flyT * (3 - 2 * flyT);
  // path: brief sits center (540, 1100) → flies to inbox slot (540, 380), shrinks
  const briefX = 540;
  const briefY = interpolate(flyEase, [0, 1], [1100, 380]);
  const briefScale = interpolate(flyEase, [0, 1], [1, 0.18]);
  const briefRot = interpolate(flyEase, [0, 0.6, 1], [0, -4, -12]);
  const briefOpFly = interpolate(flyT, [0.7, 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // inbox appear
  const inboxSp = spring({ frame: frame - (FLY_START - 8), fps, config: { damping: 22, stiffness: 120 } });
  const inboxOp = interpolate(inboxSp, [0, 1], [0, 1]);
  const inboxY = interpolate(inboxSp, [0, 1], [-20, 0]);

  // inbox flash when accepted
  const flashT = interpolate(frame, [FLY_END - 4, FLY_END + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flashOp = interpolate(flashT, [0, 0.5, 1], [0, 1, 0]);

  // SENT.
  const sentSp = spring({ frame: frame - SENT_IN, fps, config: { damping: 14, stiffness: 110 } });
  const sentOp = interpolate(sentSp, [0, 1], [0, 1]);
  const sentY = interpolate(sentSp, [0, 1], [24, 0]);
  const sentZoom = interpolate(frame, [SENT_IN, SCENE_LEN], [1.0, 1.04]);

  // checkmark seal — radial reveal
  const sealSp = spring({ frame: frame - (SENT_IN + 16), fps, config: { damping: 16, stiffness: 200 } });
  const sealScale = interpolate(sealSp, [0, 0.5, 1], [0, 1.18, 1]);
  const sealOp = interpolate(sealSp, [0, 0.3, 1], [0, 1, 1]);

  const taglineOp = interpolate(frame, [TAGLINE_IN, TAGLINE_IN + 24], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footerOp = interpolate(frame, [FOOTER_IN, FOOTER_IN + 24], [0, 0.65], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <Chrome step={5} label="Sent" />

      {/* Inbox slot at top */}
      <div
        style={{
          position: "absolute",
          left: 340, top: 320 + inboxY,
          width: 400, height: 120,
          opacity: inboxOp,
          background: COLORS.cream,
          border: `1px solid ${COLORS.charcoal}`,
          padding: 18,
          boxShadow: "0 24px 56px -24px rgba(26,26,26,0.4)",
        }}
      >
        <div style={{ color: COLORS.charcoal, opacity: 0.5, fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase" }}>
          Inbox · The Hive
        </div>
        <div style={{ marginTop: 12, color: COLORS.charcoal, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 32, fontWeight: 400 }}>
          New Style Brief
        </div>
        {/* slot mouth */}
        <div style={{ position: "absolute", left: 18, right: 18, bottom: 0, height: 4, background: COLORS.charcoal, opacity: 0.4 }} />
        {/* flash */}
        <div style={{ position: "absolute", inset: 0, background: COLORS.charcoal, opacity: flashOp * 0.12, pointerEvents: "none" }} />
      </div>

      {/* Brief mini that flies */}
      {briefOpFly > 0 && (
        <div
          style={{
            position: "absolute",
            left: briefX - 180,
            top: briefY - 240 + settleY,
            width: 360,
            height: 480,
            opacity: settleOp * briefOpFly,
            transform: `scale(${briefScale}) rotate(${briefRot}deg)`,
            transformOrigin: "50% 50%",
            background: "#FBF7EE",
            boxShadow: "0 40px 90px -28px rgba(26,26,26,0.5)",
            padding: 24,
            border: `1px solid ${COLORS.charcoal}22`,
          }}
        >
          <div style={{ color: COLORS.charcoal, opacity: 0.5, fontFamily: BODY, fontSize: 9, letterSpacing: "0.42em", textTransform: "uppercase" }}>
            Style Brief · No. 0042
          </div>
          <div style={{ marginTop: 18, color: COLORS.charcoal, fontFamily: DISPLAY, fontSize: 44, lineHeight: 0.95, fontWeight: 300 }}>
            The <em style={{ fontStyle: "italic", fontWeight: 400 }}>Ridgeline</em><br />Dinner.
          </div>
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {["#FAF4DC","#E9D7B3","#D2B99B","#B6A28B","#997E63","#A46539","#6B5745","#543C23"].map((c, i) => (
              <div key={i} style={{ height: 22, background: c }} />
            ))}
          </div>
          <div style={{ marginTop: 16, color: COLORS.charcoal, opacity: 0.55, fontFamily: BODY, fontSize: 9, letterSpacing: "0.34em", textTransform: "uppercase" }}>
            08 Pinned · Late-Summer Dinner · 64 Guests
          </div>
        </div>
      )}

      {/* whoosh trail — three lines that briefly trail the brief */}
      {flyT > 0.15 && flyT < 0.95 && [0, 1, 2].map((i) => {
        const dx = interpolate(flyT, [0, 1], [0, 0]);
        const opT = interpolate(flyT, [0.15, 0.5, 0.95], [0, 0.5, 0]);
        const lineY = 1100 - (1100 - briefY) * Math.max(0, flyT - 0.05) + i * 18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: briefX - 80 + dx,
              top: lineY,
              width: 160 - i * 30,
              height: 1,
              background: COLORS.charcoal,
              opacity: opT * (0.45 - i * 0.1),
            }}
          />
        );
      })}

      {/* SENT. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", transform: `scale(${sentZoom})` }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              width: 88, height: 88, borderRadius: "50%",
              background: COLORS.charcoal, color: COLORS.cream,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: BODY, fontSize: 42, fontWeight: 300,
              opacity: sealOp,
              transform: `scale(${sealScale})`,
            }}
          >
            ✓
          </div>
          <div
            style={{
              color: COLORS.charcoal,
              fontFamily: DISPLAY,
              fontSize: 180,
              fontWeight: 300,
              letterSpacing: "0.01em",
              lineHeight: 1.0,
              opacity: sentOp,
              transform: `translateY(${sentY}px)`,
            }}
          >
            <em style={{ fontStyle: "italic", fontWeight: 400 }}>Sent.</em>
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 36,
            fontStyle: "italic",
            fontWeight: 400,
            opacity: taglineOp,
            lineHeight: 1.3,
            padding: "0 56px",
          }}
        >
          From inspo to inventory<br />in five minutes.
        </div>

        <div
          style={{
            marginTop: 64,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 22,
            opacity: footerOp,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            Eclectic Hive
          </span>
          <span style={{ width: 60, height: 1, background: COLORS.charcoal, opacity: 0.5 }} />
          <span style={{ fontFamily: BODY, fontSize: 12, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            eclectichive.com
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

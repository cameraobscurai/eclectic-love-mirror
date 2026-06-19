import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { COLORS, REAL_PALETTE } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard } from "../components/IndexCard";

// SCENE 05 — SENT. Send press → confirmation → "Sent." blur-in →
// Ken Burns push + vignette + chrome fade. Last frame is composed, not abandoned.

const SCENE_LEN = 240;
const BTN_PRESS = 14;
const CONFIRM_AT = 34;
const SENT_AT = 56;
const UNDERLINE_AT = SENT_AT + 14;
const KENBURNS_AT = 140;
const TAGLINE_AT = KENBURNS_AT;
const FINAL_HOLD = 220;

export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pre-payoff camera: 1.02 → 1.0 over first 60f. Then Ken Burns 1.0 → 1.08
  // from KENBURNS_AT → KENBURNS_AT+80.
  const preCam = interpolate(frame, [0, 60], [1.02, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const kbCam = interpolate(frame, [KENBURNS_AT, KENBURNS_AT + 80], [1.0, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const cameraScale = frame < KENBURNS_AT ? preCam : kbCam;

  // Chrome fade — STEP row dims as we push in
  const chromeOp = interpolate(frame, [KENBURNS_AT, KENBURNS_AT + 40], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Vignette
  const vigOp = interpolate(frame, [KENBURNS_AT, KENBURNS_AT + 50], [0, 0.18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Button — pressed, then collapses into the checkmark/confirm
  const btnVisible = frame < CONFIRM_AT;
  const btnPressed = frame >= BTN_PRESS && frame < CONFIRM_AT;
  const btnOp = interpolate(frame, [CONFIRM_AT - 4, CONFIRM_AT], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // confirm checkmark
  const confSp = spring({ frame: frame - CONFIRM_AT, fps, config: { damping: 14, stiffness: 180 } });
  const confScale = interpolate(confSp, [0, 0.5, 1], [0, 1.18, 1]);
  const confOp = interpolate(confSp, [0, 0.4, 1], [0, 1, 1]);
  // confirmation also fades during Ken Burns
  const confFade = interpolate(frame, [KENBURNS_AT, KENBURNS_AT + 30], [1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "Sent." — blur in + scale settle
  const sentP = interpolate(frame, [SENT_AT, SENT_AT + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0.7, 0.2, 1) });
  const sentOp = sentP;
  const sentBlur = interpolate(sentP, [0, 1], [14, 0]);
  const sentScale = interpolate(sentP, [0, 1], [1.06, 1.0]);

  // Tagline rises during Ken Burns
  const tagP = interpolate(frame, [TAGLINE_AT, TAGLINE_AT + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const tagOp = tagP * 0.78;
  const tagY = interpolate(tagP, [0, 1], [24, 0]);

  // Palette ghost band rises in
  const ghostOp = interpolate(frame, [SENT_AT + 8, SENT_AT + 40], [0, 0.09], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Underline under Sent.
  const ulP = interpolate(frame, [UNDERLINE_AT, UNDERLINE_AT + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.4, 0, 0.2, 1) });

  return (
    <AbsoluteFill>
      <IndexCard
        step={5}
        label="Sent"
        subtitle="Your brief is on its way."
        sceneLen={SCENE_LEN}
        chromeOpacity={chromeOp}
        cameraScale={cameraScale}
        cameraOriginY={42}
        noOutFade
      >
        {/* meta row */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: 0,
            display: "flex", justifyContent: "space-between",
            color: COLORS.charcoal, opacity: 0.5 * chromeOp,
            fontFamily: BODY, fontSize: 12, letterSpacing: "0.34em", textTransform: "uppercase",
          }}
        >
          <span>Confirmation · 09:42 MT</span>
          <span>To · studio@eclectichive.com</span>
        </div>

        {/* SEND button */}
        {btnVisible && (
          <div
            style={{
              position: "absolute",
              left: 0, top: 80,
              opacity: btnOp,
              background: COLORS.charcoal,
              color: COLORS.cream,
              padding: "22px 40px",
              fontFamily: BODY,
              fontSize: 14,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              transform: btnPressed ? "translateY(2px)" : "translateY(0)",
            }}
          >
            Send Style Brief
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="1.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* confirmation */}
        <div
          style={{
            position: "absolute",
            left: 0, top: 80,
            opacity: confOp * confFade,
            transform: `scale(${confScale})`,
            transformOrigin: "0 50%",
            display: "flex",
            alignItems: "center",
            gap: 20,
            color: COLORS.charcoal,
            fontFamily: BODY,
            fontSize: 14,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 40, height: 40,
              border: `1.5px solid ${COLORS.charcoal}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.charcoal} strokeWidth="2">
              <path d="M4 12l5 5L20 6" />
            </svg>
          </div>
          Received
        </div>

        {/* Sent. — blur-in italic centerpiece */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, top: 380,
            textAlign: "center",
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 340,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            opacity: sentOp,
            filter: `blur(${sentBlur}px)`,
            transform: `scale(${sentScale})`,
            transformOrigin: "50% 50%",
          }}
        >
          <em style={{ fontStyle: "italic" }}>Sent.</em>
        </div>

        {/* underline under Sent. — centered draw */}
        <div
          style={{
            position: "absolute",
            left: "50%", top: 720,
            transform: "translateX(-50%)",
            width: `${ulP * 320}px`,
            height: 1,
            background: COLORS.rule,
          }}
        />

        {/* tagline — rises during Ken Burns */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, top: 770,
            textAlign: "center",
            color: COLORS.charcoal,
            opacity: tagOp,
            fontFamily: BODY,
            fontSize: 13,
            letterSpacing: "0.36em",
            textTransform: "uppercase",
            transform: `translateY(${tagY}px)`,
          }}
        >
          A producer will reach out within one business day.
        </div>

        {/* palette ghost band — brief's color DNA */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, bottom: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${REAL_PALETTE.length}, 1fr)`,
            height: 56,
            opacity: ghostOp,
          }}
        >
          {REAL_PALETTE.map((sw, i) => (
            <div key={i} style={{ background: sw.hex }} />
          ))}
        </div>
      </IndexCard>

      {/* vignette — outside IndexCard so it covers the whole frame */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 60%, rgba(26,26,26,1) 115%)",
          opacity: vigOp,
          pointerEvents: "none",
        }}
      />
      <FinalHoldGuard frame={frame} />
    </AbsoluteFill>
  );
};

// no-op component to keep TS happy if we want to add a final flourish later
const FinalHoldGuard: React.FC<{ frame: number }> = () => null;

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard } from "../components/IndexCard";

// SCENE 05 — SENT. The site's quiet payoff. Black "SEND" button transitions
// to confirmation. Big italic "Sent." centered. Generous whitespace.

const SCENE_LEN = 240;
const BTN_PRESS = 14;
const CONFIRM_AT = 34;
const SENT_AT = 56;
const TAGLINE_AT = 110;

export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Button — pressed, then collapses into the checkmark/confirm
  const btnVisible = frame < CONFIRM_AT;
  const btnPressed = frame >= BTN_PRESS && frame < CONFIRM_AT;
  const btnOp = interpolate(frame, [CONFIRM_AT - 4, CONFIRM_AT], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // confirm checkmark
  const confSp = spring({ frame: frame - CONFIRM_AT, fps, config: { damping: 14, stiffness: 180 } });
  const confScale = interpolate(confSp, [0, 0.5, 1], [0, 1.18, 1]);
  const confOp = interpolate(confSp, [0, 0.4, 1], [0, 1, 1]);

  // Sent. italic
  const sentSp = spring({ frame: frame - SENT_AT, fps, config: { damping: 22, stiffness: 110 } });
  const sentOp = interpolate(sentSp, [0, 1], [0, 1]);
  const sentY = interpolate(sentSp, [0, 1], [16, 0]);

  // tagline
  const tagSp = spring({ frame: frame - TAGLINE_AT, fps, config: { damping: 24, stiffness: 110 } });
  const tagOp = interpolate(tagSp, [0, 1], [0, 0.75]);
  const tagY = interpolate(tagSp, [0, 1], [10, 0]);

  return (
    <AbsoluteFill>
      <IndexCard step={5} label="Sent" subtitle="Your brief is on its way." sceneLen={SCENE_LEN}>
        {/* timestamp */}
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: 0,
            display: "flex", justifyContent: "space-between",
            color: COLORS.charcoal, opacity: 0.5,
            fontFamily: BODY, fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
          }}
        >
          <span>Confirmation · 09:42 MT</span>
          <span>To · studio@eclectichive.com</span>
        </div>

        {/* SEND button (site-style black bar) — shown briefly then dissolves */}
        {btnVisible && (
          <div
            style={{
              position: "absolute",
              left: 0, top: 100,
              opacity: btnOp,
              background: COLORS.charcoal,
              color: COLORS.cream,
              padding: "20px 36px",
              fontFamily: BODY,
              fontSize: 14,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              transform: btnPressed ? "translateY(2px)" : "translateY(0)",
            }}
          >
            Send Your Brief
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="1.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        )}

        {/* confirmation checkmark — replaces button */}
        <div
          style={{
            position: "absolute",
            left: 0, top: 100,
            opacity: confOp,
            transform: `scale(${confScale})`,
            transformOrigin: "0 50%",
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: COLORS.charcoal,
            fontFamily: BODY,
            fontSize: 14,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 38, height: 38,
              border: `1.5px solid ${COLORS.charcoal}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.charcoal} strokeWidth="2">
              <path d="M4 12l5 5L20 6" />
            </svg>
          </div>
          Received by the Hive
        </div>

        {/* Sent. italic centerpiece */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, top: 380,
            textAlign: "center",
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 280,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            opacity: sentOp,
            transform: `translateY(${sentY}px)`,
          }}
        >
          <em style={{ fontStyle: "italic" }}>Sent.</em>
        </div>

        {/* tagline */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, top: 760,
            textAlign: "center",
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontSize: 38,
            lineHeight: 1.3,
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
          }}
        >
          From inspo to inventory<br />in five minutes.
        </div>

        {/* small return note */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, top: 900,
            textAlign: "center",
            color: COLORS.charcoal,
            opacity: tagOp * 0.6,
            fontFamily: BODY,
            fontSize: 12,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
          }}
        >
          A producer will reach out within one business day.
        </div>
      </IndexCard>
    </AbsoluteFill>
  );
};

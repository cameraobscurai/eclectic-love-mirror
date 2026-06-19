import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { DISPLAY, BODY } from "../fonts";
import { IndexCard } from "../components/IndexCard";

// SCENE 05 — DELIVERED. The card is now the receipt itself. A checkmark
// stamps in, "Sent." reveals, tagline lands. The card is the message.

const SCENE_LEN = 240;
const STAMP_AT = 24;
const SENT_AT = 38;
const TAGLINE_AT = 90;
const FOOTER_AT = 130;

export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // stamp: scale from 1.6 → 1 with bounce, slight rotate
  const stampSp = spring({ frame: frame - STAMP_AT, fps, config: { damping: 11, stiffness: 180 } });
  const stampScale = interpolate(stampSp, [0, 0.5, 1], [1.8, 1.05, 1]);
  const stampOp = interpolate(stampSp, [0, 0.4, 1], [0, 1, 1]);
  const stampRot = interpolate(stampSp, [0, 1], [-12, -6]);

  const sentSp = spring({ frame: frame - SENT_AT, fps, config: { damping: 16, stiffness: 110 } });
  const sentOp = interpolate(sentSp, [0, 1], [0, 1]);
  const sentY = interpolate(sentSp, [0, 1], [18, 0]);

  const tagSp = spring({ frame: frame - TAGLINE_AT, fps, config: { damping: 22, stiffness: 110 } });
  const tagOp = interpolate(tagSp, [0, 1], [0, 0.9]);
  const tagY = interpolate(tagSp, [0, 1], [12, 0]);

  const footerOp = interpolate(frame, [FOOTER_AT, FOOTER_AT + 22], [0, 0.65], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <IndexCard step={5} label="Delivered" subtitle="Off to the Hive." sceneLen={SCENE_LEN}>
        {/* timestamp top right */}
        <div
          style={{
            position: "absolute", top: 30, right: 32,
            color: COLORS.charcoal, opacity: 0.5,
            fontFamily: BODY, fontSize: 10, letterSpacing: "0.42em", textTransform: "uppercase",
          }}
        >
          09:42 · MT
        </div>

        {/* SENT stamp — top-left, rotated like a real ink stamp */}
        <div
          style={{
            position: "absolute",
            top: 80, left: 70,
            opacity: stampOp,
            transform: `scale(${stampScale}) rotate(${stampRot}deg)`,
            transformOrigin: "0 50%",
            border: `4px solid ${COLORS.charcoal}`,
            padding: "10px 28px",
            color: COLORS.charcoal,
            fontFamily: BODY,
            fontSize: 28,
            letterSpacing: "0.34em",
            fontWeight: 600,
          }}
        >
          RECEIVED
        </div>

        {/* "Sent." — big italic centered */}
        <div
          style={{
            position: "absolute",
            top: 380, left: 0, right: 0,
            textAlign: "center",
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 220,
            fontWeight: 300,
            letterSpacing: "0.01em",
            lineHeight: 1,
            opacity: sentOp,
            transform: `translateY(${sentY}px)`,
          }}
        >
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>Sent.</em>
        </div>

        {/* tagline */}
        <div
          style={{
            position: "absolute",
            top: 680, left: 60, right: 60,
            textAlign: "center",
            color: COLORS.charcoal,
            fontFamily: DISPLAY,
            fontSize: 36,
            fontStyle: "italic",
            fontWeight: 400,
            opacity: tagOp,
            transform: `translateY(${tagY}px)`,
            lineHeight: 1.3,
          }}
        >
          From inspo to inventory<br />in five minutes.
        </div>

        {/* footer — eclectichive.com */}
        <div
          style={{
            position: "absolute",
            bottom: 40, left: 0, right: 0,
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: 18,
            opacity: footerOp,
          }}
        >
          <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            eclectichive.com
          </span>
          <span style={{ width: 40, height: 1, background: COLORS.charcoal, opacity: 0.5 }} />
          <span style={{ fontFamily: BODY, fontSize: 11, letterSpacing: "0.42em", textTransform: "uppercase", color: COLORS.charcoal }}>
            Denver · Mountain West
          </span>
        </div>
      </IndexCard>
    </AbsoluteFill>
  );
};

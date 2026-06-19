import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PHASE, easeIn } from "./camera-path";

// DOM overlay above the WebGL canvas. Holds:
//   • Top-left: route label (changes per phase)
//   • Top-right: timecode
//   • Bottom-left: phase caption
//   • Center (end): ECLECTIC HIVE wordmark + signoff
//
// Type: Cormorant Garamond (display) + JetBrains Mono fallback (HUD/labels)

const mono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const display = "'Cormorant Garamond', 'Times New Roman', serif";

function phaseLabel(frame: number): string {
  if (frame < PHASE.COLD_OPEN_END) return "";
  if (frame < PHASE.BACK_WALL_END) return "/HOME — SEASONAL REEL";
  if (frame < PHASE.TONAL_SORT[0]) return "/COLLECTION — 625 PRODUCTS · 14 CATEGORIES";
  if (frame < PHASE.TONAL_SORT[1]) return "/COLLECTION — SORT · TONAL · 153 INDEXED";
  if (frame < PHASE.MACRO_HOLD[1]) return "/COLLECTION — SEATING · ADELAIDE";
  if (frame < PHASE.TRIPTYCH[1]) return "/ATELIER — IMAGINED · DESIGNED · REALIZED";
  if (frame < PHASE.SWATCH[1]) return "/COLOR — CHAMPAGNE · #C7B6A1 · L 76.7";
  if (frame < PHASE.BRIEF[1]) return "/STYLEBRIEF — DROP · DETECT · SEND";
  return "ECLECTICHIVE.COM";
}

function phaseCaption(frame: number): string {
  if (frame < PHASE.BACK_WALL_END) return "FIVE SEASONS · ONE STAGE";
  if (frame < PHASE.TONAL_SORT[0]) return "EVERY PIECE IN THE BUILDING";
  if (frame < PHASE.TONAL_SORT[1]) return "TAGGED · ORDERED BY HAND";
  if (frame < PHASE.MACRO_HOLD[1]) return "ONE OF 101 CHAIRS";
  if (frame < PHASE.TRIPTYCH[1]) return "THE PROCESS, NOT THE PROMISE";
  if (frame < PHASE.SWATCH[1]) return "COLOR IS A LANGUAGE";
  if (frame < PHASE.BRIEF[1]) return "BUILD A BRIEF IN 30 SECONDS";
  return "RENTAL · STAGING · DESIGN";
}

export const HudOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const tcSec = (frame / fps).toFixed(2);
  const totalSec = (durationInFrames / fps).toFixed(2);

  // Cold open: hairlines draw, type fades up
  const openFade = easeIn(frame, [PHASE.COLD_OPEN_END - 30, PHASE.COLD_OPEN_END + 10]);
  const endFade = easeIn(frame, [PHASE.WORDMARK[0], PHASE.WORDMARK[0] + 40]);

  // Wordmark at end
  const wordmarkOpacity = easeIn(frame, [PHASE.WORDMARK[0] + 40, PHASE.WORDMARK[0] + 90]);

  const hudColor = "rgba(255,255,255,0.78)";
  const hudColorDim = "rgba(255,255,255,0.45)";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Cold open hairlines */}
      {frame < PHASE.COLD_OPEN_END + 60 && (
        <>
          <div style={{
            position: "absolute",
            top: 48,
            left: 96,
            right: 96,
            height: 1,
            background: "rgba(255,255,255,0.18)",
            transformOrigin: "left",
            transform: `scaleX(${easeIn(frame, [10, 70])})`,
          }} />
          <div style={{
            position: "absolute",
            bottom: 48,
            left: 96,
            right: 96,
            height: 1,
            background: "rgba(255,255,255,0.18)",
            transformOrigin: "right",
            transform: `scaleX(${easeIn(frame, [10, 70])})`,
          }} />
        </>
      )}

      {/* Top-left phase label */}
      <div style={{
        position: "absolute",
        top: 64,
        left: 96,
        fontFamily: mono,
        fontSize: 11,
        letterSpacing: "0.22em",
        color: hudColor,
        opacity: openFade * (1 - endFade * 0.8),
      }}>
        {phaseLabel(frame)}
      </div>

      {/* Top-right timecode */}
      <div style={{
        position: "absolute",
        top: 64,
        right: 96,
        fontFamily: mono,
        fontSize: 11,
        letterSpacing: "0.22em",
        color: hudColorDim,
        opacity: openFade * (1 - endFade * 0.8),
      }}>
        {tcSec} / {totalSec}
      </div>

      {/* Bottom-left caption */}
      <div style={{
        position: "absolute",
        bottom: 72,
        left: 96,
        fontFamily: mono,
        fontSize: 11,
        letterSpacing: "0.22em",
        color: hudColor,
        opacity: openFade * (1 - endFade * 0.8),
      }}>
        {phaseCaption(frame)}
      </div>

      {/* Center wordmark on end */}
      {wordmarkOpacity > 0.01 && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: wordmarkOpacity,
        }}>
          <div style={{
            fontFamily: display,
            fontSize: 96,
            letterSpacing: "0.32em",
            color: "rgba(255,255,255,0.92)",
            paddingLeft: "0.32em", // optical centering for tracking
          }}>
            ECLECTIC HIVE
          </div>
          <div style={{
            marginTop: 28,
            width: 220,
            height: 1,
            background: "rgba(255,255,255,0.35)",
          }} />
          <div style={{
            marginTop: 18,
            fontFamily: mono,
            fontSize: 11,
            letterSpacing: "0.34em",
            color: "rgba(255,255,255,0.55)",
          }}>
            RENTAL · STAGING · DESIGN
          </div>
          <div style={{
            marginTop: 36,
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "rgba(255,255,255,0.35)",
          }}>
            ECLECTICHIVE.COM
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

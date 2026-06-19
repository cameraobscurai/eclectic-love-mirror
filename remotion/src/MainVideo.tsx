import { AbsoluteFill, Sequence } from "remotion";
import { PaperBackground } from "./components/PaperBackground";
import { SceneDrop } from "./scenes/SceneDrop";
import { ScenePin } from "./scenes/ScenePin";
import { ScenePalette } from "./scenes/ScenePalette";
import { SceneBrief } from "./scenes/SceneBrief";
import { SceneSend } from "./scenes/SceneSend";

// Per-scene timing with custom outros baked into each scene component:
//   S1 Drop      0   → 150   (24f outro: scale 1→1.04 + fade)
//   S2 Pin     126   → 296   (24f overlap with S1; 1f color bridge at end)
//   S3 Palette 296   → 464   (amber bridge intro; white outro 30f)
//   S4 Brief   446   → 616   (18f overlap with S3 white hold; 24f outro)
//   S5 Send    592   → 760   (24f overlap with S4)
//
// Each scene self-animates its entry & exit (crossfades aren't enough — the
// boundaries themselves are the editorial moment).

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperBackground />

      <Sequence from={0}   durationInFrames={150}><SceneDrop /></Sequence>
      <Sequence from={126} durationInFrames={170}><ScenePin /></Sequence>
      <Sequence from={296} durationInFrames={168}><ScenePalette /></Sequence>
      <Sequence from={446} durationInFrames={170}><SceneBrief /></Sequence>
      <Sequence from={592} durationInFrames={168}><SceneSend /></Sequence>
    </AbsoluteFill>
  );
};

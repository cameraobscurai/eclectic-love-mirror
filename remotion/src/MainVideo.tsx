import { AbsoluteFill, Sequence } from "remotion";
import { PaperBackground } from "./components/PaperBackground";
import { SceneDrop } from "./scenes/SceneDrop";
import { ScenePin } from "./scenes/ScenePin";
import { ScenePalette } from "./scenes/ScenePalette";
import { SceneBrief } from "./scenes/SceneBrief";
import { SceneSend } from "./scenes/SceneSend";

// Story arc — 5 scenes, ~34s total.
//   S1 DROP    0   → 186   (6.2s)  Drag inspo photos into upload zone.
//   S2 PIN    162  → 372   (7.0s, 24f overlap)  Tap pieces from collection.
//   S3 PALETTE 348 → 576   (7.6s, 24f overlap)  Extract from all 13 sources.
//   S4 BRIEF  552  → 810   (8.6s, 24f overlap)  Auto-compose the document.
//   S5 SEND   786  → 1020  (7.8s, 24f overlap)  Fly to inbox. Sent.
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperBackground />

      <Sequence from={0}   durationInFrames={186}><SceneDrop /></Sequence>
      <Sequence from={162} durationInFrames={210}><ScenePin /></Sequence>
      <Sequence from={348} durationInFrames={228}><ScenePalette /></Sequence>
      <Sequence from={552} durationInFrames={258}><SceneBrief /></Sequence>
      <Sequence from={786} durationInFrames={234}><SceneSend /></Sequence>
    </AbsoluteFill>
  );
};

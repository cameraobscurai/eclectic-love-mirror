import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { PaperBackground } from "./components/PaperBackground";
import { Chrome } from "./components/Chrome";
import { StepStack } from "./components/StepStack";
import { SceneDrop } from "./scenes/SceneDrop";
import { ScenePin } from "./scenes/ScenePin";
import { ScenePalette } from "./scenes/ScenePalette";
import { SceneBrief } from "./scenes/SceneBrief";
import { SceneSend } from "./scenes/SceneSend";

// 34s @ 30fps vertical 9:16. Every scene = one card in the stack.
// Sequences overlap 30f so each outgoing card visibly hands off to the next.
//   S1 INSPO       0   → 186
//   S2 INVENTORY  156  → 372
//   S3 PALETTE    342  → 582
//   S4 BRIEF      552  → 810
//   S5 DELIVERED  780  → 1020
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperBackground />
      <Chrome />

      <Sequence from={0}   durationInFrames={186}><SceneDrop /></Sequence>
      <Sequence from={156} durationInFrames={216}><ScenePin /></Sequence>
      <Sequence from={342} durationInFrames={240}><ScenePalette /></Sequence>
      <Sequence from={552} durationInFrames={258}><SceneBrief /></Sequence>
      <Sequence from={780} durationInFrames={240}><SceneSend /></Sequence>

      <ActiveStep />
    </AbsoluteFill>
  );
};

const ActiveStep: React.FC = () => {
  const frame = useCurrentFrame();
  let active: 1 | 2 | 3 | 4 | 5 = 1;
  if (frame >= 171) active = 2;
  if (frame >= 357) active = 3;
  if (frame >= 567) active = 4;
  if (frame >= 795) active = 5;
  return <StepStack active={active} />;
};

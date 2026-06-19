import { AbsoluteFill } from "remotion";
import { PaperBackground } from "./components/PaperBackground";
import { Chrome } from "./components/Chrome";
import { StepStack } from "./components/StepStack";
import { SceneDrop } from "./scenes/SceneDrop";
import { ScenePin } from "./scenes/ScenePin";
import { ScenePalette } from "./scenes/ScenePalette";
import { SceneBrief } from "./scenes/SceneBrief";
import { SceneSend } from "./scenes/SceneSend";
import { Sequence } from "remotion";

// 34s @ 30fps vertical 9:16. Every scene = one card in the stack.
// Sequences overlap 30f so the outgoing card visibly hands off to the next.
//   S1 INSPO       0   → 186
//   S2 INVENTORY  156  → 372  (30f overlap)
//   S3 PALETTE    342  → 582  (30f overlap)
//   S4 BRIEF      552  → 810  (30f overlap)
//   S5 DELIVERED  780  → 1020 (30f overlap)
export const MainVideo: React.FC = () => {
  // Track active step for the persistent StepStack
  return (
    <AbsoluteFill>
      <PaperBackground />
      <Chrome />

      <Sequence from={0}   durationInFrames={186}><SceneDrop /></Sequence>
      <Sequence from={156} durationInFrames={216}><ScenePin /></Sequence>
      <Sequence from={342} durationInFrames={240}><ScenePalette /></Sequence>
      <Sequence from={552} durationInFrames={258}><SceneBrief /></Sequence>
      <Sequence from={780} durationInFrames={240}><SceneSend /></Sequence>

      {/* Persistent step indicator — knows nothing about scenes, just frame */}
      <StepStackByFrame />
    </AbsoluteFill>
  );
};

// Stack outside any sequence so it tracks the global timeline.
const StepStackByFrame: React.FC = () => {
  // Determine active step by frame band. Use the MIDPOINT of each scene
  // (not the overlap) so the pill changes at the moment of card hand-off.
  return <StepStackResolver />;
};

const StepStackResolver: React.FC = () => {
  // Inline to keep imports tidy
  const { useCurrentFrame } = require("remotion") as typeof import("remotion");
  const frame = useCurrentFrame();
  let active: 1 | 2 | 3 | 4 | 5 = 1;
  if (frame >= 171) active = 2;
  if (frame >= 357) active = 3;
  if (frame >= 567) active = 4;
  if (frame >= 795) active = 5;
  return <StepStack active={active} />;
};

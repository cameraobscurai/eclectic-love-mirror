import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { PaperBackground } from "./components/PaperBackground";
import { Chrome } from "./components/Chrome";
import { StepStack } from "./components/StepStack";
import { SceneDrop } from "./scenes/SceneDrop";
import { ScenePin } from "./scenes/ScenePin";
import { ScenePalette } from "./scenes/ScenePalette";
import { SceneBrief } from "./scenes/SceneBrief";
import { SceneSend } from "./scenes/SceneSend";

// 37s @ 30fps vertical 9:16. Brief gets real dwell before Send.
//   S1 INSPO       0   → 186
//   S2 INVENTORY  156  → 372
//   S3 PALETTE    342  → 582
//   S4 BRIEF      552  → 912    (assembly + composed hold + 42f lift outro)
//   S5 DELIVERED  858  → 1110   (rises under the lift for 54f overlap)
...
      <Sequence from={552} durationInFrames={360}><SceneBrief /></Sequence>
      <Sequence from={858} durationInFrames={252}><SceneSend /></Sequence>

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
  if (frame >= 885) active = 5;
  return <StepStack active={active} />;
};

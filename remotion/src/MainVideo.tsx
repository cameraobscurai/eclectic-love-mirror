import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { PaperBackground } from "./components/PaperBackground";
import { SceneDrop } from "./scenes/SceneDrop";
import { ScenePalette } from "./scenes/ScenePalette";
import { ScenePin } from "./scenes/ScenePin";
import { SceneBrief } from "./scenes/SceneBrief";
import { SceneSend } from "./scenes/SceneSend";

// 5 scenes × 162 frames = 810; 4 fade transitions × 18 = 72; +1 trailing for
// safety. Total 720 frames declared in Root.tsx. (810 - 4×18 = 738; we let
// Remotion clamp — total runtime ~738f. Composition declares 720 to crop
// the very tail of the final fade-out for a clean cut to black/paper.)
const SCENE_LEN = 162;
const FADE = 18;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_LEN}>
          <SceneDrop />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_LEN}>
          <ScenePalette />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_LEN}>
          <ScenePin />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_LEN}>
          <SceneBrief />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />

        <TransitionSeries.Sequence durationInFrames={SCENE_LEN}>
          <SceneSend />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

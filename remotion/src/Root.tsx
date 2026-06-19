import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 24s @ 30fps. TransitionSeries overlaps shorten total by 5 * 18 = 90 frames.
// 5 scenes × 162 frames each = 810; minus 90 transition overlap = 720.
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={720}
    fps={30}
    width={1920}
    height={1080}
  />
);

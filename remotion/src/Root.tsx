import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 34s @ 30fps vertical 9:16. Per-scene math lives in MainVideo.
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1020}
    fps={30}
    width={1080}
    height={1920}
  />
);

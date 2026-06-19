import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { WideVideo } from "./WideVideo";

// 37s @ 30fps. Brief scene gets ~4s of dwell before Send begins.
export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={1110}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="main-wide"
      component={WideVideo}
      durationInFrames={1110}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);

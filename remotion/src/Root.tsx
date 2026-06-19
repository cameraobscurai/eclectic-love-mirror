import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { WideVideo } from "./WideVideo";

// 34s @ 30fps. Two deliverables share the same scene timeline.
export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={1020}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="main-wide"
      component={WideVideo}
      durationInFrames={1020}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);

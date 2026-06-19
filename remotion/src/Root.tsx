import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { WideVideo } from "./WideVideo";
import { SiteReel } from "./SiteReel";

// v10 = stylebrief workflow. v11 = full-site cinematic reel.
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
    <Composition
      id="site-reel"
      component={SiteReel}
      durationInFrames={1620}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);


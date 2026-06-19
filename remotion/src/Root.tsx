import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { WideVideo } from "./WideVideo";
import { SiteReel } from "./SiteReel";
import { SmokeTest } from "./v12/SmokeTest";
import { SiteReelV12 } from "./v12/SiteReelV12";

// v10 = stylebrief workflow. v11 = full-site reel. v12 = one-take 3D camera.
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
    <Composition
      id="smoke-3d"
      component={SmokeTest}
      durationInFrames={60}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="onetake-v12"
      component={SiteReelV12}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);




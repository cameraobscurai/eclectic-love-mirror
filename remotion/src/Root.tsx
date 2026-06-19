import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// ~26s @ 30fps. Per-scene HOLD time is what fixes the "cut-off" feel —
// not longer scenes. See MainVideo for per-scene + transition math.
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={780}
    fps={30}
    width={1920}
    height={1080}
  />
);

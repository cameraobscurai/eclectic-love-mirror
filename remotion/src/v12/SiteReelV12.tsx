import React, { Suspense } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { cameraAt, handheld, easeIn, PHASE } from "./camera-path";
import { ProductField } from "./ProductField";
import { BackWall } from "./BackWall";
import { AtelierPanels } from "./AtelierPanels";
import { SwatchTunnel, Floor, WordmarkPlane } from "./SwatchTunnel";
import { LensStack } from "./LensStack";
import { HudOverlay } from "./HudOverlay";

// CameraRig — drives PerspectiveCamera position + lookAt from frame
const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const { pos, look } = cameraAt(frame);
  const hh = handheld(frame);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(pos[0] + hh[0], pos[1] + hh[1], pos[2] + hh[2]);
  cam.lookAt(look[0], look[1], look[2]);
  // Subtle FOV breathing: tighter on macro hold, wider on field
  const baseFov = 35;
  const fov = baseFov
    + easeIn(frame, [PHASE.MACRO_HOLD[0] - 40, PHASE.MACRO_HOLD[0]]) * -8
    + easeIn(frame, [PHASE.MACRO_HOLD[1], PHASE.MACRO_HOLD[1] + 60]) * 8;
  cam.fov = fov;
  cam.updateProjectionMatrix();
  return null;
};

// Cold-open black overlay
const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = 1 - easeIn(frame, [40, PHASE.COLD_OPEN_END]);
  if (opacity <= 0.001) return null;
  return (
    <AbsoluteFill style={{ background: "#0a0a0a", opacity, pointerEvents: "none" }} />
  );
};

// End-fade overlay (to charcoal)
const EndFade: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeIn(frame, [PHASE.WORDMARK[0] - 30, PHASE.WORDMARK[0] + 20]);
  if (opacity <= 0.001) return null;
  return (
    <AbsoluteFill style={{ background: "#0a0a0a", opacity, pointerEvents: "none", zIndex: 5 }} />
  );
};

export const SiteReelV12: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 14], fov: 35, near: 0.1, far: 200 }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", 28, 80]} />
        <ambientLight intensity={1.0} />
        <CameraRig />
        <BackWall />
        <Floor />
        <ProductField />
        <AtelierPanels />
        <SwatchTunnel />
        <WordmarkPlane />
      </ThreeCanvas>
      <ColdOpen />
      <EndFade />
      <HudOverlay />
    </AbsoluteFill>
  );
};

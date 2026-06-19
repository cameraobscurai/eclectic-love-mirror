import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { useRemotionTexture } from "./useRemotionTexture";

const Card: React.FC = () => {
  const url = staticFile("v11/products/adelaide-antique-arm-chair-2970.png");
  const tex = useRemotionTexture(url);
  console.log("[smoke] tex:", tex ? "loaded" : "null");
  if (!tex) return null;
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
    </mesh>
  );
};

export const SmokeTex: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  void frame;
  return (
    <AbsoluteFill style={{ background: "#222" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 5], fov: 50 }}>
        <color attach="background" args={["#222"]} />
        <ambientLight intensity={1} />
        <Card />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

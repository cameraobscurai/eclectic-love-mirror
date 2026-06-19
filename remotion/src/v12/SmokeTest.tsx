import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";

const Spinner: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <mesh rotation={[0.4, frame * 0.05, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#d4cdc4" />
    </mesh>
  );
};

export const SmokeTest: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#1a1a1a" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 35 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Spinner />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

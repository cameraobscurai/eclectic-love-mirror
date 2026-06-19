import React from "react";
import { useCurrentFrame, staticFile } from "remotion";
import { useRemotionTexture } from "./useRemotionTexture";
import * as THREE from "three";
import manifest from "../v11-manifest.json";
import { PHASE, easeIn } from "./camera-path";

// 3 triptych panels living in space at X = 6..14, Z = -3..-6
// Camera path tracks RIGHT past them during PHASE.TRIPTYCH

const atelier = manifest.atelier as Record<string, string>;
const PANELS = [
  { file: atelier["sketch-drape"] ?? atelier["workbench-sketch"], label: "IMAGINED" },
  { file: atelier["collage"] ?? atelier["studio-collage"], label: "DESIGNED" },
  { file: atelier["realized-aspen"] ?? atelier["hero"], label: "REALIZED" },
];

interface PanelProps {
  file: string;
  x: number;
  z: number;
  opacity: number;
}

const Panel: React.FC<PanelProps> = ({ file, x, z, opacity }) => {
  const texture = useRemotionTexture(staticFile(file));
  if (!texture) return null;
  // Panels are tall, ~3:4 aspect
  return (
    <mesh position={[x, 0, z]}>
      <planeGeometry args={[3.6, 4.8]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
};

export const AtelierPanels: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeIn(frame, [PHASE.TRIPTYCH[0] - 40, PHASE.TRIPTYCH[0] + 40])
    * (1 - easeIn(frame, [PHASE.TRIPTYCH[1] - 40, PHASE.TRIPTYCH[1] + 40]));

  return (
    <group>
      <Panel file={PANELS[0].file} x={8}  z={-4} opacity={opacity} />
      <Panel file={PANELS[1].file} x={12} z={-3} opacity={opacity} />
      <Panel file={PANELS[2].file} x={16} z={-4} opacity={opacity} />
    </group>
  );
};

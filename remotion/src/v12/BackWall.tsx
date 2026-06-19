import React from "react";
import { useCurrentFrame, staticFile } from "remotion";
import * as THREE from "three";
import { useRemotionTexture } from "./useRemotionTexture";
import manifest from "../v11-manifest.json";
import { PHASE, easeIn } from "./camera-path";

const POSTER_FILE = (manifest.home as Record<string, string>).poster05
  ?? (manifest.home as Record<string, string>).poster04;

export const BackWall: React.FC = () => {
  const frame = useCurrentFrame();
  const texture = useRemotionTexture(staticFile(POSTER_FILE));
  if (!texture) return null;

  // Wall is wide enough to fill camera FOV at Z = -28
  const W = 36;
  const H = 20;

  // Subtle Ken Burns + fade out as we leave the wall behind
  const kb = easeIn(frame, [0, PHASE.BACK_WALL_END]);
  const fade = 1 - easeIn(frame, [PHASE.BACK_WALL_END - 60, PHASE.BACK_WALL_END + 40]);
  const scale = 1.05 + kb * 0.08;

  return (
    <mesh position={[0, 0, -28]} scale={[scale, scale, 1]}>
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={fade}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
};

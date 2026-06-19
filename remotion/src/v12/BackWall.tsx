import React from "react";
import { useCurrentFrame, staticFile } from "remotion";
import * as THREE from "three";
import { useVideoTexture } from "@remotion/three";
import manifest from "../v11-manifest.json";
import { PHASE, easeIn } from "./camera-path";

// Find a winter/seasonal home poster to use as a still wall fallback.
// For now we use a still texture — the back wall plays the home reel as a poster image,
// with subtle parallax. Video texture support is finicky in headless rendering so
// we use a still image with Ken Burns to keep things deterministic and fast.

// home is {poster02, poster03, poster04, poster05} — winter is poster05
const POSTER_FILE = (manifest.home as Record<string, string>).poster05
  ?? (manifest.home as Record<string, string>).poster04;

export const BackWall: React.FC = () => {
  const frame = useCurrentFrame();
  void useVideoTexture;
  const texture = useTexture(staticFile(POSTER.file));

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

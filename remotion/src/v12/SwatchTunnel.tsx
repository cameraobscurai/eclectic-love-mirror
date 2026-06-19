import React from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { PHASE, easeIn } from "./camera-path";

// SWATCH TUNNEL — a large solid-color plane the camera flies through.
// During PHASE.SWATCH, plane opacity peaks at 1.0 (fills frame as we pass through).
// Color is the brand "champagne" tone (#C7B6A1) — same color flagged in v11.

export const SwatchTunnel: React.FC = () => {
  const frame = useCurrentFrame();

  // Plane sits at Z = 2 (camera path crosses it ~frame 1320)
  // Opacity: ramps up as we approach, peaks at crossing, fades after.
  const approach = easeIn(frame, [PHASE.SWATCH[0] - 30, PHASE.SWATCH[0] + 20]);
  const depart = easeIn(frame, [PHASE.SWATCH[1] - 30, PHASE.SWATCH[1]]);
  const opacity = approach * (1 - depart);

  return (
    <mesh position={[0, 0, 2]}>
      <planeGeometry args={[60, 40]} />
      <meshBasicMaterial color="#c7b6a1" transparent opacity={opacity} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
};

// FLOOR — subtle ground plane to anchor depth perception.
// Charcoal with slight gradient via vertex colors would be ideal, but a flat
// dark plane works for the editorial brand.

export const Floor: React.FC = () => {
  return (
    <mesh position={[0, -3, -10]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial color="#1a1a1a" transparent opacity={0} />
    </mesh>
  );
};

// WORDMARK — appears in deep space at the end
export const WordmarkPlane: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeIn(frame, [PHASE.WORDMARK[0], PHASE.WORDMARK[0] + 60]);
  return (
    <mesh position={[0, 0, -50]}>
      <planeGeometry args={[24, 12]} />
      <meshBasicMaterial color="#1a1a1a" transparent opacity={opacity * 0.6} />
    </mesh>
  );
};

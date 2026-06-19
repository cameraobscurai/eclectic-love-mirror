import React from "react";
import { useCurrentFrame } from "remotion";
import { EffectComposer, Vignette, ChromaticAberration, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { PHASE } from "./camera-path";

// LENS STACK
//   • Vignette — anchors frame, slight cinematic darkening
//   • Chromatic aberration — micro RGB split on edges, intensifies during swatch
//   • Noise — 3% film grain
// All frame-driven, deterministic per render.

export const LensStack: React.FC = () => {
  const frame = useCurrentFrame();
  // Slight chromatic punch as we cross the swatch
  const isSwatch = frame >= PHASE.SWATCH[0] - 30 && frame <= PHASE.SWATCH[1];
  const caAmount = isSwatch ? 0.0028 : 0.0012;

  return (
    <EffectComposer multisampling={0}>
      <Vignette eskil={false} offset={0.18} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
      <ChromaticAberration
        offset={new THREE.Vector2(caAmount, caAmount)}
        radialModulation
        modulationOffset={0.15}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={0.035} premultiply blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
};

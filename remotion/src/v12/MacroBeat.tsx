// MacroBeat — 9-second variants of the v12 13-22s window (tonal sort + macro lock).
// Each variant: slow camera near the product field, textile tiles migrate by
// lightness, one focal product pulls forward as macro hero.
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  interpolate,
  Easing,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import manifest from "../v11-manifest.json";
import { useRemotionTexture } from "./useRemotionTexture";

const COLS = 14;
const ROWS = 6;
const TOTAL = COLS * ROWS;
const CARD = 1.4;
const GAP = 0.15;
const SPACING = CARD + GAP;
const ROW_HEIGHT = CARD + GAP;

type Tile = (typeof manifest.tiles)[number];

function restPos(c: number, r: number): [number, number, number] {
  const x = (c - (COLS - 1) / 2) * SPACING;
  const y = ((ROWS - 1) / 2 - r) * ROW_HEIGHT;
  const d = Math.abs(c - (COLS - 1) / 2) / ((COLS - 1) / 2);
  const z = -8 + d * d * 1.5;
  return [x, y, z];
}

const ease = (t: number) => Easing.bezier(0.45, 0, 0.2, 1)(Math.max(0, Math.min(1, t)));
const phase = (frame: number, a: number, b: number) =>
  ease(interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

// Tonal-sort target map — textiles migrate to Y=0 row, sorted by lightness
const tilesWithIdx = manifest.tiles.slice(0, TOTAL).map((t, i) => ({ t, i }));
const textiles = tilesWithIdx
  .filter(({ t }) => t.category === "pillows-throws" && t.colorHex)
  .sort((a, b) => (b.t.colorLightness ?? 0) - (a.t.colorLightness ?? 0));
const textileTargetMap = new Map<number, [number, number, number]>();
textiles.forEach(({ i }, idx) => {
  const n = Math.max(1, textiles.length - 1);
  const x = (idx / n - 0.5) * (COLS - 2) * SPACING;
  textileTargetMap.set(i, [x, 0, -5]);
});

export type BeatVariant = "A" | "B" | "C";

interface BeatConfig {
  matchIndex: number;
  // Camera arc: position interpolates from posA → posB across 270 frames
  posA: [number, number, number];
  posB: [number, number, number];
  // LookAt arc
  lookA: [number, number, number];
  lookB: [number, number, number];
  // Macro target position (where the hero card flies to)
  macroTarget: [number, number, number];
  // FOV at start / at macro hold
  fovStart: number;
  fovEnd: number;
}

const BEATS: Record<BeatVariant, BeatConfig> = {
  // A — RIGHT-TO-LEFT arc, macro on a lighting fixture (idx 70)
  A: {
    matchIndex: 70,
    posA: [4.5, 0.2, 4],
    posB: [-0.8, 0.0, -2.5],
    lookA: [3, 0, -8],
    lookB: [-0.8, 0, -7],
    macroTarget: [-0.8, 0, -6.5],
    fovStart: 38,
    fovEnd: 28,
  },
  // B — LOW DOLLY UP, macro on a chandelier (idx 80) so camera rises to meet it
  B: {
    matchIndex: 80,
    posA: [-3.5, -0.8, 3.5],
    posB: [0.8, 1.2, -1.8],
    lookA: [-2, 0, -8],
    lookB: [0.8, 1.2, -7],
    macroTarget: [0.8, 1.2, -6.5],
    fovStart: 40,
    fovEnd: 26,
  },
  // C — CRANE DOWN across tableware (idx 35), macro lock on the silver
  C: {
    matchIndex: 35,
    posA: [2.5, 1.8, 5],
    posB: [-0.4, -0.6, -2.0],
    lookA: [0, 0, -8],
    lookB: [-0.4, -0.6, -7],
    macroTarget: [-0.4, -0.6, -6.5],
    fovStart: 36,
    fovEnd: 27,
  },
};

const lerp3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const handheld = (f: number): [number, number, number] => [
  Math.sin(f / 30 * 0.7) * 0.04,
  Math.cos(f / 30 * 0.5) * 0.025,
  0,
];

const CameraRig: React.FC<{ cfg: BeatConfig }> = ({ cfg }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const t = ease(frame / 270);
  const pos = lerp3(cfg.posA, cfg.posB, t);
  const look = lerp3(cfg.lookA, cfg.lookB, t);
  const hh = handheld(frame);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(pos[0] + hh[0], pos[1] + hh[1], pos[2] + hh[2]);
  cam.lookAt(look[0], look[1], look[2]);
  // FOV tightens as macro lock engages
  const macroLock = phase(frame, 150, 240);
  cam.fov = cfg.fovStart + (cfg.fovEnd - cfg.fovStart) * macroLock;
  cam.updateProjectionMatrix();
  return null;
};

interface CardProps {
  tile: Tile;
  index: number;
  matchIndex: number;
  macroTarget: [number, number, number];
  fieldBuild: number;
  tonalSort: number;
  macroLock: number;
}

const Card: React.FC<CardProps> = ({ tile, index, matchIndex, macroTarget, fieldBuild, tonalSort, macroLock }) => {
  const texture = useRemotionTexture(staticFile(tile.file));
  if (!texture) return null;
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const c = index % COLS;
  const r = Math.floor(index / COLS);
  const rest = restPos(c, r);
  const cd = Math.abs(c - (COLS - 1) / 2);
  const rd = Math.abs(r - (ROWS - 1) / 2);
  const staggerDelay = (cd + rd) / 12;
  const localBuild = Math.max(0, Math.min(1, (fieldBuild - staggerDelay * 0.5) / 0.5));

  let [x, y, z] = rest;
  if (textileTargetMap.has(index)) {
    const tg = textileTargetMap.get(index)!;
    x = rest[0] + (tg[0] - rest[0]) * tonalSort;
    y = rest[1] + (tg[1] - rest[1]) * tonalSort;
    z = rest[2] + (tg[2] - rest[2]) * tonalSort;
  } else {
    z = rest[2] - tonalSort * 2.0;
  }

  let scaleMul = 1;
  if (index === matchIndex) {
    x = x + (macroTarget[0] - x) * macroLock;
    y = y + (macroTarget[1] - y) * macroLock;
    z = z + (macroTarget[2] - z) * macroLock;
    scaleMul = 1 + macroLock * 2.0;
  }

  y = y - (1 - localBuild) * 0.6;
  const opacity = index === matchIndex ? Math.max(localBuild, macroLock) : localBuild;
  const w = aspect >= 1 ? CARD : CARD * aspect;
  const h = aspect >= 1 ? CARD / aspect : CARD;

  return (
    <mesh position={[x, y, z]} scale={[scaleMul, scaleMul, 1]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

const Backdrop: React.FC<{ index: number; matchIndex: number; macroTarget: [number, number, number]; fieldBuild: number; tonalSort: number; macroLock: number; }> = ({ index, matchIndex, macroTarget, fieldBuild, tonalSort, macroLock }) => {
  const c = index % COLS;
  const r = Math.floor(index / COLS);
  const rest = restPos(c, r);
  const cd = Math.abs(c - (COLS - 1) / 2);
  const rd = Math.abs(r - (ROWS - 1) / 2);
  const staggerDelay = (cd + rd) / 12;
  const localBuild = Math.max(0, Math.min(1, (fieldBuild - staggerDelay * 0.5) / 0.5));

  let [x, y, z] = rest;
  if (textileTargetMap.has(index)) {
    const tg = textileTargetMap.get(index)!;
    x = rest[0] + (tg[0] - rest[0]) * tonalSort;
    y = rest[1] + (tg[1] - rest[1]) * tonalSort;
    z = rest[2] + (tg[2] - rest[2]) * tonalSort;
  } else {
    z = rest[2] - tonalSort * 2.0;
  }
  let scaleMul = 1;
  if (index === matchIndex) {
    x = x + (macroTarget[0] - x) * macroLock;
    y = y + (macroTarget[1] - y) * macroLock;
    z = z + (macroTarget[2] - z) * macroLock;
    scaleMul = 1 + macroLock * 2.0;
  }
  y = y - (1 - localBuild) * 0.6;
  const opacity = (index === matchIndex ? Math.max(localBuild, macroLock) : localBuild) * 0.95;
  return (
    <mesh position={[x, y, z - 0.005]} scale={[scaleMul, scaleMul, 1]}>
      <planeGeometry args={[CARD, CARD]} />
      <meshBasicMaterial color="#f7f5f1" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

const FieldForBeat: React.FC<{ cfg: BeatConfig }> = ({ cfg }) => {
  const frame = useCurrentFrame();
  const fieldBuild = phase(frame, 0, 80);
  const tonalSort = phase(frame, 60, 180);
  const macroLock = phase(frame, 150, 240);
  return (
    <group>
      {manifest.tiles.slice(0, TOTAL).map((tile, i) => (
        <React.Fragment key={tile.slug}>
          <Backdrop index={i} matchIndex={cfg.matchIndex} macroTarget={cfg.macroTarget} fieldBuild={fieldBuild} tonalSort={tonalSort} macroLock={macroLock} />
          <Card tile={tile} index={i} matchIndex={cfg.matchIndex} macroTarget={cfg.macroTarget} fieldBuild={fieldBuild} tonalSort={tonalSort} macroLock={macroLock} />
        </React.Fragment>
      ))}
    </group>
  );
};

export const MacroBeat: React.FC<{ variant: BeatVariant }> = ({ variant }) => {
  const { width, height } = useVideoConfig();
  const cfg = BEATS[variant];
  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: cfg.posA, fov: cfg.fovStart, near: 0.1, far: 200 }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", 22, 60]} />
        <ambientLight intensity={1.0} />
        <CameraRig cfg={cfg} />
        <FieldForBeat cfg={cfg} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const MacroBeatA: React.FC = () => <MacroBeat variant="A" />;
export const MacroBeatB: React.FC = () => <MacroBeat variant="B" />;
export const MacroBeatC: React.FC = () => <MacroBeat variant="C" />;

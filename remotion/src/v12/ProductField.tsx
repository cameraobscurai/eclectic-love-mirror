import React from "react";
import { useCurrentFrame, staticFile, useVideoConfig } from "remotion";
import { useRemotionTexture } from "./useRemotionTexture";
import * as THREE from "three";
import manifest from "../v11-manifest.json";
import { PHASE, easeIn } from "./camera-path";

// Field of 84 product cards in a curved formation around camera.
// Cards are 1.4 wide × 1.4 tall (square cells, matching v11 normalization).
// Layout: 14 cols × 6 rows, slightly bowed forward, centered at Z = -8.

const COLS = 14;
const ROWS = 6;
const TOTAL = COLS * ROWS; // 84
const CARD = 1.4;
const GAP = 0.15;
const SPACING = CARD + GAP;
const ROW_HEIGHT = CARD + GAP;

type Tile = (typeof manifest.tiles)[number];

// Compute the resting position of a card (col, row) in world space
function restPos(c: number, r: number): [number, number, number] {
  const x = (c - (COLS - 1) / 2) * SPACING;
  const y = ((ROWS - 1) / 2 - r) * ROW_HEIGHT;
  // Slight bow: cards farther from center are pushed back a bit (curved wall)
  const distFromCenter = Math.abs(c - (COLS - 1) / 2) / ((COLS - 1) / 2);
  const z = -8 + distFromCenter * distFromCenter * 1.5; // 0 → 1.5 pushback
  return [x, y, z];
}

// Find the match-cut tile index (first seating product) — for macro phase
const MATCH_INDEX = Math.max(0, manifest.tiles.findIndex((t) => t.category === "seating"));
const MATCH_COL = MATCH_INDEX % COLS;
const MATCH_ROW = Math.floor(MATCH_INDEX / COLS);
const MATCH_REST = restPos(MATCH_COL, MATCH_ROW);

// Match-cut destination: the camera path lands at [-1.6, 0, -3.2] looking at [-1.6, 0, -8].
// We want the card centered at the camera's lookAt line, large enough to fill frame.
const MATCH_TARGET: [number, number, number] = [-1.6, 0, -6.5];

// Tonal sort: textile tiles migrate to a horizontal row at Y = 0, Z = -5
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

interface CardProps {
  tile: Tile;
  index: number;
  fieldBuild: number;     // 0→1 cards fade in
  tonalSort: number;      // 0→1 textile migration
  macroLock: number;      // 0→1 match-cut card moves to camera focus
  exit: number;           // 0→1 all cards fade out as we transition
}

const Card: React.FC<CardProps> = ({ tile, index, fieldBuild, tonalSort, macroLock, exit }) => {
  const texture = useRemotionTexture(staticFile(tile.file));
  if (!texture) return null;
  // Preserve aspect ratio: most product PNGs are taller than wide
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;

  const c = index % COLS;
  const r = Math.floor(index / COLS);
  const rest = restPos(c, r);

  // Build-in stagger by Manhattan distance from a center origin
  const cd = Math.abs(c - (COLS - 1) / 2);
  const rd = Math.abs(r - (ROWS - 1) / 2);
  const staggerDelay = (cd + rd) / 12; // 0 → 1
  const localBuild = Math.max(0, Math.min(1, (fieldBuild - staggerDelay * 0.6) / 0.4));

  // Resting position
  let [x, y, z] = rest;

  // Tonal sort: textiles migrate, non-textiles recede in Z
  if (textileTargetMap.has(index)) {
    const target = textileTargetMap.get(index)!;
    x = rest[0] + (target[0] - rest[0]) * tonalSort;
    y = rest[1] + (target[1] - rest[1]) * tonalSort;
    z = rest[2] + (target[2] - rest[2]) * tonalSort;
  } else {
    // Recede in depth slightly
    z = rest[2] - tonalSort * 2.5;
  }

  // Macro lock: match-cut card pulls forward + grows
  let scaleMul = 1;
  if (index === MATCH_INDEX) {
    x = x + (MATCH_TARGET[0] - x) * macroLock;
    y = y + (MATCH_TARGET[1] - y) * macroLock;
    z = z + (MATCH_TARGET[2] - z) * macroLock;
    scaleMul = 1 + macroLock * 1.8;
  }

  // Build-in: cards rise from below their rest position
  const buildOffset = (1 - localBuild) * 0.6;
  y = y - buildOffset;

  // Opacity
  let opacity = localBuild;
  if (index === MATCH_INDEX) {
    // Match card stays visible during exit (it's the bridge to next phase)
    opacity = Math.max(opacity, macroLock) * (1 - exit * 0.6);
  } else {
    opacity = opacity * (1 - exit);
  }

  // Scale: keep CARD as the long dimension, derive short dim from aspect
  const w = aspect >= 1 ? CARD : CARD * aspect;
  const h = aspect >= 1 ? CARD / aspect : CARD;

  return (
    <mesh position={[x, y, z]} scale={[scaleMul, scaleMul, 1]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// Backdrop card (the white square behind each silhouette, matching v11 cards)
const Backdrop: React.FC<{ index: number; fieldBuild: number; tonalSort: number; macroLock: number; exit: number; }> = ({ index, fieldBuild, tonalSort, macroLock, exit }) => {
  const c = index % COLS;
  const r = Math.floor(index / COLS);
  const rest = restPos(c, r);
  const cd = Math.abs(c - (COLS - 1) / 2);
  const rd = Math.abs(r - (ROWS - 1) / 2);
  const staggerDelay = (cd + rd) / 12;
  const localBuild = Math.max(0, Math.min(1, (fieldBuild - staggerDelay * 0.6) / 0.4));

  let [x, y, z] = rest;
  if (textileTargetMap.has(index)) {
    const target = textileTargetMap.get(index)!;
    x = rest[0] + (target[0] - rest[0]) * tonalSort;
    y = rest[1] + (target[1] - rest[1]) * tonalSort;
    z = rest[2] + (target[2] - rest[2]) * tonalSort;
  } else {
    z = rest[2] - tonalSort * 2.5;
  }
  let scaleMul = 1;
  if (index === MATCH_INDEX) {
    x = x + (MATCH_TARGET[0] - x) * macroLock;
    y = y + (MATCH_TARGET[1] - y) * macroLock;
    z = z + (MATCH_TARGET[2] - z) * macroLock;
    scaleMul = 1 + macroLock * 1.8;
  }
  y = y - (1 - localBuild) * 0.6;

  let opacity = localBuild * 0.95;
  if (index === MATCH_INDEX) {
    opacity = Math.max(opacity, macroLock * 0.95) * (1 - exit * 0.6);
  } else {
    opacity = opacity * (1 - exit);
  }

  return (
    <mesh position={[x, y, z - 0.005]} scale={[scaleMul, scaleMul, 1]}>
      <planeGeometry args={[CARD, CARD]} />
      <meshBasicMaterial color="#f7f5f1" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

export const ProductField: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;

  const fieldBuild = easeIn(frame, PHASE.FIELD_BUILD);
  const tonalSort = easeIn(frame, PHASE.TONAL_SORT);
  const macroLock = easeIn(frame, [PHASE.MACRO_HOLD[0] - 60, PHASE.MACRO_HOLD[0]]);
  const exit = easeIn(frame, [PHASE.TRIPTYCH[0], PHASE.TRIPTYCH[0] + 80]);

  return (
    <group>
      {manifest.tiles.slice(0, TOTAL).map((tile, i) => (
        <React.Fragment key={tile.slug}>
          <Backdrop index={i} fieldBuild={fieldBuild} tonalSort={tonalSort} macroLock={macroLock} exit={exit} />
          <Card tile={tile} index={i} fieldBuild={fieldBuild} tonalSort={tonalSort} macroLock={macroLock} exit={exit} />
        </React.Fragment>
      ))}
    </group>
  );
};

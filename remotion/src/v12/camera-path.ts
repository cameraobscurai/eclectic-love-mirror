// Camera path for the v12 one-take. All positions in world units.
// Total duration is 1800 frames @ 30fps = 60 seconds.
//
// The scene is a virtual gallery:
//   • Back wall (video) sits at Z = -28
//   • Product field of 84 cards floats in a 12×7 grid centered at Z = -8
//   • Atelier triptych panels live at Z = -2, slightly off X axis
//   • Swatch tunnel at Z = +4
//   • Brief HUD plane at Z = +8 (camera passes through)
//   • Wordmark deep-space at Z = -50
import { interpolate, Easing } from "remotion";

type Vec3 = [number, number, number];

// Keyframes: [frame, position, lookAt]
type Key = { f: number; pos: Vec3; look: Vec3 };

// 60s shot, broken into 7 movements. Camera never stops.
const KEYS: Key[] = [
  // 00:00 — start in deep space, looking at back wall
  { f: 0,    pos: [0, 0, 14],     look: [0, 0, -28] },
  // 00:06 — drift forward toward back wall, video reel filling frame
  { f: 180,  pos: [0, 0, 4],      look: [0, 0, -28] },
  // 00:14 — arc LEFT, field of 84 tiles wraps around
  { f: 420,  pos: [-9, 0.5, 2],   look: [0, 0, -8] },
  // 00:22 — settle in front of field, tonal sort window
  { f: 660,  pos: [0, 0, 6],      look: [0, 0, -8] },
  // 00:32 — DOLLY IN to match-cut chair (slightly left of center)
  { f: 960,  pos: [-1.6, 0.0, -3.2],  look: [-1.6, 0.0, -8] },
  // 00:38 — pull back + track RIGHT toward atelier triptych panels
  { f: 1140, pos: [6, 0.4, 0],    look: [10, 0, -3] },
  // 00:44 — camera passes through swatch (fly forward through Z=+4 plane)
  { f: 1320, pos: [0, 0, 6],      look: [0, 0, -2] },
  // 00:50 — brief HUD plane sweeps past
  { f: 1500, pos: [0, 0, 10],     look: [0, 0, 0] },
  // 00:56 — pull back to reveal wordmark in deep space
  { f: 1680, pos: [0, 1.2, 22],   look: [0, 0, -50] },
  // 01:00 — final frame
  { f: 1800, pos: [0, 1.4, 26],   look: [0, 0, -50] },
];

const easeMap = (frame: number, a: Key, b: Key): number => {
  const t = (frame - a.f) / (b.f - a.f);
  return Easing.bezier(0.45, 0, 0.2, 1)(Math.max(0, Math.min(1, t)));
};

const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export function cameraAt(frame: number): { pos: Vec3; look: Vec3 } {
  // Find segment
  let a = KEYS[0], b = KEYS[1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (frame >= KEYS[i].f && frame <= KEYS[i + 1].f) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  if (frame >= KEYS[KEYS.length - 1].f) {
    a = KEYS[KEYS.length - 2];
    b = KEYS[KEYS.length - 1];
  }
  const t = easeMap(frame, a, b);
  return { pos: lerpVec(a.pos, b.pos, t), look: lerpVec(a.look, b.look, t) };
}

// Subtle handheld float (sub-pixel breathing, deterministic)
export function handheld(frame: number): Vec3 {
  const f = frame / 30;
  return [
    Math.sin(f * 0.7) * 0.04 + Math.sin(f * 1.9) * 0.012,
    Math.cos(f * 0.5) * 0.025 + Math.sin(f * 2.3) * 0.008,
    0,
  ];
}

// Scene timing helpers (in frames)
export const PHASE = {
  COLD_OPEN_END: 90,
  BACK_WALL_END: 380,
  FIELD_BUILD: [380, 540] as [number, number],
  TONAL_SORT: [660, 900] as [number, number],
  MACRO_HOLD: [960, 1080] as [number, number],
  TRIPTYCH: [1080, 1280] as [number, number],
  SWATCH: [1280, 1380] as [number, number],
  BRIEF: [1380, 1560] as [number, number],
  WORDMARK: [1620, 1800] as [number, number],
};

export function easeIn(frame: number, range: [number, number]): number {
  const t = interpolate(frame, range, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Easing.bezier(0.45, 0, 0.2, 1)(t);
}

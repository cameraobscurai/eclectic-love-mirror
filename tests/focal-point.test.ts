import { describe, expect, it } from "vitest";
import { focalToFrame } from "@/components/collection/NormalizedProductImage";

/**
 * Focal points are authored in PHOTO space; the tile transforms in FRAME
 * space. These fixtures lock the conversion that was missing — the bug that
 * made every focal nudge on a wide cover overshoot ~2x and drop the piece out
 * the bottom of the tile (Ingram Black Leather + Wood Sofa, 391x151).
 */

const FRAME = 5 / 4;

/** Same letterbox math measureImage() performs, restated independently. */
function rendered(naturalAspect: number, frameAspect: number) {
  return {
    renderedW: naturalAspect >= frameAspect ? 1 : naturalAspect / frameAspect,
    renderedH: naturalAspect >= frameAspect ? frameAspect / naturalAspect : 1,
  };
}

describe("focalToFrame", () => {
  it("maps 1:1 when the photo aspect matches the frame (no regression for normal covers)", () => {
    const { renderedW, renderedH } = rendered(FRAME, FRAME);
    expect(renderedW).toBe(1);
    expect(renderedH).toBe(1);
    const { fx, fy } = focalToFrame(0.3, 0.8, renderedW, renderedH);
    expect(fx).toBeCloseTo(0.3, 6);
    expect(fy).toBeCloseTo(0.8, 6);
  });

  it("puts the center of a very wide photo at the center of the frame", () => {
    // Ingram: 391 x 151 => aspect 2.589
    const { renderedW, renderedH } = rendered(391 / 151, FRAME);
    const { fx, fy } = focalToFrame(0.5, 0.5, renderedW, renderedH);
    expect(fx).toBeCloseTo(0.5, 6);
    expect(fy).toBeCloseTo(0.5, 6);
  });

  it("compresses vertical travel by the letterbox ratio on a wide photo", () => {
    const { renderedW, renderedH } = rendered(391 / 151, FRAME);
    // The photo occupies ~48% of the frame's height.
    expect(renderedH).toBeCloseTo(0.4828, 3);
    const top = focalToFrame(0.5, 0, renderedW, renderedH);
    const bottom = focalToFrame(0.5, 1, renderedW, renderedH);
    // A full-height sweep of the PHOTO must move only ~48% of the FRAME.
    expect(bottom.fy - top.fy).toBeCloseTo(renderedH, 6);
    // The old code treated this as a full 1.0 sweep — that was the overshoot.
    expect(bottom.fy - top.fy).toBeLessThan(0.5);
  });

  it("compresses horizontal travel on a tall photo", () => {
    const { renderedW, renderedH } = rendered(0.5, FRAME); // tall portrait
    expect(renderedH).toBe(1);
    const left = focalToFrame(0, 0.5, renderedW, renderedH);
    const right = focalToFrame(1, 0.5, renderedW, renderedH);
    expect(right.fx - left.fx).toBeCloseTo(renderedW, 6);
    expect(right.fx - left.fx).toBeCloseTo(0.4, 6);
  });

  it("keeps focal inside the frame for every corner of any aspect", () => {
    for (const aspect of [0.4, 0.8, 1.25, 2.59, 5]) {
      const { renderedW, renderedH } = rendered(aspect, FRAME);
      for (const [px, py] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [0.5, 0.5],
      ]) {
        const { fx, fy } = focalToFrame(px, py, renderedW, renderedH);
        expect(fx).toBeGreaterThanOrEqual(0);
        expect(fx).toBeLessThanOrEqual(1);
        expect(fy).toBeGreaterThanOrEqual(0);
        expect(fy).toBeLessThanOrEqual(1);
      }
    }
  });

  /**
   * The contract that makes the tool safe: focal is an anchor delta on top of
   * the solved fit, so a focal point equal to the silhouette center changes
   * nothing, and no focal point can alter scale.
   */
  it("is a no-op when the focal point equals the silhouette center", () => {
    const { renderedW, renderedH } = rendered(391 / 151, FRAME);
    const silhouetteCy = 0.5; // centered subject
    const { fy } = focalToFrame(0.5, 0.5, renderedW, renderedH);
    const deltaPercent = (silhouetteCy - fy) * 1.0 * 100;
    expect(deltaPercent).toBeCloseTo(0, 6);
  });
});

/**
 * Composition, not just conversion. The Ingram bug lived in how focalToFrame
 * combined with the solved scale term inside the transform — the fixtures
 * above lock only one half of that. This restates the render path's delta
 * arithmetic (NormalizedProductImage, transform memo) and locks the two
 * properties that make the tool safe.
 */
describe("focal composes with the solved fit", () => {
  const applyFocal = (
    base: { tx: number; ty: number },
    focal: { x: number; y: number },
    silhouette: { cx: number; cy: number },
    scale: number,
    naturalAspect: number,
  ) => {
    const { renderedW, renderedH } = rendered(naturalAspect, FRAME);
    const { fx, fy } = focalToFrame(focal.x, focal.y, renderedW, renderedH);
    return {
      tx: base.tx + (silhouette.cx - fx) * scale * 100,
      ty: base.ty + (silhouette.cy - fy) * scale * 100,
      scale,
    };
  };

  it("is a no-op when focal lands on the silhouette center, at any scale", () => {
    const aspect = 391 / 151;
    const { renderedW, renderedH } = rendered(aspect, FRAME);
    const center = focalToFrame(0.5, 0.5, renderedW, renderedH);
    for (const scale of [0.7, 1, 1.2, 2]) {
      const out = applyFocal(
        { tx: -12, ty: 7 },
        { x: 0.5, y: 0.5 },
        { cx: center.fx, cy: center.fy },
        scale,
        aspect,
      );
      expect(out.tx).toBeCloseTo(-12, 6);
      expect(out.ty).toBeCloseTo(7, 6);
    }
  });

  it("never alters the solved scale", () => {
    const out = applyFocal(
      { tx: 0, ty: 0 },
      { x: 0.05, y: 0.95 },
      { cx: 0.5, cy: 0.5 },
      0.83,
      391 / 151,
    );
    expect(out.scale).toBe(0.83);
  });

  it("scales the focal delta with the fit, so travel stays proportional", () => {
    const args = [
      { tx: 0, ty: 0 },
      { x: 0.5, y: 1 },
      { cx: 0.5, cy: 0.5 },
    ] as const;
    const small = applyFocal(args[0], args[1], args[2], 0.5, 391 / 151);
    const large = applyFocal(args[0], args[1], args[2], 1.0, 391 / 151);
    expect(large.ty).toBeCloseTo(small.ty * 2, 6);
  });

  it("keeps a full-photo focal sweep bounded by the letterbox on a wide cover", () => {
    const aspect = 391 / 151;
    const { renderedH } = rendered(aspect, FRAME);
    const top = applyFocal({ tx: 0, ty: 0 }, { x: 0.5, y: 0 }, { cx: 0.5, cy: 0.5 }, 1, aspect);
    const bottom = applyFocal({ tx: 0, ty: 0 }, { x: 0.5, y: 1 }, { cx: 0.5, cy: 0.5 }, 1, aspect);
    // Full sweep must equal the letterbox height in percent — the old code
    // treated it as 100%, which is the ~2x overshoot that dropped the sofa.
    expect(Math.abs(bottom.ty - top.ty)).toBeCloseTo(renderedH * 100, 4);
    expect(Math.abs(bottom.ty - top.ty)).toBeLessThan(50);
  });
});

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
      for (const [px, py] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]) {
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

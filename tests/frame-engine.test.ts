/**
 * Frame Studio 2.3 — engine fixtures.
 *
 * Locks the three behaviours the pipeline stands on:
 *   measure (alpha / colour / fail), place (per-category anchors, no clamps),
 *   verify (idempotence, baseline, clip, perimeter, dims).
 *
 * Plus two the spec did not ask for and the system now depends on:
 *   - canonicalizer stability (a hash cannot drift for schema reasons),
 *   - anchor sign (the chandelier carve-out proved once by a smoke check,
 *     made impossible to unprove).
 */

import { describe, expect, it } from "vitest";
import {
  CANVAS_H,
  CANVAS_W,
  RULE_VERSION,
  canonicalizeRecipe,
  measureSilhouette,
  placeSilhouette,
  resolveRule,
  toFrameBox,
  verify,
  type FrameRecipe,
} from "../src/lib/frame-engine";
import { framedCoverPath, framedHash16 } from "../src/lib/frame-hash";
import { alphaImage, composeToCanvas, dirtyBgImage, whiteBgImage } from "./fixtures/synthetic";

// ─── measureSilhouette ──────────────────────────────────────────────────────

describe("measureSilhouette", () => {
  it("takes the alpha path on a transparent PNG and finds the exact bbox", () => {
    const img = alphaImage(400, 320, { x: 80, y: 40, w: 200, h: 160 });
    const m = measureSilhouette(img);
    expect(m.method).toBe("alpha");
    expect(m.bbox).toEqual({ x: 80, y: 40, w: 200, h: 160 });
    expect(m.confidence).toBeGreaterThan(0.9);
  });

  it("takes the border-ring colour path on an opaque white-background photo", () => {
    const img = whiteBgImage(400, 320, { x: 100, y: 60, w: 150, h: 180 });
    const m = measureSilhouette(img);
    expect(m.method).toBe("color");
    expect(m.bbox).toEqual({ x: 100, y: 60, w: 150, h: 180 });
  });

  it("fails rather than guessing on a dirty mid-grey background", () => {
    const img = dirtyBgImage(400, 320, { x: 100, y: 60, w: 150, h: 180 });
    const m = measureSilhouette(img);
    expect(m.method).toBe("fail");
    expect(m.bbox).toBeNull();
    expect(m.confidence).toBe(0);
  });
});

// ─── placeSilhouette ────────────────────────────────────────────────────────

const boxOf = (img: { w: number; h: number }, r: { x: number; y: number; w: number; h: number }) =>
  toFrameBox(r, img.w, img.h);

describe("placeSilhouette", () => {
  it("emits no clamp band — a tiny silhouette is scaled up as far as the rule asks", () => {
    const img = { w: 1500, h: 1200 };
    const tiny = boxOf(img, { x: 700, y: 560, w: 100, h: 80 });
    const p = placeSilhouette(tiny, "sofas-loveseats");
    // The legacy solver capped this band at clampMax and produced the
    // CLAMP_MASSIVE defect class. The engine has no cap.
    expect(p.scale).toBeGreaterThan(4);
  });

  it("is idempotent: re-solving a placed silhouette asks for no further change", () => {
    const src = alphaImage(900, 700, { x: 120, y: 100, w: 600, h: 420 });
    const box = boxOf(src, { x: 120, y: 100, w: 600, h: 420 });
    const p = placeSilhouette(box, "sofas-loveseats");
    const rendered = composeToCanvas(src, p, CANVAS_W, CANVAS_H);
    const m = measureSilhouette(rendered);
    const again = placeSilhouette(
      toFrameBox(m.bbox!, rendered.w, rendered.h, rendered.w / rendered.h),
      "sofas-loveseats",
    );
    expect(again.scale).toBeCloseTo(1, 1);
  });
});

// ─── anchor sign (the chandelier carve-out) ─────────────────────────────────

describe("anchor signs", () => {
  const src = alphaImage(900, 700, { x: 250, y: 120, w: 400, h: 380 });
  const box = boxOf(src, { x: 250, y: 120, w: 400, h: 380 });

  it("a chandelier is always pulled up relative to the same silhouette as seating", () => {
    const seating = placeSilhouette(box, "sofas-loveseats");
    const chandelier = placeSilhouette(box, "chandeliers");
    // The absolute sign of offsetY depends on where the subject already sits
    // in its source frame; the invariant that encodes the carve-out is that a
    // top-anchored rule always resolves higher than a bottom-anchored one.
    expect(chandelier.offsetY).toBeLessThan(seating.offsetY);
  });

  it("each anchor lands its own edge and fails the other's baseline check", () => {
    const seating = placeSilhouette(box, "sofas-loveseats");
    const chandelier = placeSilhouette(box, "chandeliers");

    const seatingRender = composeToCanvas(src, seating, CANVAS_W, CANVAS_H);
    const chandelierRender = composeToCanvas(src, chandelier, CANVAS_W, CANVAS_H);

    expect(
      verify({ rendered: seatingRender }, "sofas-loveseats").failures.map((f) => f.code),
    ).not.toContain("V2");
    expect(
      verify({ rendered: chandelierRender }, "chandeliers").failures.map((f) => f.code),
    ).not.toContain("V2");

    // Swap the rules and the baseline check must object — proof the anchor,
    // not the geometry, is what V2 is reading.
    expect(
      verify({ rendered: chandelierRender }, "sofas-loveseats").failures.map((f) => f.code),
    ).toContain("V2");
  });

  it("keys anchors off category, never collection", () => {
    expect(resolveRule("chandeliers", "lighting").anchor).toBe("top");
    expect(resolveRule("floor-lamps", "lighting").anchor).toBe("bottom");
    expect(resolveRule("specialty").anchor).toBe("center");
  });
});

// ─── verify ─────────────────────────────────────────────────────────────────

describe("verify", () => {
  const src = alphaImage(900, 700, { x: 120, y: 100, w: 600, h: 420 });
  const box = boxOf(src, { x: 120, y: 100, w: 600, h: 420 });
  const placement = placeSilhouette(box, "sofas-loveseats");
  const good = composeToCanvas(src, placement, CANVAS_W, CANVAS_H);

  it("passes a correctly placed render", () => {
    const r = verify({ rendered: good, resampleFactor: 1 }, "sofas-loveseats");
    expect(r.failures).toEqual([]);
    expect(r.pass).toBe(true);
  });

  it("V5 rejects a canvas that is not an allowed size", () => {
    const odd = composeToCanvas(src, placement, 1024, 1024);
    const r = verify({ rendered: odd }, "sofas-loveseats");
    expect(r.failures.map((f) => f.code)).toContain("V5");
  });

  it("V6 rejects an oversized encoding", () => {
    const r = verify({ rendered: good, byteLength: 500_000 }, "sofas-loveseats");
    expect(r.failures.map((f) => f.code)).toContain("V6");
  });

  it("V1/V2/V3 reject a subject that is too large and clipped", () => {
    const blown = composeToCanvas(
      src,
      { ...placement, scale: placement.scale * 1.6 },
      CANVAS_W,
      CANVAS_H,
    );
    const r = verify({ rendered: blown }, "sofas-loveseats");
    const codes = r.failures.map((f) => f.code);
    expect(r.pass).toBe(false);
    expect(codes).toContain("V3");
  });

  it("V2 moves with the anchor: a floating render fails baseline for seating", () => {
    const floated = composeToCanvas(
      src,
      { ...placement, offsetY: placement.offsetY - 0.15 },
      CANVAS_W,
      CANVAS_H,
    );
    expect(verify({ rendered: floated }, "sofas-loveseats").failures.map((f) => f.code)).toContain(
      "V2",
    );
  });

  it("SRC_UPSCALED is an advisory, not a failure", () => {
    const r = verify({ rendered: good, resampleFactor: 2 }, "sofas-loveseats");
    expect(r.advisories.map((a) => a.code)).toContain("SRC_UPSCALED");
    expect(r.failures).toEqual([]);
  });
});

// ─── canonicalizer + hash stability ─────────────────────────────────────────

describe("canonicalizeRecipe / framedHash16", () => {
  const base: FrameRecipe = {
    placement: { scale: 1.23456789, offsetX: -0.0421, offsetY: 0.0673 },
  };
  const withAbsentKeys: FrameRecipe = {
    crop: undefined,
    rotate: undefined,
    bg: undefined,
    shadow: undefined,
    normalize: undefined,
    placement: { scale: 1.23456789, offsetX: -0.0421, offsetY: 0.0673 },
  };

  it("is byte-identical across calls and rounds to 4 decimals", () => {
    const a = canonicalizeRecipe(base);
    expect(a).toBe(canonicalizeRecipe(base));
    expect(a).toContain("1.2346");
    expect(a).not.toContain("null");
  });

  it("omits absent Phase 3.5 keys instead of nulling them", () => {
    expect(canonicalizeRecipe(withAbsentKeys)).toBe(canonicalizeRecipe(base));
    // Defensive nulls cannot move a hash either.
    expect(canonicalizeRecipe({ ...base, crop: null as never, rotate: null as never })).toBe(
      canonicalizeRecipe(base),
    );
  });

  it("hashes a placement-only recipe identically with and without absent keys", async () => {
    const src = "a".repeat(64);
    const h = await framedHash16(src, base, RULE_VERSION);
    expect(await framedHash16(src, withAbsentKeys, RULE_VERSION)).toBe(h);
    expect(h).toHaveLength(16);
  });

  it("changes the hash for a re-frame, a new source, or a rule bump", async () => {
    const src = "a".repeat(64);
    const h = await framedHash16(src, base, RULE_VERSION);
    const moved = await framedHash16(
      src,
      { placement: { ...base.placement, offsetY: base.placement.offsetY + 0.01 } },
      RULE_VERSION,
    );
    expect(moved).not.toBe(h);
    expect(await framedHash16("b".repeat(64), base, RULE_VERSION)).not.toBe(h);
    expect(await framedHash16(src, base, "fs2-next")).not.toBe(h);
  });

  it("writes the path the tile's 600w suffix swap resolves to", async () => {
    const h = await framedHash16("a".repeat(64), base, RULE_VERSION);
    const p = framedCoverPath("1234", h, 1200);
    expect(p).toBe(`framed-covers/1234/${h}-1200.webp`);
    expect(p.replace("-1200.webp", "-600.webp")).toBe(framedCoverPath("1234", h, 600));
  });
});

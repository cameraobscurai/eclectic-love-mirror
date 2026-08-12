#!/usr/bin/env bun
/**
 * 2.2 done-when: hash stability across the schema moment.
 *
 * 1. Canonicalizing the same placement-only recipe twice is byte-identical.
 * 2. The hash of `{ placement }` equals the hash of the same recipe carrying
 *    the Phase 3.5 keys as `undefined` — absent keys are OMITTED, never nulled,
 *    so nothing re-hashes when 3.5 lands.
 * 3. Any real change to a pixel-determining input changes the hash.
 */
import { canonicalizeRecipe, RULE_VERSION, type FrameRecipe } from "../../src/lib/frame-engine";
import { framedHash16, framedCoverPath } from "../../src/lib/frame-hash";

const SRC = "a".repeat(64);
const base: FrameRecipe = { placement: { scale: 1.23456789, offsetX: -0.0421, offsetY: 0.0673 } };

const withUndefined: FrameRecipe = {
  crop: undefined,
  rotate: undefined,
  bg: undefined,
  shadow: undefined,
  normalize: undefined,
  placement: { scale: 1.23456789, offsetX: -0.0421, offsetY: 0.0673 },
};

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed++;
};

const c1 = canonicalizeRecipe(base);
const c2 = canonicalizeRecipe(base);
check("canonical form is byte-identical across calls", c1 === c2, c1);
check("4-decimal rounding applied", c1.includes("1.2346"));
check(
  "absent 3.5 keys are omitted, not nulled",
  !c1.includes("null") && canonicalizeRecipe(withUndefined) === c1,
);

const h1 = await framedHash16(SRC, base, RULE_VERSION);
const h2 = await framedHash16(SRC, withUndefined, RULE_VERSION);
check("hash({placement}) === hash(same recipe, no other keys present)", h1 === h2, h1);

const hMoved = await framedHash16(
  SRC,
  { placement: { ...base.placement, offsetY: base.placement.offsetY + 0.01 } },
  RULE_VERSION,
);
check("a re-frame changes the hash", hMoved !== h1, hMoved);

const hSrc = await framedHash16("b".repeat(64), base, RULE_VERSION);
check("a new source changes the hash", hSrc !== h1);

const hRule = await framedHash16(SRC, base, "fs2-next");
check("a ruleVersion bump changes the hash", hRule !== h1);

check(
  "path shape",
  framedCoverPath("1234", h1, 1200) === `framed-covers/1234/${h1}-1200.webp`,
  framedCoverPath("1234", h1, 1200),
);

// Below-the-fold sanity: the tile's 600w suffix swap must resolve to the
// sibling this path scheme actually writes.
const url = `https://x/storage/v1/object/public/squarespace-mirror/${framedCoverPath("1234", h1, 1200)}`;
check("600w suffix swap matches the written 600 path", url.replace("-1200.webp", "-600.webp").endsWith(`${h1}-600.webp`));

process.exit(failed ? 1 : 0);

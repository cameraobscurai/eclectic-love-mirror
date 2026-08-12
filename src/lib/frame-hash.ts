/**
 * Frame Studio — hashed identity of a derivative.
 *
 * The hashed unit is the RECIPE, not the placement (Phase 2 amendment 1):
 *
 *   hash16 = sha256(srcHash + ruleVersion + canonicalizeRecipe(recipe)).slice(0,16)
 *
 * `canonicalizeRecipe` rounds to 4 decimals, fixes top-level key order, and
 * OMITS absent keys rather than nulling them — so a placement-only recipe
 * written today hashes identically to the same recipe once Phase 3.5 adds
 * crop/rotate/bg/shadow/normalize to the schema. Nothing ever regenerates for
 * schema reasons.
 *
 * Pure and isomorphic: Web Crypto only, no sharp, no Supabase, no node built-
 * ins. Server function and batch script share this one implementation so a
 * path can never mean two different compositions (R1).
 */

import { canonicalizeRecipe, RULE_VERSION, type FrameRecipe } from "./frame-engine";

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** SHA-256 hex of raw bytes — used for `srcHash` of the source photo. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const view = new Uint8Array(bytes); // detach from any pooled buffer
  const buf = await crypto.subtle.digest("SHA-256", view);
  return toHex(buf);
}

/** The exact string that gets hashed. Exported so tests can assert stability. */
export function hashInput(srcHash: string, recipe: FrameRecipe, ruleVersion = RULE_VERSION) {
  return `${srcHash}${ruleVersion}${canonicalizeRecipe(recipe)}`;
}

/** 16 hex chars of sha256 over every pixel-determining input. */
export async function framedHash16(
  srcHash: string,
  recipe: FrameRecipe,
  ruleVersion = RULE_VERSION,
): Promise<string> {
  const bytes = new TextEncoder().encode(hashInput(srcHash, recipe, ruleVersion));
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(buf).slice(0, 16);
}

/** `framed-covers/{rms_id}/{hash16}-{w}.webp` in `squarespace-mirror`. */
export function framedCoverPath(rmsId: string, hash16: string, width: number): string {
  const safe = String(rmsId).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `framed-covers/${safe}/${hash16}-${width}.webp`;
}

/**
 * Single source of truth for product silhouette fit.
 *
 * Every surface that renders a product silhouette (browse grid, viewport wall,
 * admin photo manager) resolves its FitRule here. There is exactly one path:
 * category rule → real-world size → FitRule.
 *
 * When the catalog gives us real W x H inches for a benchmarked category, the
 * rule switches to mass matching (silhouette √area scaled by real size) with
 * hard width and height caps derived from the piece's actual dimensions. That
 * is what keeps a 52"W x 36.5"H loveseat from out-massing — or out-towering —
 * a 96"W x 34"H sofa on the same row. Unmeasured items keep the category rule.
 */

import type { FitRule } from "./categoryFit";
import { resolveFit } from "./categoryFit";
import {
  physicalScaleFor,
  relativeMassFor,
  type ScalableProduct,
} from "./productPhysicalScale";

export type FittableProduct = ScalableProduct;

/** Base silhouette √area implied by a category rule. */
function baseArea(rule: FitRule): number {
  if (rule.primary === "area") return rule.primaryTarget;
  return Math.sqrt(rule.primaryTarget * rule.secondaryMax);
}

/** Base silhouette height implied by a category rule. */
function baseHeight(rule: FitRule): number {
  if (rule.primary === "height") return rule.primaryTarget;
  return rule.secondaryMax;
}

/** Base silhouette width implied by a category rule. */
function baseWidth(rule: FitRule): number {
  if (rule.primary === "width") return rule.primaryTarget;
  if (rule.primary === "height") return rule.secondaryMax;
  return 0.88;
}

/**
 * Which surface is asking.
 *
 * `tile` is the browse grid / viewport wall / admin manager: many products side
 * by side, so relative scale is the whole point.
 *
 * `detail` is QuickView and the PDP: a single product in a large frame. It uses
 * the *same* rule — same category targets, same real-size mass matching, same
 * floor anchor — scaled up uniformly so one product reads generously without
 * losing the size relationship a shopper just saw in the grid. A candlestick
 * must not fill the same frame a sofa does.
 */
export type FitContext = "tile" | "detail";

/**
 * How much larger a silhouette renders on a detail surface than in a tile.
 * Uniform: it multiplies every target and cap, so it changes the size of the
 * product in the frame without changing the size of products relative to
 * each other.
 */
const DETAIL_GAIN = 1.25;

function withGain(rule: FitRule, gain: number): FitRule {
  if (gain === 1) return rule;
  return {
    ...rule,
    primaryTarget: rule.primaryTarget * gain,
    secondaryMax: rule.secondaryMax * gain,
    widthMax: rule.widthMax != null ? rule.widthMax * gain : undefined,
    heightMax: rule.heightMax != null ? rule.heightMax * gain : undefined,
    fallback: { ...rule.fallback, scale: rule.fallback.scale * gain },
  };
}

/**
 * Per-product framing nudge. Same uniform multiplier as `withGain`, exposed so
 * a single product whose cover photo mis-reads beside its neighbours can be
 * trimmed without touching category tuning.
 */
export function withScaleNudge(rule: FitRule, nudge: number): FitRule {
  return withGain(rule, nudge);
}

export function resolveProductFit(
  product: FittableProduct,
  context: FitContext = "tile",
): FitRule {
  const rule = resolveFit(product.categorySlug ?? null);
  const phys = physicalScaleFor(product);
  const gain = context === "detail" ? DETAIL_GAIN : 1;

  if (!phys.measured) {
    // Small centred objects keep their layout mode; real size only nudges how
    // much of the tile they claim, so a crate still out-masses a votive.
    const rel = relativeMassFor(product);
    return withGain(
      rel === 1
        ? rule
        : {
            ...rule,
            primaryTarget: rule.primaryTarget * rel,
            fallback: { ...rule.fallback, scale: rule.fallback.scale * rel },
          },
      gain,
    );
  }


  return withGain(
    {
      ...rule,
      primary: "area",
      aspectBlend: undefined,
      refAspect: undefined,
      primaryTarget: baseArea(rule) * phys.size,
      secondaryMax: baseHeight(rule) * phys.height,
      widthMax: baseWidth(rule),
      // Real height drives the ceiling: a genuinely 36" piece may sit a touch
      // taller than a 34" one, and nothing may exceed the category headroom.
      //
      // The ceiling must not be tighter than the area target itself, or tall
      // narrow pieces (chairs, bar carts, floor lamps) get height-clipped below
      // the mass they were assigned while wide pieces beside them reach theirs
      // in full — which is exactly how a row of chairs ends up looking like
      // dollhouse furniture next to a sofa.
      heightMax: Math.min(
        baseHeight(rule),
        Math.max(baseHeight(rule) * phys.height, baseArea(rule) * phys.size),
      ),
      // Caps are the governing constraint once real dimensions are known, so the
      // category floor must not out-vote them (that floor was what let a tall
      // loveseat keep towering over the sofa beside it).
      clampMin: Math.min(rule.clampMin, 0.3),
    },
    gain,
  );
}



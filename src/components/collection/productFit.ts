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
import { physicalScaleFor, type ScalableProduct } from "./productPhysicalScale";

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

export function resolveProductFit(product: FittableProduct): FitRule {
  const rule = resolveFit(product.categorySlug ?? null);
  const phys = physicalScaleFor(product);

  if (!phys.measured) return rule;

  return {
    ...rule,
    primary: "area",
    aspectBlend: undefined,
    refAspect: undefined,
    primaryTarget: baseArea(rule) * phys.size,
    secondaryMax: baseHeight(rule) * phys.height,
    widthMax: baseWidth(rule),
    // Real height drives the ceiling: a genuinely 36" piece may sit a touch
    // taller than a 34" one, and nothing may exceed the category headroom.
    heightMax: Math.min(baseHeight(rule), baseHeight(rule) * 0.72 * phys.height),
  };
}

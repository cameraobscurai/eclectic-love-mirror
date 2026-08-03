/**
 * Single source of truth for product silhouette fit.
 *
 * Every surface that renders a product silhouette (browse grid, viewport wall,
 * admin photo manager) resolves its FitRule here. There is exactly one path:
 * category rule → physical-width scale → FitRule. No per-surface solvers, no
 * legacy area/width branch.
 */

import type { FitRule } from "./categoryFit";
import { resolveFit } from "./categoryFit";
import { physicalScale, type ScalableProduct } from "./productPhysicalScale";

export type FittableProduct = ScalableProduct;

/**
 * Category fit rule with the item's real-world width scale folded in, so a 52"
 * loveseat never carries the same visual mass as a 98" sofa.
 */
export function resolveProductFit(product: FittableProduct): FitRule {
  const rule = resolveFit(product.categorySlug ?? null);
  const scale = physicalScale(product);
  if (scale === 1) return rule;

  return {
    ...rule,
    primaryTarget: rule.primaryTarget * scale,
    secondaryMax: rule.secondaryMax * scale,
    clampMin: rule.clampMin * scale,
    clampMax: rule.clampMax * scale,
    fallback: {
      ...rule.fallback,
      scale: rule.fallback.scale * scale,
    },
  };
}

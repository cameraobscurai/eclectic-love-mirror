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
  absoluteFitFor,
  isHeightUniformShelf,
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
 * Height fractions are fractions of FRAME HEIGHT, so a wider (shorter) frame
 * would silently shrink every height-driven silhouette. Re-express them against
 * the base frame so frame shape changes whitespace only, never size.
 */
function withFrame(rule: FitRule, frameAspect: number): FitRule {
  const k = frameAspect / BASE_FRAME_ASPECT;
  if (k === 1) return rule;
  const cap = (v: number) => Math.min(0.97, v * k);
  return {
    ...rule,
    primaryTarget:
      rule.primary === "height"
        ? cap(rule.primaryTarget)
        : rule.primary === "area"
          ? rule.primaryTarget * Math.sqrt(k)
          : rule.primaryTarget,
    secondaryMax: rule.primary === "width" ? cap(rule.secondaryMax) : rule.secondaryMax,
    heightMax: rule.heightMax != null ? cap(rule.heightMax) : undefined,
    fallback: { ...rule.fallback, scale: rule.fallback.scale * Math.sqrt(k) },
  };
}

export function resolveProductFit(
  product: FittableProduct,
  context: FitContext = "tile",
  frameAspect: number = BASE_FRAME_ASPECT,
): FitRule {
  const rule = resolveFit(product.categorySlug ?? null);
  const phys = physicalScaleFor(product);
  const gain = context === "detail" ? DETAIL_GAIN : 1;
  const frame = (r: FitRule) => withFrame(r, frameAspect);

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

  // Measured pieces are solved on ABSOLUTE real-world size — but on MASS, not
  // on a literal W x H box.
  //
  // Catalog inches describe the piece straight-on; the photo is a 3/4 view, so
  // the silhouette aspect never equals W/H. Forcing both axes made whichever
  // axis disagreed the binding one: INDIWIN (91"W x 25"H, aspect 3.6) got a
  // 0.27-tall box, its 2.5-aspect photo hit that height first, and it rendered
  // 25% narrower than a smaller sofa. Matching the scale model's AREA keeps
  // "bigger is always bigger" while letting each photo keep its own aspect.
  const abs = absoluteFitFor(product);
  const widthTarget = abs ? abs.width : Math.min(0.97, baseWidth(rule) * phys.width);
  const heightCap = abs
    ? abs.height
    : Math.min(baseHeight(rule), baseHeight(rule) * phys.height);

  if (abs) {
    // Height-invariant shelves (bars, stools, dining tables, sofas) render at
    // MATCHED height and differ only in width — the way they actually sit in a
    // room. Everything else matches mass and keeps its own aspect.
    if (isHeightUniformShelf(product)) {
      return withGain(
        {
          ...rule,
          primary: "height",
          aspectBlend: undefined,
          refAspect: undefined,
          primaryTarget: abs.heightUniform,
          secondaryMax: 0.97,
          widthMax: 0.97,
          heightMax: abs.heightUniform,
          clampMin: Math.min(rule.clampMin, 0.3),
        },
        gain,
      );
    }

    const areaTarget = Math.sqrt(abs.width * abs.height);

    return withGain(
      {
        ...rule,
        primary: "area",
        aspectBlend: undefined,
        refAspect: undefined,
        primaryTarget: areaTarget,
        secondaryMax: 0.97,
        // Ceilings only — they stop an extreme silhouette from overflowing the
        // tile, they no longer dictate the size.
        widthMax: 0.97,
        heightMax: 0.74,
        clampMin: Math.min(rule.clampMin, 0.3),
      },
      gain,
    );
  }


  return withGain(
    {
      ...rule,
      primary: "width",
      aspectBlend: undefined,
      refAspect: undefined,
      primaryTarget: widthTarget,
      secondaryMax: heightCap,
      widthMax: widthTarget,
      heightMax: heightCap,
      // Caps are the governing constraint once real dimensions are known, so the
      // category floor must not out-vote them.
      clampMin: Math.min(rule.clampMin, 0.3),
    },
    gain,
  );
}






import type { CollectionProduct } from "@/lib/phase3-catalog";

export function parseWidthInches(dimensions: string | null | undefined): number | null {
  if (!dimensions) return null;
  const widthMatch = dimensions.match(/(\d+(?:\.\d+)?)\s*(?:"|in)?\s*w\b/i);
  if (widthMatch) return Number(widthMatch[1]);

  const firstDimension = dimensions.match(/(\d+(?:\.\d+)?)/);
  return firstDimension ? Number(firstDimension[1]) : null;
}

export function physicalScale(product: CollectionProduct): number {
  if (product.categorySlug !== "seating") return 1;

  const width = parseWidthInches(product.dimensions);
  if (!width) return 1;

  // Seating must read by real inventory width, not photo aspect ratio. A 52"
  // loveseat should never occupy the same visual mass as a 98" sofa.
  return Math.max(0.64, Math.min(1, width / 78));
}
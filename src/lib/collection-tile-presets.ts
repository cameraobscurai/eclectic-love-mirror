/**
 * Per-browse-group tile presets.
 *
 * Every product silhouette falls into one of four families:
 *  - WIDE_LOW: 3:1+ landscape, sits on baseline (sofas, coffee tables, rugs)
 *  - TALL_NARROW: portrait/vertical (lamps, side tables, large decor)
 *  - SMALL_OBJECT: ~1:1 single piece (plates, pillows, accents)
 *  - MIXED: range of silhouettes within the group (chairs, dining)
 *
 * Each family tunes three knobs that together produce a unified row baseline:
 *  - mediaH: the cell height (CSS clamp), wired into --archive-tile-media-h
 *  - pad:    inset around the image inside the cell
 *  - anchor: object-position for object-contain
 */

import type { BrowseGroupId } from "./collection-taxonomy";

export type TilePreset = {
  mediaH: string;
  pad: string;
  anchor: "bottom" | "center";
};

const WIDE_LOW: TilePreset = {
  mediaH: "clamp(180px, 13vw, 230px)",
  pad: "pt-[10%] pb-[3%] px-[8%]",
  anchor: "bottom",
};

const TALL_NARROW: TilePreset = {
  mediaH: "clamp(260px, 19vw, 340px)",
  pad: "p-[6%]",
  anchor: "bottom",
};

const SMALL_OBJECT: TilePreset = {
  mediaH: "clamp(200px, 14vw, 260px)",
  pad: "p-[14%]",
  anchor: "center",
};

const MIXED: TilePreset = {
  mediaH: "clamp(220px, 15vw, 280px)",
  pad: "pt-[6%] pb-[3%] px-[6%]",
  anchor: "bottom",
};

// Dining is mixed (chairs + tables) but tables dominate visually and
// pedestal/round tables blow past the MIXED cap. Tighten cap + heavier
// top pad so tall silhouettes shrink to the row baseline.
const DINING: TilePreset = {
  mediaH: "clamp(190px, 13.5vw, 240px)",
  pad: "pt-[12%] pb-[3%] px-[7%]",
  anchor: "bottom",
};

export const TILE_PRESETS: Record<BrowseGroupId, TilePreset> = {
  // Wide-low
  sofas: WIDE_LOW,
  "benches-ottomans": WIDE_LOW,
  "coffee-tables": WIDE_LOW,
  "cocktail-tables": WIDE_LOW,
  rugs: WIDE_LOW,
  "furs-pelts": WIDE_LOW,

  // Tall-narrow
  "side-tables": TALL_NARROW,
  lighting: TALL_NARROW,
  "large-decor": TALL_NARROW,
  bar: TALL_NARROW,
  storage: TALL_NARROW,

  // Small object
  pillows: SMALL_OBJECT,
  throws: SMALL_OBJECT,
  tableware: SMALL_OBJECT,
  serveware: SMALL_OBJECT,
  styling: SMALL_OBJECT,
  accents: SMALL_OBJECT,

  // Mixed
  chairs: MIXED,
  dining: DINING,
};

const HEIGHT_RANK: Record<string, number> = {
  [WIDE_LOW.mediaH]: 0,
  [DINING.mediaH]: 1,
  [SMALL_OBJECT.mediaH]: 2,
  [MIXED.mediaH]: 3,
  [TALL_NARROW.mediaH]: 4,
};

const DEFAULT_PRESET = MIXED;

export function getTilePreset(group: BrowseGroupId | null | undefined): TilePreset {
  if (!group) return DEFAULT_PRESET;
  return TILE_PRESETS[group] ?? DEFAULT_PRESET;
}

/**
 * Cell-height ordering — smaller index = shorter cap. When a batch contains
 * multiple families, the grid picks the SHORTEST cap among present families
 * so wide-low silhouettes don't get visually crushed by tall-narrow neighbors.
 */
const HEIGHT_RANK: Record<string, number> = {
  [WIDE_LOW.mediaH]: 0,
  [SMALL_OBJECT.mediaH]: 1,
  [MIXED.mediaH]: 2,
  [TALL_NARROW.mediaH]: 3,
};

export function pickBatchMediaHeight(
  groups: Array<BrowseGroupId | null | undefined>,
): string | null {
  let bestRank = Infinity;
  let bestH: string | null = null;
  for (const g of groups) {
    const h = getTilePreset(g).mediaH;
    const rank = HEIGHT_RANK[h] ?? 99;
    if (rank < bestRank) {
      bestRank = rank;
      bestH = h;
    }
  }
  return bestH;
}

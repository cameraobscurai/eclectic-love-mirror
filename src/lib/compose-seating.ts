/**
 * Pure composition solver for /compose.
 *
 * Given a target seat count, a library of vignettes, and current stock,
 * greedily stacks vignettes in round-robin order until the seat target is
 * met or stock runs out. Deterministic and unit-testable.
 *
 * No I/O, no imports beyond the local Vignette type.
 */

import type { Vignette } from "@/content/vignettes";

export type Placement = { vignette: Vignette; count: number };

export type ComposeResult = {
  placed: Placement[];
  /** rms_id → total units consumed across the composition. */
  usedByRmsId: Record<string, number>;
  totalSeats: number;
  /** True when stock ran out before the target was reached. */
  capped: boolean;
};

/**
 * Compose seating.
 *
 * @param targetSeats  Guest count the composition must try to hit.
 * @param vignettes    Ordered list to draw from. Round-robin honors this order.
 * @param stockByRmsId Available units per rms_id at compose time.
 */
export function composeSeating(
  targetSeats: number,
  vignettes: Vignette[],
  stockByRmsId: Record<string, number>,
): ComposeResult {
  const remaining: Record<string, number> = { ...stockByRmsId };
  const countByVignette = new Map<string, number>();
  let totalSeats = 0;
  let capped = false;

  if (targetSeats <= 0 || vignettes.length === 0) {
    return { placed: [], usedByRmsId: {}, totalSeats: 0, capped: false };
  }

  // Filter to vignettes whose every needed rms_id has at least one unit at
  // start. Vignettes referencing missing ids are dropped up front — the
  // caller (route) also warns; here we just refuse to place them.
  const eligible = vignettes.filter((v) =>
    Object.entries(v.need).every(([rmsId, qty]) => (remaining[rmsId] ?? 0) >= qty),
  );

  if (eligible.length === 0) {
    return { placed: [], usedByRmsId: {}, totalSeats: 0, capped: true };
  }

  // Round-robin. Each pass tries to place one instance of each vignette in
  // declared order. Stop when target met, or a full pass places nothing.
  outer: while (totalSeats < targetSeats) {
    let placedThisPass = false;
    for (const v of eligible) {
      if (totalSeats >= targetSeats) break outer;
      const canPlace = Object.entries(v.need).every(
        ([rmsId, qty]) => (remaining[rmsId] ?? 0) >= qty,
      );
      if (!canPlace) continue;
      for (const [rmsId, qty] of Object.entries(v.need)) {
        remaining[rmsId] = (remaining[rmsId] ?? 0) - qty;
      }
      countByVignette.set(v.id, (countByVignette.get(v.id) ?? 0) + 1);
      totalSeats += v.seats;
      placedThisPass = true;
    }
    if (!placedThisPass) {
      capped = true;
      break;
    }
  }

  const placed: Placement[] = eligible
    .filter((v) => (countByVignette.get(v.id) ?? 0) > 0)
    .map((v) => ({ vignette: v, count: countByVignette.get(v.id)! }));

  const usedByRmsId: Record<string, number> = {};
  for (const { vignette, count } of placed) {
    for (const [rmsId, qty] of Object.entries(vignette.need)) {
      usedByRmsId[rmsId] = (usedByRmsId[rmsId] ?? 0) + qty * count;
    }
  }

  return { placed, usedByRmsId, totalSeats, capped };
}

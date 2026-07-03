/**
 * Curated seating vignettes for the Compose tool.
 *
 * A vignette = a small, repeatable grouping (e.g. "one sofa + two chairs +
 * a coffee table") that seats a known number of guests. Compose stacks these
 * to hit a target seat count, respecting live stock.
 *
 * ── HOW TO EDIT ──────────────────────────────────────────────────────────
 * - Add or remove entries here. No other file needs to change.
 * - `need` maps rms_id → quantity. Use real RMS ids (they're the same value
 *   as CollectionProduct.id). If a vignette references an rms_id that no
 *   longer exists in the catalog, /compose logs a console.warn and skips it
 *   without crashing.
 * - `seats` is the honest guest-count this vignette holds. Round down; err
 *   toward comfort.
 * - `note` is a one-line curator caption shown under the vignette card.
 *
 * The entries below are PLACEHOLDER shapes so the tool ships and the UI can
 * be reviewed. Real curation happens in a follow-up content pass.
 */

export type Vignette = {
  id: string;
  name: string;
  seats: number;
  /** rms_id → quantity needed for one instance of this vignette. */
  need: Record<string, number>;
  note?: string;
};

export const VIGNETTES: Vignette[] = [
  {
    id: "intimate-four",
    name: "Intimate Four",
    seats: 4,
    // TODO(darian): replace with real rms_ids — do not invent real-looking ones.
    need: {
      "PLACEHOLDER-SOFA-01": 1,
      "PLACEHOLDER-CHAIR-01": 2,
      "PLACEHOLDER-COFFEE-01": 1,
    },
    note: "One sofa, two chairs, coffee table. Reads as one conversation.",
  },
  {
    id: "lounge-cluster-six",
    name: "Lounge Cluster",
    seats: 6,
    // TODO(darian): replace with real rms_ids — do not invent real-looking ones.
    need: {
      "PLACEHOLDER-SOFA-02": 1,
      "PLACEHOLDER-CHAIR-02": 2,
      "PLACEHOLDER-OTTOMAN-01": 2,
      "PLACEHOLDER-SIDE-01": 2,
    },
    note: "Sofa anchor, paired lounge chairs, ottomans double as extra seats.",
  },
  {
    id: "banquette-eight",
    name: "Banquette Eight",
    seats: 8,
    // TODO(darian): replace with real rms_ids — do not invent real-looking ones.
    need: {
      "PLACEHOLDER-BANQUETTE-01": 1,
      "PLACEHOLDER-CHAIR-03": 4,
      "PLACEHOLDER-COFFEE-02": 1,
    },
    note: "Long banquette opposite four chairs. Cocktail-height gathering.",
  },
  {
    id: "salon-twelve",
    name: "Salon Twelve",
    seats: 12,
    // TODO(darian): replace with real rms_ids — do not invent real-looking ones.
    need: {
      "PLACEHOLDER-SOFA-03": 2,
      "PLACEHOLDER-CHAIR-04": 4,
      "PLACEHOLDER-OTTOMAN-02": 4,
      "PLACEHOLDER-COFFEE-03": 2,
    },
    note: "Two facing sofas, flanking chairs, ottomans between. Large-format lounge.",
  },
];

/**
 * ATELIER IMAGE SLOTS — HARD MAPPING. DO NOT REASSIGN CASUALLY.
 *
 * Each constant below is a NAMED SLOT on the /atelier page. The slot name
 * describes WHERE the image renders on screen. The import path describes
 * WHICH file fills it. To change an image you must:
 *   1. Replace the file at the existing import path (keep filename), OR
 *   2. Update exactly ONE constant here — never swap imports inline in the
 *      route file.
 *
 * Slot map (top of page → bottom):
 *   HERO_IMAGE        → top-of-page hero, right column, 4:5 portrait.
 *                        Section: "01 — INTRODUCTION". Above the fold.
 *   HIVE_TRIPTYCH     → wide 3:1 triptych under "L'ATELIER" eyebrow.
 *                        Three-panel exterior/atrium/offices composition.
 *   SKETCH_DRAPE      → bottom row, LEFT tile, 4:5. Hand-drawn chair sketch.
 *   WORKSHOP_COLLAGE  → bottom row, RIGHT tile, 4:5. B&W workshop collage.
 *
 * If you are about to edit this file because a previous swap put an image
 * in the wrong slot: re-read the slot comments above before changing
 * anything. The hero is NOT the triptych. The triptych is NOT the collage.
 */

import atelierHero from "@/assets/atelier-replacement.jpg?preset=hero";
import atelierHiveTriptych from "@/assets/atelier/atelier-hive-triptych.jpeg?preset=editorial";
import atelierSketchDrape from "@/assets/atelier/atelier-sketch-drape.png?preset=editorial";
import atelierCollage from "@/assets/atelier/atelier-collage.jpg?preset=editorial";

export const ATELIER_IMAGES = {
  /** Top-of-page hero, right column, 4:5 portrait. */
  HERO_IMAGE: atelierHero,
  /** Wide 3:1 triptych under "L'ATELIER" eyebrow. */
  HIVE_TRIPTYCH: atelierHiveTriptych,
  /** Bottom row, LEFT tile, 4:5. Hand-drawn chair sketch on drape. */
  SKETCH_DRAPE: atelierSketchDrape,
  /** Bottom row, RIGHT tile, 4:5. B&W workshop collage. */
  WORKSHOP_COLLAGE: atelierCollage,
} as const;

export const ATELIER_IMAGE_ALT = {
  HERO_IMAGE: "Atelier moodboard — tasseled bench portrait taped beside antique linen, French silk, and Mruday snow sheer fabric swatches.",
  HIVE_TRIPTYCH:
    "The Hive — exterior signage, interior atrium with steel mezzanine, and studio offices.",
  SKETCH_DRAPE: "Hand-drawn chair sketch on hanging drape — design phase.",
  WORKSHOP_COLLAGE:
    "Studio collage — fabrication, sketching, and finished detail.",
} as const;

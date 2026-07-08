// Build the page list for a style board deck. Pure data. No React.
import type { PublicStyleBoard, PublicPinnedItem } from "./studio.functions";

export type PaletteSwatch = { hex: string; name?: string };

export interface DeckMeta {
  clientName: string;
  preparedBy: string;
  date: string;
  projectTitle: string;
}

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Derive an editorial project title from the board itself — never hardcoded.
export function deriveProjectTitle(board: PublicStyleBoard): string {
  const swatches = (board.palette as unknown as PaletteSwatch[]).filter((s) => s && s.hex);
  const named = swatches.map((s) => s.name?.trim()).filter((n): n is string => Boolean(n));
  if (named.length >= 2) {
    return `A Study in ${titleCase(named[0])} & ${titleCase(named[1])}`;
  }
  if (named.length === 1) {
    return `A Study in ${titleCase(named[0])}`;
  }
  const label = toneLabel(board.tones as Record<string, unknown>);
  if (label) return `A ${label.split(" · ").map(titleCase).join(", ")} Study`;
  return "Style Guide";
}

export type DeckPage =
  | { kind: "cover"; cover: PublicPinnedItem | null }
  | { kind: "mood-hero"; images: Array<{ url: string; alt: string }> }
  | { kind: "statement"; eyebrow: string; body: string }
  | { kind: "palette"; swatches: PaletteSwatch[] }
  | { kind: "tones"; label: string }
  | { kind: "section-divider"; word: string; bgImages: string[] }
  | { kind: "production"; categorySlug: string; categoryLabel: string; items: PublicPinnedItem[]; note: string }
  | { kind: "closing"; body: string };

// Fixed category order — categories absent from a board are skipped.
export const CATEGORY_ORDER = [
  "seating",
  "lighting",
  "rugs",
  "pillows-throws",
  "tableware",
  "serveware",
  "styling",
  "candlelight",
  "chandeliers",
  "large-decor",
  "storage",
  "furs-pelts",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  seating: "Seating",
  lighting: "Lighting",
  rugs: "Rugs",
  "pillows-throws": "Pillows & Throws",
  tableware: "Tableware",
  serveware: "Serveware",
  styling: "Styling",
  candlelight: "Candlelight",
  chandeliers: "Chandeliers",
  "large-decor": "Large Decor",
  storage: "Storage",
  "furs-pelts": "Furs & Pelts",
};

// Asymmetric production grid — col + row spans on a 12-col grid.
// Counts 1-6 are hand-tuned to mimic real Eclectic Hive proposal pages.
// 7+ tiles uniformly in a 4-col grid.
export const GRID_PATTERNS: Record<number, { col: string; row: string }[]> = {
  1: [{ col: "col-span-12", row: "row-span-2" }],
  2: [
    { col: "col-span-7", row: "row-span-2" },
    { col: "col-span-5", row: "row-span-2" },
  ],
  3: [
    { col: "col-span-7", row: "row-span-2" },
    { col: "col-span-5", row: "row-span-1" },
    { col: "col-span-5", row: "row-span-1" },
  ],
  4: [
    { col: "col-span-6", row: "row-span-2" },
    { col: "col-span-6", row: "row-span-1" },
    { col: "col-span-3", row: "row-span-1" },
    { col: "col-span-3", row: "row-span-1" },
  ],
  5: [
    { col: "col-span-7", row: "row-span-2" },
    { col: "col-span-5", row: "row-span-1" },
    { col: "col-span-5", row: "row-span-1" },
    { col: "col-span-6", row: "row-span-1" },
    { col: "col-span-6", row: "row-span-1" },
  ],
  6: [
    { col: "col-span-6", row: "row-span-2" },
    { col: "col-span-3", row: "row-span-1" },
    { col: "col-span-3", row: "row-span-1" },
    { col: "col-span-4", row: "row-span-1" },
    { col: "col-span-4", row: "row-span-1" },
    { col: "col-span-4", row: "row-span-1" },
  ],
};

export function spansFor(count: number) {
  if (count <= 6 && count >= 1) return GRID_PATTERNS[count];
  return Array.from({ length: count }, () => ({ col: "col-span-3", row: "row-span-1" }));
}

export function toneLabel(tones: Record<string, unknown>): string {
  const num = (k: string) => (typeof tones[k] === "number" ? (tones[k] as number) : 0);
  const warm = num("warm"), cool = num("cool");
  const muted = num("muted"), saturated = num("saturated");
  const light = num("light"), dark = num("dark");
  const parts: string[] = [];
  if (warm > cool) parts.push("Warm");
  else if (cool > warm) parts.push("Cool");
  else parts.push("Balanced");
  if (muted > saturated) parts.push("muted");
  else if (saturated > muted) parts.push("saturated");
  if (dark > light * 1.4) parts.push("low-key");
  else if (light > dark * 1.4) parts.push("high-key");
  return parts.join(" · ");
}

export function buildPages(board: PublicStyleBoard, meta: DeckMeta): DeckPage[] {
  const pages: DeckPage[] = [];

  // Resolve cover
  const coverId =
    (board as unknown as { cover_pinned_rms_id?: string | null }).cover_pinned_rms_id ?? null;
  const cover =
    (coverId ? board.pinned.find((p) => p.rms_id === coverId) : null) ??
    board.pinned[0] ??
    null;

  pages.push({ kind: "cover", cover });

  // Mood hero — use client's inspiration whenever they gave us any; only fall
  // back to pinned inventory when zero inspo. The old `>= 3` threshold made
  // 1–2 inspo boards silently show furniture instead of the client's vision.
  const heroImgs = (board.inspo.length >= 1
    ? board.inspo.slice(0, Math.min(3, board.inspo.length)).map((i) => ({ url: i.url, alt: "" }))
    : board.pinned
        .filter((p) => p.image_url)
        .slice(0, 3)
        .map((p) => ({ url: p.image_url as string, alt: p.title }))
  ).filter((x) => x.url);

  if (heroImgs.length > 0) {
    pages.push({ kind: "mood-hero", images: heroImgs });
  }

  // Statement page(s) from curator notes (split on blank lines, max 3 pages)
  if (board.curator_notes && board.curator_notes.trim()) {
    const paragraphs = board.curator_notes
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    for (const body of paragraphs) {
      pages.push({ kind: "statement", eyebrow: "Direction", body });
    }
  }

  // Palette
  const swatches = (board.palette as unknown as PaletteSwatch[]).filter((s) => s && s.hex);
  if (swatches.length) {
    pages.push({ kind: "palette", swatches });
  }

  // Tones
  const label = toneLabel(board.tones as Record<string, unknown>);
  if (label) pages.push({ kind: "tones", label });

  // Section divider — word is AI-generated at send time, falls back to "Pieces"
  const bgImages = board.pinned
    .filter((p) => p.image_url)
    .slice(0, 12)
    .map((p) => p.image_url as string);
  if (bgImages.length) {
    const word = board.section_word?.trim() || "Pieces";
    pages.push({ kind: "section-divider", word, bgImages });
  }

  // Production pages — one per category in fixed order
  const byCategory = new Map<string, PublicPinnedItem[]>();
  for (const item of board.pinned) {
    const slug = item.category ?? "other";
    const arr = byCategory.get(slug) ?? [];
    arr.push(item);
    byCategory.set(slug, arr);
  }
  const orderedSlugs = [
    ...CATEGORY_ORDER.filter((s) => byCategory.has(s)),
    ...Array.from(byCategory.keys()).filter(
      (s) => !(CATEGORY_ORDER as readonly string[]).includes(s),
    ),
  ];
  for (const slug of orderedSlugs) {
    const items = byCategory.get(slug)!;
    pages.push({
      kind: "production",
      categorySlug: slug,
      categoryLabel: CATEGORY_LABELS[slug] ?? slug.replace(/-/g, " "),
      items,
      note: board.production_notes?.[slug]?.trim() ?? "",
    });
  }

  // Closing
  pages.push({
    kind: "closing",
    body: `Prepared for ${meta.clientName} · ${meta.date}`,
  });

  return pages;
}

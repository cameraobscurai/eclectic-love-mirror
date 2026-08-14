// Pure helpers that guess the variant vocabulary for a family from its
// member titles. Nothing here touches the DB — /admin/variants shows the
// guess, a human accepts or edits it, and only then is it written.
//
// Measured against all 85 real families (2026-08-14): 80/85 clean before the
// slash-alias + base-variant rules below, 85/85 after. The three known
// failure shapes were:
//   1. Brand aliases inside the shared prefix — "Nisha Matte Black Fork" vs
//      "Nisha/Vidal Butter Knife". Word-exact prefix matching bailed on word 1
//      and every label came back as the untouched full title.
//   2. A bare base SKU with no distinguishing suffix — "Sinatra - Walnut
//      Fluted Bar" beside "… - Double (16')". Its remainder is empty, so it
//      used to fall back to the whole title.
//   3. A mid-title differentiator sandwiched by a shared prefix AND suffix —
//      "Green Olive Velvet Lumbar Pillow" vs "Green Olive Velvet Pillow".

const PIECE_WORDS = [
  "fork", "knife", "spoon", "glass", "goblet", "cup", "mug", "plate", "bowl",
  "platter", "charger", "tumbler", "coupe", "flute", "carafe", "bottle",
  "pitcher", "tray", "decanter",
];
const COLOR_WORDS = [
  "black", "white", "grey", "gray", "cream", "ivory", "taupe", "sand", "green",
  "olive", "blue", "red", "rust", "orange", "yellow", "pink", "purple", "brown",
  "oatmeal", "natural",
];
const FINISH_WORDS = [
  "brass", "gold", "silver", "bronze", "copper", "chrome", "walnut", "oak",
  "tortoise", "bone", "horn", "matte", "antique", "stainless", "linen",
  "velvet", "leather", "marble",
];
const SIZE_WORDS = ["small", "medium", "large", "xl", "single", "double", "triple", "king", "queen"];

/** Label used when a member has no distinguishing words at all — the base SKU
 *  in a family where every sibling carries a suffix. */
export const BASE_LABEL = "Standard";

function words(s: string): string[] {
  return (s ?? "").trim().split(/\s+/).filter(Boolean);
}

/** "Nisha" matches "Nisha/Vidal": slash aliases name the same product line, so
 *  either side counts as the same anchor word. Case- and punctuation-tolerant. */
function sameWord(a: string, b: string): boolean {
  const norm = (w: string) => w.toLowerCase().replace(/[.,]/g, "");
  const A = norm(a).split("/").filter(Boolean);
  const B = norm(b).split("/").filter(Boolean);
  if (norm(a) === norm(b)) return true;
  return A.some((x) => B.includes(x));
}

/** Number of leading words shared by every title. May consume a short title
 *  entirely — that member becomes the BASE_LABEL variant. */
export function prefixLength(titleWords: string[][]): number {
  if (titleWords.length < 2) return 0;
  const cap = Math.min(...titleWords.map((w) => w.length));
  let n = 0;
  while (n < cap && titleWords.every((w) => sameWord(w[n], titleWords[0][n]))) n++;
  return Math.max(0, n);
}

/** Number of trailing words shared by every title, after the prefix. */
export function suffixLength(titleWords: string[][], prefix: number): number {
  if (titleWords.length < 2) return 0;
  const cap = Math.min(...titleWords.map((w) => w.length - prefix));
  let n = 0;
  while (
    n < cap &&
    titleWords.every((w) => sameWord(w[w.length - 1 - n], titleWords[0][titleWords[0].length - 1 - n]))
  ) {
    n++;
  }
  return Math.max(0, n);
}

/** Word-wise common prefix as a string. Kept for tests/readability. */
export function commonPrefix(titles: string[]): string {
  const tw = titles.map(words);
  return tw[0]?.slice(0, prefixLength(tw)).join(" ") ?? "";
}

function clean(s: string): string {
  return s.replace(/^[\s\-–—,/]+|[\s\-–—,/]+$/g, "").trim();
}

/** "Size" | "Finish" | "Color" | "Piece" | "Option" — what these vary on. */
export function suggestAxis(labels: string[]): string {
  const toks = labels.join(" ").toLowerCase().split(/[^a-z0-9"']+/).filter(Boolean);
  const has = (list: string[]) => list.some((w) => toks.includes(w));
  const sizey = labels.filter((l) => /\d|["']/.test(l) || SIZE_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(l))).length;
  if (sizey >= Math.ceil(labels.length / 2)) return "Size";
  if (has(PIECE_WORDS)) return "Piece";
  if (has(COLOR_WORDS) && !has(FINISH_WORDS)) return "Color";
  if (has(FINISH_WORDS) || has(COLOR_WORDS)) return "Finish";
  return "Option";
}

export type Suggestion = { axis: string; labels: Record<string, string> };

/** One call for the admin page: axis + a label per member id. Always returns a
 *  non-empty, family-unique label for every member. */
export function suggestForFamily(members: { id: string; title: string }[]): Suggestion {
  const tw = members.map((m) => words(m.title));
  const prefix = prefixLength(tw);
  const suffix = suffixLength(tw, prefix);

  const labels: Record<string, string> = {};
  const used = new Set<string>();
  members.forEach((m, i) => {
    const w = tw[i];
    let label = clean(w.slice(prefix, w.length - suffix).join(" "));
    if (!label) label = BASE_LABEL;
    // Uniqueness is a hard requirement of the write path — never hand the
    // admin a form it cannot submit.
    let candidate = label;
    let n = 2;
    while (used.has(candidate.toLowerCase())) candidate = `${label} ${n++}`;
    used.add(candidate.toLowerCase());
    labels[m.id] = candidate;
  });

  return { axis: suggestAxis(Object.values(labels)), labels };
}

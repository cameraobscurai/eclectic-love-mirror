// Pure helpers that guess the variant vocabulary for a family from its
// member titles. Nothing here touches the DB — the admin page shows the
// guess, a human accepts or edits it, and only then is it written.

const PIECE_WORDS = [
  "fork", "knife", "spoon", "glass", "cup", "mug", "plate", "bowl", "platter",
  "tumbler", "coupe", "flute", "carafe", "bottle", "pitcher", "tray",
];
const FINISH_WORDS = [
  "black", "white", "brass", "gold", "silver", "bronze", "copper", "chrome",
  "walnut", "oak", "natural", "ivory", "cream", "green", "blue", "rust",
  "tortoise", "bone", "horn", "matte", "antique", "stainless", "linen",
];

function words(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

/** Longest word-wise common prefix across all titles. */
export function commonPrefix(titles: string[]): string {
  if (titles.length < 2) return "";
  const parts = titles.map(words);
  const out: string[] = [];
  for (let i = 0; i < parts[0].length; i++) {
    const w = parts[0][i];
    if (parts.every((p) => (p[i] ?? "").toLowerCase() === w.toLowerCase())) out.push(w);
    else break;
  }
  // Never swallow the whole title.
  if (out.length >= parts[0].length) out.pop();
  return out.join(" ");
}

/** Longest word-wise common suffix across all titles (after prefix removal). */
export function commonSuffix(titles: string[]): string {
  if (titles.length < 2) return "";
  const parts = titles.map(words);
  const out: string[] = [];
  for (let i = 1; i <= parts[0].length; i++) {
    const w = parts[0][parts[0].length - i];
    if (parts.every((p) => (p[p.length - i] ?? "").toLowerCase() === w.toLowerCase())) out.unshift(w);
    else break;
  }
  if (out.length >= parts[0].length) out.shift();
  return out.join(" ");
}

/** The distinguishing remainder of one title, given the family's shared words. */
export function suggestLabel(title: string, prefix: string, suffix: string): string {
  let t = (title ?? "").trim();
  if (prefix && t.toLowerCase().startsWith(prefix.toLowerCase())) t = t.slice(prefix.length);
  if (suffix && t.toLowerCase().endsWith(suffix.toLowerCase())) t = t.slice(0, t.length - suffix.length);
  t = t.replace(/^[\s\-–—,/]+|[\s\-–—,/]+$/g, "");
  return t || (title ?? "").trim();
}

/** "Size" | "Finish" | "Piece" | "Option" — the axis these variants vary on. */
export function suggestAxis(labels: string[]): string {
  const joined = labels.join(" ").toLowerCase();
  const sizey = labels.filter((l) => /\d|["']|\b(small|medium|large|xl)\b/i.test(l)).length;
  if (sizey >= Math.ceil(labels.length / 2)) return "Size";
  if (PIECE_WORDS.some((w) => joined.includes(w))) return "Piece";
  if (FINISH_WORDS.some((w) => joined.includes(w))) return "Finish";
  return "Option";
}

export type Suggestion = { axis: string; labels: Record<string, string> };

/** One call for the admin page: axis + a label per member id. */
export function suggestForFamily(
  members: { id: string; title: string }[],
): Suggestion {
  const titles = members.map((m) => m.title ?? "");
  const prefix = commonPrefix(titles);
  const suffix = commonSuffix(titles.map((t) => suggestLabel(t, prefix, "")));
  const labels: Record<string, string> = {};
  for (const m of members) labels[m.id] = suggestLabel(m.title ?? "", prefix, suffix);
  return { axis: suggestAxis(Object.values(labels)), labels };
}

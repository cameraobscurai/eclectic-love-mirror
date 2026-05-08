/**
 * Master switch for the Collection wall's drag-to-reorder mode.
 *
 * Flipped on/off from chat — not exposed as a UI toggle. When `true`,
 * tiles in <CollectionWall/> become draggable and the manual order is
 * persisted to localStorage, keyed by the current product set.
 */
export const WALL_DND_ENABLED = true;

const STORAGE_PREFIX = "hive:wall-order:";

/** Stable-ish key for the current filter view: short hash of the product ids. */
export function orderKeyForIds(ids: string[]): string {
  let h = 2166136261 >>> 0;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x2c;
  }
  return STORAGE_PREFIX + (h >>> 0).toString(36) + ":" + ids.length;
}

export function loadOrder(key: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export function saveOrder(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore quota */
  }
}

export function clearOrder(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem(key + ":confirmed");
  } catch {
    /* noop */
  }
}

export function confirmOrder(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
    window.localStorage.setItem(
      key + ":confirmed",
      String(Date.now()),
    );
  } catch {
    /* noop */
  }
}

export function isOrderConfirmed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(key + ":confirmed");
  } catch {
    return false;
  }
}

/**
 * Reorder `products` to match a saved id order. Unknown ids are dropped,
 * and any new products (not in the saved order) are appended in their
 * original relative position.
 */
export function applySavedOrder<T extends { id: string }>(products: T[], saved: string[] | null): T[] {
  if (!saved || saved.length === 0) return products;
  const byId = new Map(products.map((p) => [p.id, p]));
  const used = new Set<string>();
  const out: T[] = [];
  for (const id of saved) {
    const p = byId.get(id);
    if (p && !used.has(id)) {
      out.push(p);
      used.add(id);
    }
  }
  for (const p of products) {
    if (!used.has(p.id)) out.push(p);
  }
  return out;
}

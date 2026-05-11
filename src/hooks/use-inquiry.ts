// Local-storage backed inquiry list. Cross-tab sync via the storage event.
// No server side. Used by the Inventory tray and the contact page.

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const KEY = "hive.inquiry.items.v1";
// Mirrors the DB-level cap (cardinality(item_ids) <= 50). Keep in sync.
export const INQUIRY_MAX = 50;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("hive:inquiry-change"));
}

export function useInquiry() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener("storage", sync);
    window.addEventListener("hive:inquiry-change", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("hive:inquiry-change", sync as EventListener);
    };
  }, []);

  const add = useCallback((id: string) => {
    const cur = read();
    if (!cur.includes(id)) write([...cur, id]);
  }, []);
  const remove = useCallback((id: string) => {
    write(read().filter((x) => x !== id));
  }, []);
  const toggle = useCallback((id: string) => {
    const cur = read();
    if (cur.includes(id)) write(cur.filter((x) => x !== id));
    else write([...cur, id]);
  }, []);
  const clear = useCallback(() => write([]), []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, add, remove, toggle, clear, has, count: ids.length };
}

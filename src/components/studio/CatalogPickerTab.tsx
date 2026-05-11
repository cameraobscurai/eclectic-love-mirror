import { useMemo, useState } from "react";
import { Plus, Check } from "lucide-react";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface Props {
  catalog: Map<string, CollectionProduct>;
  pinned: string[];
  onPin: (rmsId: string) => void;
  onUnpin: (rmsId: string) => void;
}

export function CatalogPickerTab({ catalog, pinned, onPin, onUnpin }: Props) {
  const [q, setQ] = useState("");
  const all = useMemo(() => Array.from(catalog.values()).filter((p) => p.publicReady), [catalog]);
  const pinSet = useMemo(() => new Set(pinned), [pinned]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? all.filter((p) =>
          p.title.toLowerCase().includes(term) ||
          p.displayCategory.toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term))
      : all;
    return list.slice(0, 60);
  }, [q, all]);

  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="SEARCH PIECES…"
        className="w-full bg-transparent border-b border-charcoal/20 px-1 py-2 text-[11px] uppercase tracking-[0.22em] placeholder:text-charcoal/35 focus:outline-none focus:border-charcoal/60"
      />
      <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
        {filtered.length} of {all.length}
      </p>
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((p) => {
            const on = pinSet.has(String(p.id));
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => (on ? onUnpin(String(p.id)) : onPin(String(p.id)))}
                className={`relative aspect-[4/3] bg-charcoal/5 border text-left overflow-hidden group transition-colors ${
                  on ? "border-charcoal/70" : "border-charcoal/10 hover:border-charcoal/40"
                }`}
              >
                {p.primaryImage?.url ? (
                  <img src={p.primaryImage.url} loading="lazy" alt={p.title} className="w-full h-full object-cover" />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-charcoal/55 text-cream px-1.5 py-1 text-[9px] uppercase tracking-[0.18em] truncate">
                  {p.title}
                </div>
                <span className={`absolute top-1.5 right-1.5 w-5 h-5 grid place-items-center ${
                  on ? "bg-charcoal text-cream" : "bg-cream/90 text-charcoal/70"
                }`}>
                  {on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

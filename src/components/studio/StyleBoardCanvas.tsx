import { X } from "lucide-react";
import type { InspoTile } from "@/hooks/use-style-board";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface Props {
  inspo: InspoTile[];
  pinned: string[];
  catalog: Map<string, CollectionProduct>;
  onRemoveInspo: (id: string) => void;
  onUnpin: (rmsId: string) => void;
}

export function StyleBoardCanvas({ inspo, pinned, catalog, onRemoveInspo, onUnpin }: Props) {
  const empty = inspo.length === 0 && pinned.length === 0;
  if (empty) {
    return (
      <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/40 px-1 py-6 text-center">
        Drop inspiration images or pin pieces from the catalog tab to begin
      </p>
    );
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
      {inspo.map((img) => (
        <Tile
          key={img.id}
          src={img.signed_url || ""}
          label="Inspo"
          name={img.name}
          onRemove={() => onRemoveInspo(img.id)}
        />
      ))}
      {pinned.map((rms) => {
        const p = catalog.get(rms);
        const url = p?.primaryImage?.url;
        return (
          <Tile
            key={`inv:${rms}`}
            src={url || ""}
            label="Inv"
            name={p?.title ?? rms}
            onRemove={() => onUnpin(rms)}
          />
        );
      })}
    </div>
  );
}

function Tile({ src, label, name, onRemove }: { src: string; label: string; name: string; onRemove: () => void }) {
  return (
    <div className="relative aspect-[4/3] bg-charcoal/5 border border-charcoal/10 group overflow-hidden">
      {src ? (
        <img src={src} alt={name} loading="lazy" className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="w-full h-full grid place-items-center text-[10px] uppercase tracking-[0.22em] text-charcoal/40">No image</div>
      )}
      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-cream/90 text-[9px] uppercase tracking-[0.22em] text-charcoal/70">
        {label}
      </span>
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-charcoal/55 text-[10px] uppercase tracking-[0.18em] text-cream truncate pointer-events-none">
        {name}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-5 h-5 bg-charcoal/80 text-cream grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

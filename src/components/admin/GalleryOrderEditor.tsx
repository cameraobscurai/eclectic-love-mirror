// ---------------------------------------------------------------------------
// GalleryOrderEditor — drag-reorder all plates in one gallery.
//
// Mirrors the Collection ImageOrderEditor: dnd-kit grid, debounced autosave
// on every drop. The first N plates render with a "HERO" badge so it's
// obvious which images lead the gallery on the public site.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, RotateCcw, Star } from "lucide-react";

import type { GalleryImage } from "@/content/gallery-projects";
import { keyFor } from "@/lib/gallery-orders";
import {
  saveGalleryOrder,
  resetGalleryOrder,
} from "@/lib/gallery-orders.functions";

const HERO_COUNT = 4;

type Props = {
  gallerySlug: string;
  galleryName: string;
  images: GalleryImage[];
  /** Saved order — null when no override exists yet. */
  initialOrderKeys: string[] | null;
  onSaved?: (orderKeys: string[]) => void;
  onReset?: () => void;
};

export function GalleryOrderEditor({
  gallerySlug,
  galleryName,
  images,
  initialOrderKeys,
  onSaved,
  onReset,
}: Props) {
  // Build the initial ordered list — applied saved order if present, else
  // manifest order. Orphans (saved keys not in manifest) are dropped.
  const initial = (() => {
    if (!initialOrderKeys || initialOrderKeys.length === 0) return images;
    const byKey = new Map(images.map((i) => [keyFor(i.src), i]));
    const used = new Set<string>();
    const ordered: GalleryImage[] = [];
    for (const k of initialOrderKeys) {
      const img = byKey.get(k);
      if (img && !used.has(k)) {
        ordered.push(img);
        used.add(k);
      }
    }
    for (const img of images) {
      const k = keyFor(img.src);
      if (!used.has(k)) ordered.push(img);
    }
    return ordered;
  })();

  const [items, setItems] = useState<GalleryImage[]>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useServerFn(saveGalleryOrder);
  const reset = useServerFn(resetGalleryOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const flush = useCallback(
    async (next: GalleryImage[]) => {
      setState("saving");
      try {
        const order_keys = next.map((i) => keyFor(i.src));
        await save({ data: { gallery_slug: gallerySlug, order_keys } });
        setState("saved");
        setErr(null);
        onSaved?.(order_keys);
      } catch (e) {
        setErr((e as Error).message || "Save failed");
        setState("error");
      }
    },
    [gallerySlug, save, onSaved],
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((i) => keyFor(i.src) === active.id);
      const newIdx = prev.findIndex((i) => keyFor(i.src) === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      const next = arrayMove(prev, oldIdx, newIdx);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => flush(next), 400);
      return next;
    });
  };

  const handleReset = async () => {
    if (!confirm(`Reset ${galleryName} to the manifest default?`)) return;
    setState("saving");
    try {
      await reset({ data: { gallery_slug: gallerySlug } });
      setItems(images);
      setState("saved");
      setErr(null);
      onReset?.();
    } catch (e) {
      setErr((e as Error).message || "Reset failed");
      setState("error");
    }
  };

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const ids = items.map((i) => keyFor(i.src));

  return (
    <div className="bg-white border border-charcoal/10">
      <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-charcoal/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-charcoal/45">
            Gallery · {items.length} plates
          </p>
          <h2 className="mt-1 font-display text-2xl uppercase tracking-[0.04em]">
            {galleryName}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <StateBadge state={state} err={err} />
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-charcoal/60 hover:text-charcoal border border-charcoal/20 px-3 py-1.5"
            title="Drop the override; manifest default returns"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </header>

      <div className="p-5">
        <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-charcoal/55">
          First {HERO_COUNT} plates lead the gallery · drag to reorder · autosaves
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {items.map((img, idx) => (
                <Tile key={keyFor(img.src)} img={img} index={idx} isHero={idx < HERO_COUNT} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function StateBadge({
  state,
  err,
}: {
  state: "idle" | "saving" | "saved" | "error";
  err: string | null;
}) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-charcoal/55">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-700">
        Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span
        className="text-[10px] uppercase tracking-[0.22em] text-red-700 truncate max-w-[16rem]"
        title={err ?? ""}
      >
        Error · {err}
      </span>
    );
  }
  return null;
}

function Tile({
  img,
  index,
  isHero,
}: {
  img: GalleryImage;
  index: number;
  isHero: boolean;
}) {
  const id = keyFor(img.src);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square bg-neutral-100 border ${
        isHero ? "border-charcoal border-2" : "border-neutral-300"
      }`}
    >
      <img
        src={img.src}
        alt={img.alt}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {isHero && (
        <span className="absolute top-1 left-1 bg-charcoal text-cream text-[9px] uppercase tracking-widest px-1.5 py-0.5 font-semibold flex items-center gap-0.5">
          <Star className="h-2.5 w-2.5 fill-current" /> Hero
        </span>
      )}
      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 tabular-nums">
        {index + 1}
      </span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-white border border-neutral-300 cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        aria-label={`Reorder plate ${index + 1}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

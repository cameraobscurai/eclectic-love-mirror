// /admin/photos — Squarespace-style admin photo manager.
//
// Mirrors the public Collection grid visually. Sidebar = 14 categories.
// Drag tiles to reorder (persists to inventory_items.manual_order).
// Click a tile to open the existing per-product editor.
//
// Live DB reads (not the baked catalog) so reorders show immediately.
// /collection reflects changes after the next `bun scripts/bake-catalog.mjs`.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, AlertCircle, ImageOff, LayoutGrid, Grid2x2 } from "lucide-react";

import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { ImageOrderEditor } from "@/components/admin/ImageOrderEditor";
import {
  listCategoryItems,
  reorderItems,
} from "@/lib/photos-admin.functions";

export const Route = createFileRoute("/admin/photos")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Photos · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPhotosPage,
});

// 14 categorySlug values from baked catalog (mem://index.md INVENTORY TRUTH).
const CATEGORIES: Array<{ slug: string; label: string; count: number }> = [
  { slug: "seating", label: "Seating", count: 101 },
  { slug: "tables", label: "Tables", count: 77 },
  { slug: "bars", label: "Bars", count: 36 },
  { slug: "tableware", label: "Tableware", count: 41 },
  { slug: "serveware", label: "Serveware", count: 41 },
  { slug: "pillows-throws", label: "Pillows & Throws", count: 155 },
  { slug: "rugs", label: "Rugs", count: 26 },
  { slug: "lighting", label: "Lighting", count: 29 },
  { slug: "candlelight", label: "Candlelight", count: 10 },
  { slug: "chandeliers", label: "Chandeliers", count: 12 },
  { slug: "large-decor", label: "Large Decor", count: 24 },
  { slug: "styling", label: "Styling", count: 61 },
  { slug: "storage", label: "Storage", count: 11 },
  { slug: "furs-pelts", label: "Furs & Pelts", count: 6 },
];

type Item = {
  id: string;
  rms_id: string | null;
  title: string;
  slug: string | null;
  category: string | null;
  images: string[] | null;
  card_background_url: string | null;
  manual_order: number | null;
  owner_site_rank: number | null;
};

function AdminPhotosPage() {
  // Parent route /admin already wraps children in <AdminShell>.
  return <PhotosManager />;
}

function PhotosManager() {
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal flex">
      {/* Category sidebar */}
      <aside className="w-56 shrink-0 border-r border-charcoal/10 py-6 sticky top-12 self-start h-[calc(100vh-3rem)] overflow-y-auto">
        <p className="px-5 text-[10px] uppercase tracking-[0.26em] text-charcoal/45 mb-3">
          Categories
        </p>
        <nav className="flex flex-col">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={`text-left px-5 py-2 text-[11px] uppercase tracking-[0.18em] border-l-2 transition-all ${
                category === c.slug
                  ? "border-charcoal bg-charcoal/5 text-charcoal"
                  : "border-transparent text-charcoal/55 hover:text-charcoal hover:bg-charcoal/3"
              }`}
            >
              <span>{c.label}</span>
              <span className="ml-2 text-charcoal/35 tabular-nums">{c.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Grid */}
      <main className="flex-1 min-w-0">
        <CategoryGrid category={category} />
      </main>
    </div>
  );
}

function CategoryGrid({ category }: { category: string }) {
  const listFn = useServerFn(listCategoryItems);
  const reorderFn = useServerFn(reorderItems);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [view, setView] = useState<"grid" | "wall">("grid");
  const [saveState, setSaveState] = useState<"idle" | "syncing" | "synced" | "error">(
    "idle",
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load on category switch.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setItems([]);
    listFn({ data: { category } })
      .then((r) => {
        if (!alive) return;
        const next = (r?.items ?? []) as Item[];
        setItems(next);
        lastSaved.current = next.map((i) => i.rms_id).join("|");
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e instanceof Response
          ? `${e.status} ${e.statusText || "Request failed"} — try signing out and back in`
          : (e as Error)?.message ?? "Failed to load";
        setErr(msg);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category, listFn]);

  const scheduleSave = useCallback(
    (next: Item[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const ids = next.map((i) => i.rms_id).filter(Boolean) as string[];
      const sig = ids.join("|");
      if (sig === lastSaved.current) return;
      setSaveState("syncing");
      saveTimer.current = setTimeout(async () => {
        try {
          await reorderFn({ data: { category, ids } });
          lastSaved.current = sig;
          setSaveState("synced");
          setTimeout(
            () => setSaveState((s) => (s === "synced" ? "idle" : s)),
            1500,
          );
        } catch (e) {
          setErr((e as Error).message);
          setSaveState("error");
        }
      }, 800);
    },
    [category, reorderFn],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    scheduleSave(next);
  };

  const activeItem = useMemo(
    () => (items ?? []).find((i) => i.id === activeId) ?? null,
    [items, activeId],
  );

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1500px]">
      {/* Header */}
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-charcoal/10 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">
            Admin · Photos
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-[0.02em]">
            {CATEGORIES.find((c) => c.slug === category)?.label ?? category}
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-charcoal/55">
            {items.length} items · Drag to reorder · Click to edit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} />
          {/* View toggle — mirrors /collection. Grid = rows of 3, Wall = fit all. */}
          <div
            className="flex items-center border border-charcoal/15"
            role="group"
            aria-label="View"
          >
            <button
              onClick={() => setView("grid")}
              className={`h-9 w-9 inline-flex items-center justify-center transition-colors ${
                view === "grid"
                  ? "text-charcoal bg-charcoal/[0.05]"
                  : "text-charcoal/40 hover:text-charcoal/80"
              }`}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              title="Grid — rows of 3"
            >
              <Grid2x2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("wall")}
              className={`h-9 w-9 inline-flex items-center justify-center transition-colors border-l border-charcoal/15 ${
                view === "wall"
                  ? "text-charcoal bg-charcoal/[0.05]"
                  : "text-charcoal/40 hover:text-charcoal/80"
              }`}
              aria-label="Wall view"
              aria-pressed={view === "wall"}
              title="Wall — every piece at once"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {err && (
        <div className="mb-4 flex items-center gap-2 border border-red-300 bg-red-50 px-4 py-2 text-xs uppercase tracking-widest text-red-700">
          <AlertCircle className="h-3.5 w-3.5" /> {err}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-charcoal/50 py-16 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-xs uppercase tracking-widest text-charcoal/50">
          No items in this category.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className={
                view === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-x-4 gap-y-3 lg:gap-x-5 lg:gap-y-4"
                  : "grid gap-1"
              }
              style={
                view === "wall"
                  ? {
                      // Auto-fit wall: solve cols so cols*rows >= N with near-square cells.
                      gridTemplateColumns: `repeat(${wallCols(items.length)}, minmax(0, 1fr))`,
                    }
                  : undefined
              }
            >
              {items.map((item, idx) => (
                <Tile
                  key={item.id}
                  item={item}
                  index={idx}
                  dense={view === "wall"}
                  onOpen={() => setEditing(item)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem && (
              <div className="aspect-[4/5] bg-white border-2 border-charcoal shadow-xl overflow-hidden">
                <TileMedia item={activeItem} dense={view === "wall"} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Per-product editor modal — existing component, reused. */}
      {editing && (
        <ImageOrderEditor
          item={{
            id: editing.id,
            rms_id: editing.rms_id,
            title: editing.title,
            images: editing.images ?? [],
            card_background_url: editing.card_background_url,
          }}
          onClose={() => setEditing(null)}
          onSaved={({ images, card_background_url }) => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === editing.id
                  ? { ...i, images, card_background_url }
                  : i,
              ),
            );
          }}
        />
      )}

      <p className="mt-12 pt-6 border-t border-charcoal/10 text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
        Changes save live. /collection updates after next bake:
        <code className="ml-2 normal-case tracking-normal bg-charcoal/5 px-2 py-0.5">
          bun scripts/bake-catalog.mjs
        </code>
      </p>
    </div>
  );
}

function Tile({
  item,
  index,
  onOpen,
}: {
  item: Item;
  index: number;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const imageCount = item.images?.length ?? 0;
  const needsAttention = imageCount === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // PointerSensor distance:8 separates drag from click. If a real drag
        // occurred dnd-kit suppresses click; otherwise this fires.
        e.stopPropagation();
        onOpen();
      }}
      className={`group relative aspect-[4/5] bg-white border cursor-grab active:cursor-grabbing transition-all ${
        needsAttention
          ? "border-amber-400"
          : "border-charcoal/10 hover:border-charcoal/40"
      }`}
      title={`${item.title} · click to edit · drag to reorder`}
    >
      <TileMedia item={item} />

      {/* Position pill */}
      <span className="absolute top-2 left-2 bg-white/95 backdrop-blur text-[10px] uppercase tracking-widest px-1.5 py-0.5 border border-charcoal/10 tabular-nums">
        {index + 1}
      </span>

      {/* Health badge */}
      {needsAttention && (
        <span
          className="absolute top-2 right-2 bg-amber-500 text-white p-1"
          title="No images"
        >
          <ImageOff className="h-3 w-3" />
        </span>
      )}

      {/* Title overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-[10px] uppercase tracking-widest truncate">
          {item.title}
        </p>
        <p className="text-white/70 text-[9px] uppercase tracking-widest mt-0.5">
          {imageCount} {imageCount === 1 ? "image" : "images"}
        </p>
      </div>
    </div>
  );
}

function TileMedia({ item }: { item: Item }) {
  const hero = item.images?.[0];
  if (!hero) {
    return (
      <div className="h-full w-full bg-charcoal/5 flex items-center justify-center">
        <ImageOff className="h-6 w-6 text-charcoal/30" />
      </div>
    );
  }
  return (
    <img
      src={hero}
      alt=""
      loading="lazy"
      draggable={false}
      className="h-full w-full object-cover select-none"
    />
  );
}

function SaveBadge({
  state,
}: {
  state: "idle" | "syncing" | "synced" | "error";
}) {
  if (state === "idle") return null;
  const cls =
    state === "syncing"
      ? "border-charcoal/30 text-charcoal/60"
      : state === "synced"
        ? "border-emerald-600 text-emerald-700"
        : "border-red-500 text-red-600";
  const label =
    state === "syncing" ? "Syncing" : state === "synced" ? "Synced" : "Error";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] uppercase tracking-[0.22em] tabular-nums ${cls}`}
    >
      {state === "syncing" && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </span>
  );
}

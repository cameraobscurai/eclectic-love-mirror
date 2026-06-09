// /admin/photos — admin photo manager that MIRRORS the public Collection.
//
// Data source: src/data/inventory/current_catalog.json (same baked catalog
// /collection consumes). That guarantees identical taxonomy, family rollup,
// and order. Reorder writes manual_order to inventory_items by rms_id; the
// public site reflects the change on the next bake.
//
// Taxonomy: PARENT_ORDER + PARENT_SUBS from src/lib/collection-parents.ts —
// the single source of truth shared with /collection.
//
// Tile sizing: per-family pad from getTilePreset() normalizes silhouettes
// so banquettes don't dwarf ottomans inside the same row.

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
import { Loader2, AlertCircle, ImageOff, LayoutGrid, Grid2x2, Layers } from "lucide-react";

import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { ImageOrderEditor } from "@/components/admin/ImageOrderEditor";
import { reorderItems } from "@/lib/photos-admin.functions";
import {
  PARENT_ORDER,
  PARENT_LABELS,
  PARENT_SUBS,
  productParent,
  type ParentId,
} from "@/lib/collection-parents";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { getTilePreset } from "@/lib/collection-tile-presets";
import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";

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

// ─── Admin item shape — adapter over CollectionProduct ──────────────────────
type Item = {
  id: string;
  rms_id: string;
  title: string;
  images: string[];
  card_background_url: string | null;
  variantCount: number;
  /** Browse group drives the per-family tile-preset padding. */
  browseGroup: ReturnType<typeof getProductBrowseGroup>;
};

function adapt(p: CollectionProduct): Item {
  return {
    id: p.id,
    rms_id: p.id,
    title: p.title,
    images: p.images.map((i) => i.url),
    card_background_url: null,
    variantCount: p.variants?.length ?? 0,
    browseGroup: getProductBrowseGroup(p),
  };
}

function AdminPhotosPage() {
  return <PhotosManager />;
}

function PhotosManager() {
  const [parent, setParent] = useState<ParentId>(PARENT_ORDER[0]);
  const [sub, setSub] = useState<string>("all");
  const [view, setView] = useState<"grid" | "wall">("grid");

  // Load baked catalog once.
  const [allProducts, setAllProducts] = useState<CollectionProduct[] | null>(null);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getCollectionCatalog()
      .then((c) => alive && setAllProducts(c.products))
      .catch((e) => alive && setCatalogErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  // Reset sub when parent changes.
  useEffect(() => {
    setSub("all");
  }, [parent]);

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal flex">
      {/* Sidebar — parents in canonical PARENT_ORDER */}
      <aside className="w-56 shrink-0 border-r border-charcoal/10 py-6 sticky top-12 self-start h-[calc(100vh-3rem)] overflow-y-auto">
        <p className="px-5 text-[10px] uppercase tracking-[0.26em] text-charcoal/45 mb-3">
          Categories
        </p>
        <nav className="flex flex-col">
          {PARENT_ORDER.map((pid) => {
            const count = allProducts
              ? allProducts.filter((p) => productParent(p) === pid).length
              : null;
            return (
              <button
                key={pid}
                onClick={() => setParent(pid)}
                className={`text-left px-5 py-2 text-[11px] uppercase tracking-[0.18em] border-l-2 transition-all ${
                  parent === pid
                    ? "border-charcoal bg-charcoal/5 text-charcoal"
                    : "border-transparent text-charcoal/55 hover:text-charcoal hover:bg-charcoal/3"
                }`}
              >
                <span>{PARENT_LABELS[pid]}</span>
                {count !== null && (
                  <span className="ml-2 text-charcoal/35 tabular-nums">{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        {catalogErr ? (
          <div className="m-6 border border-red-300 bg-red-50 px-4 py-3 text-xs uppercase tracking-widest text-red-700">
            Catalog load failed: {catalogErr}
          </div>
        ) : (
          <CategoryGrid
            parent={parent}
            sub={sub}
            onSub={setSub}
            view={view}
            onView={setView}
            allProducts={allProducts}
          />
        )}
      </main>
    </div>
  );
}

function CategoryGrid({
  parent,
  sub,
  onSub,
  view,
  onView,
  allProducts,
}: {
  parent: ParentId;
  sub: string;
  onSub: (s: string) => void;
  view: "grid" | "wall";
  onView: (v: "grid" | "wall") => void;
  allProducts: CollectionProduct[] | null;
}) {
  const reorderFn = useServerFn(reorderItems);

  // Source items for this parent (and optional sub).
  // Use the SAME classifier the front-end uses for sub filtering.
  const baseItems = useMemo<Item[]>(() => {
    if (!allProducts) return [];
    const inParent = allProducts.filter((p) => productParent(p) === parent);
    // Sort by ownerSiteRank — primary key for /collection's by-type sort.
    inParent.sort((a, b) => {
      const ar = a.ownerSiteRank ?? 9e9;
      const br = b.ownerSiteRank ?? 9e9;
      if (ar !== br) return ar - br;
      return a.title.localeCompare(b.title);
    });
    return inParent.map(adapt);
  }, [allProducts, parent]);

  // Local items state so drag-reorder feels instant.
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    setItems(baseItems);
  }, [baseItems]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const subs = PARENT_SUBS[parent];
  const subList = useMemo(() => [{ id: "all", label: "All" }, ...subs], [subs]);

  const scheduleSave = useCallback(
    (next: Item[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const ids = next.map((i) => i.rms_id).filter(Boolean);
      const sig = ids.join("|");
      if (sig === lastSaved.current) return;
      setSaveState("syncing");
      saveTimer.current = setTimeout(async () => {
        try {
          // `category` field on the serverFn is now the parent id — used for
          // audit metadata. The actual update is per-rms_id, so this works
          // identically for parents AND the old raw category slugs.
          await reorderFn({ data: { category: parent, ids } });
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
    [parent, reorderFn],
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

  const loading = allProducts === null;

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1500px]">
      {/* Header */}
      <header className="mb-4 flex items-end justify-between gap-6 border-b border-charcoal/10 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">
            Admin · Photos
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-[0.02em]">
            {PARENT_LABELS[parent]}
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-charcoal/55">
            {items.length} items · Drag to reorder · Click to edit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} />
          <div
            className="flex items-center border border-charcoal/15"
            role="group"
            aria-label="View"
          >
            <button
              onClick={() => onView("grid")}
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
              onClick={() => onView("wall")}
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

      {/* Subcategory rail — mirrors /collection's SubcategoryRail. */}
      {subs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {subList.map((s) => (
            <button
              key={s.id}
              onClick={() => onSub(s.id)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] border transition-colors ${
                sub === s.id
                  ? "border-charcoal bg-charcoal text-white"
                  : "border-charcoal/15 text-charcoal/65 hover:border-charcoal/40 hover:text-charcoal"
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] uppercase tracking-[0.22em] text-charcoal/40 self-center">
            Sub filter is visual only — reorder still writes the full parent list
          </span>
        </div>
      )}

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

      {editing && (
        <ImageOrderEditor
          item={{
            id: editing.id,
            rms_id: editing.rms_id,
            title: editing.title,
            images: editing.images,
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
        Changes save live to the DB. /collection updates after next bake:
        <code className="ml-2 normal-case tracking-normal bg-charcoal/5 px-2 py-0.5">
          bun scripts/bake-catalog.mjs
        </code>
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function wallCols(n: number): number {
  if (n <= 0) return 1;
  return Math.max(3, Math.min(10, Math.ceil(Math.sqrt(n * 1.4))));
}

function Tile({
  item,
  index,
  dense,
  onOpen,
}: {
  item: Item;
  index: number;
  dense: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const imageCount = item.images.length;
  const needsAttention = imageCount === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={`group relative aspect-[4/5] bg-white border cursor-grab active:cursor-grabbing transition-colors ${
        needsAttention
          ? "border-amber-400"
          : "border-charcoal/10 hover:border-charcoal/40"
      }`}
      title={`${item.title} · click to edit · drag to reorder`}
    >
      <TileMedia item={item} dense={dense} />

      <span className="absolute top-2 left-2 bg-white/95 backdrop-blur text-[10px] uppercase tracking-widest px-1.5 py-0.5 border border-charcoal/10 tabular-nums">
        {index + 1}
      </span>

      {item.variantCount > 0 && (
        <span
          className="absolute top-2 right-2 inline-flex items-center gap-1 bg-charcoal/85 text-white text-[9px] uppercase tracking-widest px-1.5 py-0.5"
          title={`${item.variantCount + 1} variants — edits apply to the primary record`}
        >
          <Layers className="h-2.5 w-2.5" /> {item.variantCount + 1}
        </span>
      )}

      {needsAttention && (
        <span
          className="absolute bottom-2 right-2 bg-amber-500 text-white p-1"
          title="No images"
        >
          <ImageOff className="h-3 w-3" />
        </span>
      )}

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

function TileMedia({ item, dense = false }: { item: Item; dense?: boolean }) {
  const hero = item.images[0];
  if (!hero) {
    return (
      <div className="h-full w-full bg-charcoal/5 flex items-center justify-center">
        <ImageOff className="h-6 w-6 text-charcoal/30" />
      </div>
    );
  }
  // Per-family padding from the same preset /collection uses — normalizes
  // tight headshots vs loose room shots so silhouettes share a baseline.
  const preset = getTilePreset(item.browseGroup);
  const padClass = dense ? "p-[6%]" : preset.pad;
  const anchorClass =
    preset.anchor === "bottom" ? "items-end" : "items-center";
  return (
    <div className={`h-full w-full flex justify-center ${anchorClass} ${padClass}`}>
      <img
        src={hero}
        alt=""
        loading="lazy"
        draggable={false}
        className="max-h-full max-w-full object-contain select-none"
      />
    </div>
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

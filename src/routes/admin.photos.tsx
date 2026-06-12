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
// Tile sizing mirrors /collection: one fixed frame and one image-fit rule.

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
import { NormalizedProductImage } from "@/components/collection/NormalizedProductImage";
import { reorderItems } from "@/lib/photos-admin.functions";
import {
  PARENT_ORDER,
  PARENT_LABELS,
  PARENT_SUBS,
  productParent,
  productMatchesSub,
  type ParentId,
} from "@/lib/collection-parents";
import {
  getCollectionCatalog,
  invalidateCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";
import {
  PRODUCT_TILE_ASPECT,
  PRODUCT_TILE_FRAME_ASPECT,
  PRODUCT_TILE_IMAGE_CLASS,
  PRODUCT_TILE_WIDE_ASPECT,
  PRODUCT_TILE_WIDE_FRAME_ASPECT,
} from "@/lib/collection-tile-presets";


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
};

function adapt(p: CollectionProduct): Item {
  return {
    id: p.id,
    rms_id: p.id,
    title: p.title,
    images: p.images.map((i) => i.url),
    card_background_url: null,
    variantCount: p.variants?.length ?? 0,
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
      <aside className="hidden lg:block w-56 shrink-0 border-r border-charcoal/10 py-6 sticky top-12 self-start h-[calc(100vh-3rem)] overflow-y-auto">
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
        {/* Mobile category switcher — shown when sidebar is hidden */}
        <div className="lg:hidden px-6 pt-4 pb-2 border-b border-charcoal/10 bg-cream sticky top-12 z-20">
          <label className="block text-[10px] uppercase tracking-[0.26em] text-charcoal/45 mb-1.5">
            Category
          </label>
          <select
            value={parent}
            onChange={(e) => setParent(e.target.value as ParentId)}
            className="w-full border border-charcoal/20 bg-white px-3 py-2 text-[12px] uppercase tracking-[0.14em]"
          >
            {PARENT_ORDER.map((pid) => (
              <option key={pid} value={pid}>
                {PARENT_LABELS[pid]}
              </option>
            ))}
          </select>
        </div>

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
    // Sort by editorialOrder (admin drag-order = site display order). Falls
    // back to ownerSiteRank for parents that haven't been editorial-ranked yet.
    inParent.sort((a, b) => {
      const ar = a.editorialOrder ?? (9e8 + (a.ownerSiteRank ?? 9e7));
      const br = b.editorialOrder ?? (9e8 + (b.ownerSiteRank ?? 9e7));
      if (ar !== br) return ar - br;
      return a.title.localeCompare(b.title);
    });
    return inParent.map(adapt);
  }, [allProducts, parent]);

  // Local items state so drag-reorder feels instant. Holds the FULL parent
  // list — the sub filter is purely a display filter (see `visibleItems`).
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    setItems(baseItems);
  }, [baseItems]);

  // Sub filter is visual only. Reorder is disabled while filtered so we
  // never persist a partial parent list.
  const subActive = sub !== "all";
  const visibleItems = useMemo(
    () => {
      const base = subActive
        ? items.filter((i) => {
            const p = (allProducts ?? []).find((pp) => pp.id === i.id);
            return p ? productMatchesSub(p, parent, sub) : false;
          })
        : items;
      // Guard: dnd-kit's SortableContext throws on null/undefined ids
      // ("Cannot use 'in' operator to search for 'id' in null").
      return base.filter((i) => i.id != null && i.id !== "");
    },
    [items, subActive, allProducts, parent, sub],
  );


  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "pending" | "syncing" | "synced" | "error"
  >("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");
  // Pre-drag snapshot stack — feeds Cmd+Z undo. We push the order BEFORE
  // each drop so undo restores the exact pre-drag arrangement, including
  // chained undos through several moves.
  const undoStack = useRef<Item[][]>([]);
  // Server-confirmed baseline. On save failure we roll the optimistic UI
  // back to this so the screen never lies about what's actually persisted.
  const lastConfirmed = useRef<Item[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const subs = PARENT_SUBS[parent];
  const subList = useMemo(() => [{ id: "all", label: "All" }, ...subs], [subs]);

  // Seed the confirmed baseline whenever the source data refreshes.
  useEffect(() => {
    lastConfirmed.current = baseItems;
    lastSaved.current = baseItems.map((i) => i.rms_id).filter(Boolean).join("|");
    undoStack.current = [];
    setUndoCount(0);
  }, [baseItems]);

  const scheduleSave = useCallback(
    (next: Item[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const ids = next.map((i) => i.rms_id).filter(Boolean);
      const sig = ids.join("|");
      if (sig === lastSaved.current) return;
      setSaveState("pending");
      // 1500ms debounce — gives the merchandiser room for 3-4 follow-up
      // drags before the storefront sees an intermediate state.
      saveTimer.current = setTimeout(async () => {
        setSaveState("syncing");
        try {
          await reorderFn({ data: { category: parent, ids } });
          lastSaved.current = sig;
          lastConfirmed.current = next;
          setSavedAt(Date.now());
          setSaveState("synced");
          // Bust the in-memory catalog cache so /collection picks up the
          // new order on its next load (no rebake required).
          invalidateCollectionCatalog();
        } catch (e) {
          setErr((e as Error).message);
          setSaveState("error");
          // Optimistic rollback — the screen now matches the DB again.
          setItems(lastConfirmed.current);
        }
      }, 1500);
    },
    [parent, reorderFn],
  );

  // Retry the latest pending order after a failure.
  const retrySave = useCallback(() => {
    setErr(null);
    scheduleSave(items);
  }, [items, scheduleSave]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const [ghostWidth, setGhostWidth] = useState<number | null>(null);
  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    const first = gridRef.current?.firstElementChild as HTMLElement | null;
    if (first) setGhostWidth(first.getBoundingClientRect().width);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    // Reorder is disabled when filtered to a sub — we'd otherwise persist
    // a partial parent list.
    if (subActive) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    // Push pre-drag snapshot onto the undo stack before mutating.
    undoStack.current.push(items);
    if (undoStack.current.length > 30) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    scheduleSave(next);
  };

  const [undoCount, setUndoCount] = useState(0);

  const doUndo = useCallback(() => {
    if (subActive) return;
    const prev = undoStack.current.pop();
    if (!prev) return;
    setUndoCount(undoStack.current.length);
    setItems(prev);
    scheduleSave(prev);
  }, [subActive, scheduleSave]);

  // Cmd+Z / Ctrl+Z — pop a snapshot, restore it, schedule a save.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z" || e.shiftKey) return;
      // Don't steal undo from text inputs (image editor, etc.).
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      doUndo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo]);



  const activeItem = useMemo(
    () => (items ?? []).find((i) => i.id === activeId) ?? null,
    [items, activeId],
  );

  const loading = allProducts === null;
  const useWideProductFrame = parent === "cocktail-bar";
  const tileAspect = useWideProductFrame ? PRODUCT_TILE_WIDE_ASPECT : PRODUCT_TILE_ASPECT;
  const frameAspect = useWideProductFrame ? PRODUCT_TILE_WIDE_FRAME_ASPECT : PRODUCT_TILE_FRAME_ASPECT;

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
            {subActive
              ? `${visibleItems.length} of ${items.length} shown · Reorder disabled while filtered`
              : `${items.length} items · Drag to reorder · Click to edit`}
          </p>

        </div>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} savedAt={savedAt} onRetry={retrySave} />
          <button
            type="button"
            onClick={doUndo}
            disabled={undoCount === 0 || subActive}
            title={subActive ? "Clear filter to undo" : "Undo last reorder (⌘Z)"}
            className="inline-flex items-center gap-1.5 border border-charcoal/15 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-charcoal/70 hover:bg-charcoal/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↶ Undo{undoCount > 0 ? ` (${undoCount})` : ""}
          </button>
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
            {subActive
              ? "Filtered view · clear sub to reorder"
              : "Reorder writes the full parent list"}
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
            items={visibleItems.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <div
              ref={gridRef}
              className={
                view === "grid"
                  ? "collection-product-grid w-full"
                  : "grid gap-1"
              }
              style={
                view === "wall"
                  ? {
                      gridTemplateColumns: `repeat(${wallCols(visibleItems.length)}, minmax(0, 1fr))`,
                    }
                  : undefined
              }
            >
              {visibleItems.map((item, idx) => (
                <Tile
                  key={item.id}
                  item={item}
                  index={idx}
                  dense={view === "wall"}
                  tileAspect={tileAspect}
                  frameAspect={frameAspect}
                  draggable={!subActive}
                  onOpen={() => setEditing(item)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem && (
              <div
                className="bg-white border-2 border-charcoal shadow-xl overflow-hidden"
                style={{ aspectRatio: tileAspect, width: ghostWidth ?? undefined }}
              >
                <TileMedia item={activeItem} dense={view === "wall"} frameAspect={frameAspect} />
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
        Order saves live. /collection reflects it on next page load — no bake needed.
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
  tileAspect,
  frameAspect,
  draggable = true,
  onOpen,
}: {
  item: Item;
  index: number;
  dense: boolean;
  tileAspect: string;
  frameAspect: number;
  draggable?: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !draggable });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const imageCount = item.images.length;
  const needsAttention = imageCount === 0;

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={`group relative bg-white border transition-colors ${
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        needsAttention
          ? "border-amber-400"
          : "border-charcoal/10 hover:border-charcoal/40"
      }`}
      style={{ ...style, aspectRatio: tileAspect }}
      title={`${item.title} · click to edit${draggable ? " · drag to reorder" : ""}`}
    >

      <TileMedia item={item} dense={dense} frameAspect={frameAspect} />

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

function TileMedia({ item, frameAspect }: { item: Item; dense?: boolean; frameAspect: number }) {
  const hero = item.images[0];
  if (!hero) {
    return (
      <div className="h-full w-full bg-charcoal/5 flex items-center justify-center">
        <ImageOff className="h-6 w-6 text-charcoal/30" />
      </div>
    );
  }
  return (
    <div className="h-full w-full">
      <NormalizedProductImage
        src={hero}
        frameAspect={frameAspect}
        alt=""
        loading="lazy"
        draggable={false}
        className={`h-full w-full ${PRODUCT_TILE_IMAGE_CLASS} select-none`}
      />
    </div>
  );
}

function SaveBadge({
  state,
  savedAt,
  onRetry,
}: {
  state: "idle" | "pending" | "syncing" | "synced" | "error";
  savedAt: number | null;
  onRetry: () => void;
}) {
  // Re-render the "saved Xs ago" label every 10s without forcing a global tick.
  const [, force] = useState(0);
  useEffect(() => {
    if (state !== "synced" || !savedAt) return;
    const t = setInterval(() => force((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, [state, savedAt]);

  if (state === "idle" && !savedAt) return null;

  if (state === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 border border-red-500 px-2 py-1 text-[10px] uppercase tracking-[0.22em] tabular-nums text-red-600 hover:bg-red-500/5"
        title="Save failed — click to retry"
      >
        <AlertCircle className="h-3 w-3" />
        Save failed · Retry
      </button>
    );
  }

  if (state === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-charcoal/20 px-2 py-1 text-[10px] uppercase tracking-[0.22em] tabular-nums text-charcoal/55">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Pending
      </span>
    );
  }

  if (state === "syncing") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-charcoal/30 px-2 py-1 text-[10px] uppercase tracking-[0.22em] tabular-nums text-charcoal/70">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving
      </span>
    );
  }

  // synced (or idle with prior savedAt)
  const ago = savedAt ? relativeTime(savedAt) : "now";
  return (
    <span className="inline-flex items-center gap-1.5 border border-emerald-600/70 px-2 py-1 text-[10px] uppercase tracking-[0.22em] tabular-nums text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
      Saved {ago}
    </span>
  );
}

function relativeTime(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

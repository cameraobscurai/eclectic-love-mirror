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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { glassNamePlate, webkitGlassBlur } from "@/lib/glass";
import { supabase } from "@/integrations/supabase/client";
import { ImageOrderEditor } from "@/components/admin/ImageOrderEditor";
import { NormalizedProductImage } from "@/components/collection/NormalizedProductImage";
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";
import { sortProductsForCollection } from "@/lib/collection-sort-intelligence";
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
  PRODUCT_TILE_OVERRIDES,
} from "@/lib/collection-tile-presets";

type SortMode = "editorial" | "type" | "az" | "tonal";
const SORT_MODES: { id: SortMode; label: string }[] = [
  { id: "editorial", label: "Editorial" },
  { id: "type", label: "By Type" },
  { id: "az", label: "A–Z" },
  { id: "tonal", label: "Tonal" },
];


export const Route = createFileRoute("/admin/photos")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  // BOH deep-links:
  //   ?filter=missing → hide fully-imaged rows (see visibleItems filter)
  //   ?product=<rms>  → reserved for future auto-open of the editor
  //   ?page=<pg>      → reserved for page-scoped subsets
  validateSearch: (s: Record<string, unknown>) => ({
    filter: s.filter === "missing" ? ("missing" as const) : undefined,
    product: typeof s.product === "string" ? s.product : undefined,
    page: typeof s.page === "string" ? s.page : undefined,
  }),
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
  useWideFrame: boolean;
};

function adapt(p: CollectionProduct): Item {
  const browseGroup = getProductBrowseGroup(p);
  return {
    id: p.id,
    rms_id: p.id,
    title: p.title,
    images: p.images.map((i) => i.url),
    card_background_url: null,
    variantCount: p.variants?.length ?? 0,
    useWideFrame: browseGroup === "bar" || browseGroup === "cocktail-tables" || browseGroup === "storage",
  };
}

function AdminPhotosPage() {
  return <PhotosManager />;
}

function PhotosManager() {
  const [parent, setParent] = useState<ParentId>(PARENT_ORDER[0]);
  const [sub, setSub] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("editorial");
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
            sortMode={sortMode}
            onSortMode={setSortMode}
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
  sortMode,
  onSortMode,
  view,
  onView,
  allProducts,
}: {
  parent: ParentId;
  sub: string;
  onSub: (s: string) => void;
  sortMode: SortMode;
  onSortMode: (m: SortMode) => void;
  view: "grid" | "wall";
  onView: (v: "grid" | "wall") => void;
  allProducts: CollectionProduct[] | null;
}) {
  const reorderFn = useServerFn(reorderItems);

  // Source items for this parent. Mirrors /collection so the admin shows
  // exactly what visitors see in each sort mode.
  //   - editorial → editorialOrder (drag-reorder writes this back)
  //   - type/az/tonal → same sortProductsForCollection() the public grid uses
  const baseItems = useMemo<Item[]>(() => {
    if (!allProducts) return [];
    const inParent = allProducts.filter((p) => productParent(p) === parent);
    if (sortMode === "editorial") {
      inParent.sort((a, b) => {
        const ar = a.editorialOrder ?? (9e8 + (a.ownerSiteRank ?? 9e7));
        const br = b.editorialOrder ?? (9e8 + (b.ownerSiteRank ?? 9e7));
        if (ar !== br) return ar - br;
        return a.title.localeCompare(b.title);
      });
      return inParent.map(adapt);
    }
    const sorted = sortProductsForCollection(inParent, {
      mode: sortMode === "az" ? "az" : sortMode === "tonal" ? "tonal" : "by-type",
      activeGroup: parent as never,
    });
    return sorted.map(adapt);
  }, [allProducts, parent, sortMode]);

  // Local items state so drag-reorder feels instant. Holds the FULL parent
  // list — the sub filter is purely a display filter (see `visibleItems`).
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    setItems(baseItems);
  }, [baseItems]);

  // Sub filter is visual only. Reorder is disabled while filtered (would
  // persist a partial parent list) or while viewing a non-editorial sort
  // mode (the drag order belongs to editorial only — Type/A–Z/Tonal are
  // mirrors of the public sort, not editable orderings).
  const subActive = sub !== "all";
  const { filter: filterParam } = Route.useSearch();
  const missingOnly = filterParam === "missing";
  const reorderDisabled = subActive || sortMode !== "editorial" || missingOnly;
  const visibleItems = useMemo(
    () => {
      let base = subActive
        ? items.filter((i) => {
            const p = (allProducts ?? []).find((pp) => pp.id === i.id);
            return p ? productMatchesSub(p, parent, sub) : false;
          })
        : items;
      if (missingOnly) base = base.filter((i) => i.images.length === 0);
      // Guard: dnd-kit's SortableContext throws on null/undefined ids
      // ("Cannot use 'in' operator to search for 'id' in null").
      return base.filter((i) => i.id != null && i.id !== "");
    },
    [items, subActive, allProducts, parent, sub, missingOnly],
  );


  const [activeId, setActiveId] = useState<string | null>(null);
  // editing.id is the inventory_items UUID (resolved by rms_id at open time),
  // NOT the catalog id (which is the rms_id like "2408"). The server fn and
  // editor's DB queries both key off the UUID.
  const [editing, setEditing] = useState<Item | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const openEditor = useCallback(async (item: Item) => {
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("rms_id", item.rms_id)
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error(`No inventory row for RMS ${item.rms_id}`);
      setEditing({ ...item, id: data.id });
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
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
      if (sig === lastSaved.current) {
        // User dragged back to the last-saved order — nothing to persist.
        // Clear any leftover "pending" from the prior drag so the badge
        // doesn't stick on orange forever.
        setSaveState((s) => (s === "pending" || s === "syncing" ? (savedAt ? "synced" : "idle") : s));
        return;
      }
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
    [parent, reorderFn, savedAt],
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
    if (reorderDisabled) return;
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
    if (reorderDisabled) return;
    const prev = undoStack.current.pop();
    if (!prev) return;
    setUndoCount(undoStack.current.length);
    setItems(prev);
    scheduleSave(prev);
  }, [reorderDisabled, scheduleSave]);

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
            {reorderDisabled
              ? `${visibleItems.length} of ${items.length} shown · ${
                  missingOnly
                    ? "Missing-images filter active — reorder disabled"
                    : sortMode !== "editorial"
                    ? `Mirroring public ${SORT_MODES.find((s) => s.id === sortMode)?.label} sort — switch to Editorial to reorder`
                    : "Reorder disabled while filtered"
                }`
              : `${items.length} items · Drag to reorder · Click to edit`}
          </p>
          {missingOnly && <MissingFilterChip />}
        </div>
        <div className="flex items-center gap-3">
          <SaveBadge state={saveState} savedAt={savedAt} onRetry={retrySave} />
          <button
            type="button"
            onClick={doUndo}
            disabled={undoCount === 0 || reorderDisabled}
            title={reorderDisabled ? "Switch to Editorial sort to undo" : "Undo last reorder (⌘Z)"}
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

      {/* Sort selector — mirrors /collection's sort tabs so the admin grid
          matches exactly what the public sees in each mode. Editorial is the
          only editable mode (drag → writes editorialOrder). */}
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-charcoal/10 pb-3">
        <span className="mr-3 text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
          Sort
        </span>
        {SORT_MODES.map((opt) => {
          const active = sortMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSortMode(opt.id)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] border-b transition-colors ${
                active
                  ? "text-charcoal border-charcoal"
                  : "text-charcoal/55 hover:text-charcoal border-transparent"
              }`}
              title={
                opt.id === "editorial"
                  ? "Your drag-reorder (writes editorialOrder)"
                  : `Public ${opt.label} sort — read-only mirror`
              }
            >
              {opt.label}
              {opt.id === "editorial" && (
                <span className="ml-1.5 text-charcoal/35">●</span>
              )}
            </button>
          );
        })}
        <span className="ml-auto text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
          {sortMode === "editorial"
            ? "Editable · drag to reorder"
            : "Read-only mirror of public sort"}
        </span>
      </div>

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
              : sortMode !== "editorial"
                ? "Switch to Editorial sort to reorder"
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
                  draggable={!reorderDisabled}
                  onOpen={() => void openEditor(item)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem && (
              <div
                className="bg-white border-2 border-charcoal shadow-xl overflow-hidden"
                style={{ aspectRatio: tileAspectFor(activeItem), width: ghostWidth ?? undefined }}
              >
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
                i.rms_id === editing.rms_id
                  ? { ...i, images, card_background_url }
                  : i,
              ),
            );
            // Bust the public catalog cache so the next /collection load
            // shows this edit immediately (same pattern as reorder saves).
            invalidateCollectionCatalog();
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

function tileAspectFor(_item: Item): string {
  return PRODUCT_TILE_ASPECT;
}

function frameAspectFor(_item: Item): number {
  return PRODUCT_TILE_FRAME_ASPECT;
}

function Tile({
  item,
  index,
  dense,
  draggable = true,
  onOpen,
}: {
  item: Item;
  index: number;
  dense: boolean;
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
      className={`group relative bg-white overflow-hidden transition-shadow ${
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        needsAttention
          ? "ring-1 ring-amber-400"
          : "ring-0 hover:shadow-[0_8px_30px_-12px_rgba(26,26,26,0.18)]"
      }`}
      style={{ ...style, aspectRatio: tileAspectFor(item) }}
      title={`${item.title} · click to edit${draggable ? " · drag to reorder" : ""}`}
    >
      <TileMedia item={item} dense={dense} />

      {/* Position index — small, editorial */}
      <span className="absolute top-2 left-2 text-[10px] uppercase tracking-[0.18em] tabular-nums text-charcoal/70 bg-white/85 backdrop-blur px-1.5 py-0.5">
        {String(index + 1).padStart(2, "0")}
      </span>

      {item.variantCount > 0 && (
        <span
          className="absolute top-2 right-2 inline-flex items-center gap-1 bg-white/85 backdrop-blur text-charcoal/75 text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5"
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

      {/* Glass nameplate — same treatment as public Collection tile */}
      <div
        aria-hidden
        className="hidden md:block pointer-events-none absolute left-3 right-3 bottom-3 opacity-0 translate-y-1.5 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-y-0"
      >
        <div
          className={`${glassNamePlate} rounded-[6px] px-3 py-2`}
          style={webkitGlassBlur}
        >
          <p className="text-[12px] leading-[1.3] text-charcoal line-clamp-2 uppercase tracking-[0.06em]">
            {item.title}
          </p>
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-charcoal/55 tabular-nums">
            {imageCount} {imageCount === 1 ? "image" : "images"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TileMedia({ item }: { item: Item; dense?: boolean }) {
  const hero = item.images[0];
  const overrides = PRODUCT_TILE_OVERRIDES[item.rms_id];
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
        {...overrides}
        src={hero}
        frameAspect={frameAspectFor(item)}
        visualOffsetY={overrides?.visualOffsetY ?? 0}
        visualAnchorY="center"
        visualBaselineY={0.66}
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

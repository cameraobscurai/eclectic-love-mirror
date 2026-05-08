import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { CollectionWallTile } from "./CollectionWallTile";
import {
  WALL_DND_ENABLED,
  orderKeyForIds,
  loadOrder,
  saveOrder,
  clearOrder,
  confirmOrder,
  isOrderConfirmed,
  applySavedOrder,
} from "@/lib/wall-dnd";

interface Props {
  products: CollectionProduct[];
  onOpen: (id: string) => void;
  /** Hard ceiling — auto-fit packs everything into one viewport, so very
   *  large categories get trimmed. Switch back to scroll view to see all. */
  cap?: number;
}

/**
 * Viewport-locked specimen wall. Auto-fits N products into a perfect
 * cols × rows rectangle (no orphan tiles), with hover-to-magnify and
 * dim-everyone-else.
 *
 * When WALL_DND_ENABLED is on, tiles can be dragged to reorder; the
 * manual order is persisted in localStorage per filter view.
 */
export function CollectionWall({ products, onOpen, cap = 240 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef<number | null>(null);
  const pendingTouch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMobile(window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const capped = useMemo(() => products.slice(0, cap), [products, cap]);

  // ---- DnD: load saved order, then apply ----
  const orderKey = useMemo(
    () => (WALL_DND_ENABLED ? orderKeyForIds(capped.map((p) => p.id)) : ""),
    [capped],
  );
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!WALL_DND_ENABLED) return;
    setOrderedIds(loadOrder(orderKey));
    setConfirmed(isOrderConfirmed(orderKey));
  }, [orderKey]);

  const ordered = useMemo(() => {
    if (!WALL_DND_ENABLED) return capped;
    return applySavedOrder(capped, orderedIds);
  }, [capped, orderedIds]);

  // Edit mode = DnD on AND user hasn't pressed OK yet on the current order.
  const editMode = WALL_DND_ENABLED && !confirmed;

  const { cols, rows } = useMemo(() => {
    const n = ordered.length;
    if (!n || !size.w || !size.h) return { cols: 1, rows: 1 };
    const aspect = size.w / size.h;
    const colsF = Math.sqrt(n * aspect);
    let cols = Math.ceil(colsF);
    let best = { cols, rows: Math.ceil(n / cols), score: Infinity };
    for (let c = Math.max(1, cols - 3); c <= cols + 4; c++) {
      const r = Math.ceil(n / c);
      const empty = c * r - n;
      const tileAspect = size.w / c / (size.h / r);
      const aspectPenalty = Math.abs(Math.log(tileAspect));
      const score = empty * 4 + aspectPenalty * n * 0.6;
      if (score < best.score) best = { cols: c, rows: r, score };
    }
    return { cols: best.cols, rows: best.rows };
  }, [ordered.length, size.w, size.h]);

  const trimmed = useMemo(() => ordered.slice(0, cols * rows), [ordered, cols, rows]);

  const loupeId = useMemo(() => {
    if (!loupe || !size.w || !size.h) return null;
    const cw = size.w / cols;
    const rh = size.h / rows;
    const c = Math.min(cols - 1, Math.max(0, Math.floor(loupe.x / cw)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor(loupe.y / rh)));
    return trimmed[r * cols + c]?.id ?? null;
  }, [loupe, size, cols, rows, trimmed]);

  const flushTouch = useCallback(() => {
    rafRef.current = null;
    if (pendingTouch.current) {
      setLoupe(pendingTouch.current);
      pendingTouch.current = null;
    }
  }, []);

  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      const el = containerRef.current;
      const t = e.touches[0];
      if (!el || !t) return;
      const rect = el.getBoundingClientRect();
      pendingTouch.current = { x: t.clientX - rect.left, y: t.clientY - rect.top };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushTouch);
      }
    },
    [isMobile, flushTouch],
  );

  const onTouchEnd = useCallback(() => {
    if (!isMobile) return;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingTouch.current = null;
    const id = loupeId;
    setLoupe(null);
    if (id) onOpen(id);
  }, [isMobile, loupeId, onOpen]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // In edit mode, suppress hover dim entirely (focus is on dragging).
  const activeId = editMode ? null : isMobile ? loupeId : hoveredId;
  const noopHover = useCallback(() => {}, []);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    }),
    [cols, rows],
  );

  const trimmedNote =
    products.length > trimmed.length
      ? `${trimmed.length} of ${products.length} shown — switch to grid for the full set`
      : null;

  // ---- DnD wiring ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const ids = trimmed.map((p) => p.id);
      const oldIdx = ids.indexOf(String(active.id));
      const newIdx = ids.indexOf(String(over.id));
      if (oldIdx < 0 || newIdx < 0) return;
      const moved = arrayMove(ids, oldIdx, newIdx);
      // Persist the full ordered list (trimmed + tail) so saved order
      // covers items not currently rendered too.
      const tailIds = ordered.slice(trimmed.length).map((p) => p.id);
      const fullIds = [...moved, ...tailIds];
      setOrderedIds(fullIds);
      saveOrder(orderKey, fullIds);
    },
    [trimmed, ordered, orderKey],
  );

  const resetOrder = useCallback(() => {
    if (!orderKey) return;
    clearOrder(orderKey);
    setOrderedIds(null);
  }, [orderKey]);

  const tilesGrid = (
    <div
      ref={containerRef}
      className="absolute inset-0 grid touch-none select-none"
      style={{ ...gridStyle, gap: 1, background: "#ffffff" }}
      onMouseLeave={() => setHoveredId(null)}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {trimmed.map((p) =>
        WALL_DND_ENABLED ? (
          <SortableTile
            key={p.id}
            product={p}
            isHovered={activeId === p.id}
            isAnyHovered={activeId !== null}
            onHover={isMobile ? noopHover : setHoveredId}
            onOpen={onOpen}
          />
        ) : (
          <div key={p.id} className="relative bg-white">
            <CollectionWallTile
              product={p}
              isHovered={activeId === p.id}
              isAnyHovered={activeId !== null}
              onHover={isMobile ? noopHover : setHoveredId}
              onOpen={onOpen}
            />
          </div>
        ),
      )}

      {isMobile && loupe && (
        <div
          className="pointer-events-none absolute z-[55] rounded-full border border-charcoal/40"
          style={{
            width: 88,
            height: 88,
            left: loupe.x - 44,
            top: loupe.y - 44,
            mixBlendMode: "multiply",
            willChange: "transform",
          }}
        />
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full bg-white">
      {WALL_DND_ENABLED ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={trimmed.map((p) => p.id)} strategy={rectSortingStrategy}>
            {tilesGrid}
          </SortableContext>
        </DndContext>
      ) : (
        tilesGrid
      )}

      {WALL_DND_ENABLED && orderedIds && orderedIds.length > 0 && (
        <button
          type="button"
          onClick={resetOrder}
          className="absolute bottom-3 left-4 z-[60] text-[9px] uppercase tracking-[0.28em] text-charcoal/60 hover:text-charcoal underline-offset-4 hover:underline"
        >
          reset order
        </button>
      )}

      {trimmedNote && (
        <p className="pointer-events-none absolute bottom-3 right-4 text-[9px] uppercase tracking-[0.28em] text-charcoal/45">
          {trimmedNote}
        </p>
      )}
    </div>
  );
}

interface SortableTileProps {
  product: CollectionProduct;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

function SortableTile({ product, isHovered, isAnyHovered, onHover, onOpen }: SortableTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative bg-white"
    >
      <CollectionWallTile
        product={product}
        isHovered={isHovered}
        isAnyHovered={isAnyHovered}
        onHover={onHover}
        onOpen={onOpen}
      />
    </div>
  );
}

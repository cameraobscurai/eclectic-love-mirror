import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CollectionProduct } from "@/lib/phase3-catalog";
import { CollectionWallTile } from "./CollectionWallTile";

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
 * dim-everyone-else. Adapted from the Local Lvrs Lab grid for Hive's
 * cutout-on-white aesthetic.
 */
export function CollectionWall({ products, onOpen, cap = 240 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef<number | null>(null);
  const pendingTouch = useRef<{ x: number; y: number } | null>(null);

  // Detect coarse pointer once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMobile(window.matchMedia("(hover: none) and (pointer: coarse)").matches);
  }, []);

  // Track container size.
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

  const { cols, rows } = useMemo(() => {
    const n = capped.length;
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
  }, [capped.length, size.w, size.h]);

  // Trim to perfect rectangle (no orphan tiles).
  const trimmed = useMemo(() => capped.slice(0, cols * rows), [capped, cols, rows]);

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
    // On touch end, commit the loupe id as a tap → open quick view.
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

  const activeId = isMobile ? loupeId : hoveredId;
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

  return (
    <div className="relative w-full h-full bg-paper">
      <div
        ref={containerRef}
        className="absolute inset-0 grid touch-none select-none"
        style={{ ...gridStyle, gap: 1, background: "rgba(26,26,26,0.08)" }}
        onMouseLeave={() => setHoveredId(null)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {trimmed.map((p) => (
          <div key={p.id} className="relative bg-paper">
            <CollectionWallTile
              product={p}
              isHovered={activeId === p.id}
              isAnyHovered={activeId !== null}
              onHover={isMobile ? noopHover : setHoveredId}
              onOpen={onOpen}
            />
          </div>
        ))}

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

      {trimmedNote && (
        <p className="pointer-events-none absolute bottom-3 right-4 text-[9px] uppercase tracking-[0.28em] text-charcoal/45">
          {trimmedNote}
        </p>
      )}
    </div>
  );
}

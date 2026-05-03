import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * DevEditOverlay — Design-tool fluidity build
 * ----------------------------------------------------------------------------
 * Toggle with Shift+D. Tag elements with `data-devedit` (full edit) or
 * `data-devedit-lock="size"` (drag-only) / `data-devedit-lock="position"`
 * (style-only). Each tagged element needs an `id`.
 *
 * Capabilities:
 *   - Multi-select: click, Shift/Cmd-click, marquee. Group drag + group resize
 *     around the union bounding box (40px min per element).
 *   - Smart guides: magenta alignment lines + distance pills against siblings
 *     and viewport edges/centers. Snap radius stays a constant *visual* size
 *     at every zoom level.
 *   - Style panel with scrubbable numeric labels (Shift = ×10, Alt = ÷10).
 *     Style edits target the *primary* selection only; banner makes that clear.
 *   - Canvas pan/zoom: hold Space to pan, Cmd/Ctrl+wheel to zoom toward cursor,
 *     `+`/`-` step zoom, `` ` `` reset, `1` fit selection.
 *   - Lock modes:
 *       data-devedit                       → drag + resize + style
 *       data-devedit-lock="size"           → drag + style, no resize handles
 *       data-devedit-lock="position"       → style only, no drag
 *   - Z-order, alignment toolbar, glass presets, reset, Done CSS export, and
 *     localStorage persistence all preserved.
 *
 * Production safety: short-circuits to null in production unless VITE_DEV_EDIT
 * is explicitly set.
 * ----------------------------------------------------------------------------
 */

const SNAP_GRID = 8;
const SNAP_RADIUS = 4; // screen-space; converted to canvas units at use
const MIN_SIZE = 40;
const STORAGE_KEY = "lovable.devedit.edits.v2";

type LockMode = "none" | "size" | "position";

type StyleEdit = {
  background?: string;
  bgOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  boxShadow?: string;
  backdropBlur?: number;
  backdropSaturate?: number;
  rotate?: number;
  zIndex?: number;
};

type Edit = {
  dx: number;
  dy: number;
  width: number;
  height: number;
  origWidth: number;
  origHeight: number;
  style?: StyleEdit;
};

type TargetMeta = {
  id: string;
  label: string;
  rect: DOMRect;        // current screen rect (after canvas transform)
  lockMode: LockMode;
};

type Guide = {
  axis: "x" | "y";
  pos: number;          // screen coordinate
  from: number;         // span start (screen)
  to: number;           // span end (screen)
};

type CanvasState = { scale: number; panX: number; panY: number };

const isProd = import.meta.env.PROD;
const devEditFlagOn =
  typeof import.meta.env.VITE_DEV_EDIT !== "undefined" &&
  import.meta.env.VITE_DEV_EDIT !== "" &&
  import.meta.env.VITE_DEV_EDIT !== "false";

function snap(v: number, step: number, enabled: boolean) {
  return enabled ? Math.round(v / step) * step : Math.round(v);
}

function loadEdits(): Record<string, Edit> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveEdits(edits: Record<string, Edit>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  } catch {
    /* ignore quota errors */
  }
}

function applyEditToEl(el: HTMLElement, edit: Edit) {
  const rotate = edit.style?.rotate ? ` rotate(${edit.style.rotate}deg)` : "";
  el.style.transform = `translate(${edit.dx}px, ${edit.dy}px)${rotate}`;
  el.style.width = `${edit.width}px`;
  el.style.height = `${edit.height}px`;

  const s = edit.style;
  if (!s) return;
  if (s.background !== undefined) el.style.background = s.background;
  if (s.borderColor !== undefined && s.borderWidth !== undefined) {
    el.style.border = `${s.borderWidth}px solid ${s.borderColor}`;
  }
  if (s.borderRadius !== undefined) el.style.borderRadius = `${s.borderRadius}px`;
  if (s.boxShadow !== undefined) el.style.boxShadow = s.boxShadow;
  if (s.backdropBlur !== undefined || s.backdropSaturate !== undefined) {
    const b = s.backdropBlur ?? 0;
    const sat = s.backdropSaturate ?? 100;
    const filter = `blur(${b}px) saturate(${sat}%)`;
    el.style.backdropFilter = filter;
    (el.style as { webkitBackdropFilter?: string }).webkitBackdropFilter = filter;
  }
  if (s.zIndex !== undefined) el.style.zIndex = String(s.zIndex);
}

function getLockMode(el: HTMLElement): LockMode {
  const v = el.getAttribute("data-devedit-lock");
  if (v === "size" || v === "position") return v;
  return "none";
}

function unionOfRects(rects: DOMRect[]): DOMRect | null {
  if (rects.length === 0) return null;
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const rc of rects) {
    if (rc.left < l) l = rc.left;
    if (rc.top < t) t = rc.top;
    if (rc.right > r) r = rc.right;
    if (rc.bottom > b) b = rc.bottom;
  }
  return new DOMRect(l, t, r - l, b - t);
}

export function DevEditOverlay() {
  if (isProd && !devEditFlagOn) return null;

  const [active, setActive] = useState(false);
  const [targets, setTargets] = useState<TargetMeta[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>(() => loadEdits());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [activeGuides, setActiveGuides] = useState<Guide[]>([]);
  const [distanceLabels, setDistanceLabels] = useState<Array<{ x: number; y: number; text: string }>>([]);
  const [canvas, setCanvas] = useState<CanvasState>({ scale: 1, panX: 0, panY: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  const editsRef = useRef(edits);
  editsRef.current = edits;
  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;
  const draggingRef = useRef(false);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const primarySelectedId = useMemo(() => {
    const arr = [...selectedIds];
    return arr[0] ?? null;
  }, [selectedIds]);

  const commitEdits = useCallback((next: Record<string, Edit>) => {
    editsRef.current = next;
    setEdits(next);
    saveEdits(next);
  }, []);

  // ---------- Coordinate helpers (canvas <-> screen) ----------
  const screenToCanvas = useCallback((x: number, y: number) => {
    const c = canvasRef.current;
    return { x: (x - c.panX) / c.scale, y: (y - c.panY) / c.scale };
  }, []);

  // ---------- Toggle + escape stack ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        setActive((a) => !a);
        setShowDone(false);
        setShowStyle(false);
        return;
      }
      if (e.key === "Escape") {
        if (showDone) return setShowDone(false);
        if (showStyle) return setShowStyle(false);
        if (selectedIds.size > 0) return setSelectedIds(new Set());
        if (active) return setActive(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, showDone, showStyle, selectedIds.size]);

  // ---------- Rescan tagged elements ----------
  const rescan = useCallback(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-devedit], [data-devedit-lock]")
    );
    const next: TargetMeta[] = els.map((el) => {
      if (!el.id) {
        el.id = `devedit-${Math.random().toString(36).slice(2, 8)}`;
      }
      const edit = editsRef.current[el.id];
      if (edit) applyEditToEl(el, edit);
      return {
        id: el.id,
        label: el.dataset.deveditLabel || el.tagName.toLowerCase() + "#" + el.id,
        rect: el.getBoundingClientRect(),
        lockMode: getLockMode(el),
      };
    });
    setTargets(next);
  }, []);

  useEffect(() => {
    if (!active) return;
    rescan();
    const onResize = () => { if (!draggingRef.current) rescan(); };
    const onScroll = () => { if (!draggingRef.current) rescan(); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [active, rescan]);

  // Re-apply persisted edits across page loads.
  useEffect(() => {
    const persisted = loadEdits();
    if (Object.keys(persisted).length === 0) return;
    const apply = () => {
      Object.entries(persisted).forEach(([id, edit]) => {
        const el = document.getElementById(id);
        if (el) applyEditToEl(el, edit);
      });
    };
    apply();
    const t = window.setTimeout(apply, 100);
    return () => window.clearTimeout(t);
  }, []);

  // ---------- Apply canvas transform only while active ----------
  useEffect(() => {
    const el = document.getElementById("devedit-canvas");
    if (!el) return;
    if (!active) {
      el.style.transform = "";
      el.style.willChange = "";
      el.style.transformOrigin = "";
      return;
    }
    el.style.transformOrigin = "0 0";
    el.style.transform = `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.scale})`;
    el.style.willChange = "transform";
    return () => {
      el.style.transform = "";
      el.style.willChange = "";
      el.style.transformOrigin = "";
    };
  }, [active, canvas]);

  // Keep targets in sync when canvas transforms (rects move on screen).
  useEffect(() => {
    if (!active || draggingRef.current) return;
    rescan();
  }, [canvas, active, rescan]);

  // ---------- Space = pan mode ----------
  useEffect(() => {
    if (!active) return;
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.code === "Space" && !spaceHeld) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [active, spaceHeld]);

  // ---------- Zoom: Cmd/Ctrl+wheel toward cursor; +/- step; ` reset; 1 fit ----------
  useEffect(() => {
    if (!active) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const c = canvasRef.current;
      const dir = e.deltaY > 0 ? -1 : 1;
      const factor = 1 + dir * 0.1;
      const newScale = Math.max(0.2, Math.min(4, c.scale * factor));
      // Keep point under cursor stationary.
      const k = newScale / c.scale;
      const panX = e.clientX - (e.clientX - c.panX) * k;
      const panY = e.clientY - (e.clientY - c.panY) * k;
      setCanvas({ scale: newScale, panX, panY });
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setCanvas((c) => ({ ...c, scale: Math.min(4, c.scale * 1.1) }));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setCanvas((c) => ({ ...c, scale: Math.max(0.2, c.scale / 1.1) }));
      } else if (e.key === "`") {
        e.preventDefault();
        setCanvas({ scale: 1, panX: 0, panY: 0 });
      } else if (e.key === "1") {
        e.preventDefault();
        // Fit selection (or full page) into viewport with 64px padding.
        const ids = selectedIdsRef.current;
        const rects: DOMRect[] = [];
        if (ids.size > 0) {
          ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) rects.push(el.getBoundingClientRect());
          });
        } else {
          document.querySelectorAll<HTMLElement>("[data-devedit], [data-devedit-lock]").forEach((el) => {
            rects.push(el.getBoundingClientRect());
          });
        }
        const u = unionOfRects(rects);
        if (!u) return;
        const c = canvasRef.current;
        // Convert union back to canvas (pre-transform) coordinates.
        const cx = { x: (u.left - c.panX) / c.scale, y: (u.top - c.panY) / c.scale, w: u.width / c.scale, h: u.height / c.scale };
        const pad = 64;
        const sx = (window.innerWidth - pad * 2) / cx.w;
        const sy = (window.innerHeight - pad * 2) / cx.h;
        const newScale = Math.max(0.2, Math.min(4, Math.min(sx, sy)));
        const panX = pad - cx.x * newScale;
        const panY = pad - cx.y * newScale;
        setCanvas({ scale: newScale, panX, panY });
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  // ---------- Pan with Space-drag ----------
  const startPan = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = canvasRef.current;
    const onMove = (ev: PointerEvent) => {
      setCanvas({ scale: start.scale, panX: start.panX + (ev.clientX - startX), panY: start.panY + (ev.clientY - startY) });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  // ---------- Arrow nudge across selected set ----------
  useEffect(() => {
    if (!active || selectedIds.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrows.includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? SNAP_GRID : 1;
      const nextEdits = { ...editsRef.current };
      selectedIds.forEach((id) => {
        const el = document.getElementById(id) as HTMLElement | null;
        if (!el) return;
        if (getLockMode(el) === "position") return;
        const r = el.getBoundingClientRect();
        const current: Edit = nextEdits[id] || {
          dx: 0, dy: 0,
          width: r.width / canvasRef.current.scale,
          height: r.height / canvasRef.current.scale,
          origWidth: r.width / canvasRef.current.scale,
          origHeight: r.height / canvasRef.current.scale,
        };
        const next: Edit = { ...current };
        if (e.key === "ArrowLeft") next.dx -= step;
        if (e.key === "ArrowRight") next.dx += step;
        if (e.key === "ArrowUp") next.dy -= step;
        if (e.key === "ArrowDown") next.dy += step;
        applyEditToEl(el, next);
        nextEdits[id] = next;
      });
      commitEdits(nextEdits);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, selectedIds, commitEdits]);

  // ---------- Selection mutators ----------
  const selectOnly = useCallback((id: string) => setSelectedIds(new Set([id])), []);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ---------- Smart guide computation ----------
  const computeGuidesFor = useCallback(
    (activeBox: DOMRect, excludeIds: Set<string>) => {
      const guides: Guide[] = [];
      const radiusScreen = SNAP_RADIUS;
      const candidatesX: Array<{ pos: number; from: number; to: number }> = [];
      const candidatesY: Array<{ pos: number; from: number; to: number }> = [];

      // Viewport edges + centers
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      candidatesX.push({ pos: 0, from: 0, to: vh }, { pos: vw, from: 0, to: vh }, { pos: vw / 2, from: 0, to: vh });
      candidatesY.push({ pos: 0, from: 0, to: vw }, { pos: vh, from: 0, to: vw }, { pos: vh / 2, from: 0, to: vw });

      // Sibling targets
      targets.forEach((t) => {
        if (excludeIds.has(t.id)) return;
        const r = t.rect;
        candidatesX.push(
          { pos: r.left, from: Math.min(r.top, activeBox.top), to: Math.max(r.bottom, activeBox.bottom) },
          { pos: r.right, from: Math.min(r.top, activeBox.top), to: Math.max(r.bottom, activeBox.bottom) },
          { pos: (r.left + r.right) / 2, from: Math.min(r.top, activeBox.top), to: Math.max(r.bottom, activeBox.bottom) },
        );
        candidatesY.push(
          { pos: r.top, from: Math.min(r.left, activeBox.left), to: Math.max(r.right, activeBox.right) },
          { pos: r.bottom, from: Math.min(r.left, activeBox.left), to: Math.max(r.right, activeBox.right) },
          { pos: (r.top + r.bottom) / 2, from: Math.min(r.left, activeBox.left), to: Math.max(r.right, activeBox.right) },
        );
      });

      const activeXs = [activeBox.left, activeBox.right, (activeBox.left + activeBox.right) / 2];
      const activeYs = [activeBox.top, activeBox.bottom, (activeBox.top + activeBox.bottom) / 2];

      let bestDX = 0, bestDXAbs = Infinity;
      let bestDY = 0, bestDYAbs = Infinity;

      candidatesX.forEach((c) => {
        activeXs.forEach((ax) => {
          const d = c.pos - ax;
          if (Math.abs(d) <= radiusScreen) {
            guides.push({ axis: "x", pos: c.pos, from: c.from, to: c.to });
            if (Math.abs(d) < bestDXAbs) { bestDXAbs = Math.abs(d); bestDX = d; }
          }
        });
      });
      candidatesY.forEach((c) => {
        activeYs.forEach((ay) => {
          const d = c.pos - ay;
          if (Math.abs(d) <= radiusScreen) {
            guides.push({ axis: "y", pos: c.pos, from: c.from, to: c.to });
            if (Math.abs(d) < bestDYAbs) { bestDYAbs = Math.abs(d); bestDY = d; }
          }
        });
      });

      // Distance pills: nearest sibling on each side (when no overlap and no active snap).
      const labels: Array<{ x: number; y: number; text: string }> = [];
      const others = targets.filter((t) => !excludeIds.has(t.id));
      const nearestRight = others
        .filter((t) => t.rect.left >= activeBox.right)
        .sort((a, b) => a.rect.left - b.rect.left)[0];
      const nearestLeft = others
        .filter((t) => t.rect.right <= activeBox.left)
        .sort((a, b) => b.rect.right - a.rect.right)[0];
      const nearestBelow = others
        .filter((t) => t.rect.top >= activeBox.bottom)
        .sort((a, b) => a.rect.top - b.rect.top)[0];
      const nearestAbove = others
        .filter((t) => t.rect.bottom <= activeBox.top)
        .sort((a, b) => b.rect.bottom - a.rect.bottom)[0];

      const cy = (activeBox.top + activeBox.bottom) / 2;
      const cx = (activeBox.left + activeBox.right) / 2;
      if (nearestRight) {
        const d = nearestRight.rect.left - activeBox.right;
        labels.push({ x: activeBox.right + d / 2, y: cy, text: `${Math.round(d)}px` });
      }
      if (nearestLeft) {
        const d = activeBox.left - nearestLeft.rect.right;
        labels.push({ x: activeBox.left - d / 2, y: cy, text: `${Math.round(d)}px` });
      }
      if (nearestBelow) {
        const d = nearestBelow.rect.top - activeBox.bottom;
        labels.push({ x: cx, y: activeBox.bottom + d / 2, text: `${Math.round(d)}px` });
      }
      if (nearestAbove) {
        const d = activeBox.top - nearestAbove.rect.bottom;
        labels.push({ x: cx, y: activeBox.top - d / 2, text: `${Math.round(d)}px` });
      }

      return { guides, labels, snapDX: bestDXAbs <= radiusScreen ? bestDX : 0, snapDY: bestDYAbs <= radiusScreen ? bestDY : 0 };
    },
    [targets]
  );

  // ---------- Group drag / resize ----------
  const startInteraction = useCallback(
    (
      meta: TargetMeta,
      mode: "move" | "nw" | "ne" | "sw" | "se",
      e: React.PointerEvent,
      groupMode: boolean
    ) => {
      e.preventDefault();
      e.stopPropagation();
      // Selection update
      if (mode === "move" && !groupMode) selectOnly(meta.id);

      const idsForOp = (() => {
        const sel = selectedIdsRef.current;
        if (mode === "move") {
          // If the clicked element isn't in selection, treat as single-element move.
          if (!sel.has(meta.id)) return new Set([meta.id]);
          return new Set(sel);
        }
        // Resize handles: operate on whole selection (or just this id).
        return sel.size > 0 ? new Set(sel) : new Set([meta.id]);
      })();

      const startScreenX = e.clientX;
      const startScreenY = e.clientY;
      const cStart = canvasRef.current;

      // Capture starting state per id.
      const startingEdits: Record<string, Edit> = {};
      const elMap: Record<string, HTMLElement> = {};
      const startingScreenRects: Record<string, DOMRect> = {};
      idsForOp.forEach((id) => {
        const el = document.getElementById(id) as HTMLElement | null;
        if (!el) return;
        elMap[id] = el;
        const r = el.getBoundingClientRect();
        startingScreenRects[id] = r;
        startingEdits[id] = editsRef.current[id] || {
          dx: 0, dy: 0,
          width: r.width / cStart.scale,
          height: r.height / cStart.scale,
          origWidth: r.width / cStart.scale,
          origHeight: r.height / cStart.scale,
        };
      });

      const startUnion = unionOfRects(Object.values(startingScreenRects)) as DOMRect;
      draggingRef.current = true;

      const onMove = (ev: PointerEvent) => {
        const c = canvasRef.current;
        const useSnap = snapEnabled && !ev.altKey;
        const deltaScreenX = ev.clientX - startScreenX;
        const deltaScreenY = ev.clientY - startScreenY;
        // Convert pointer delta to canvas units (so 200% zoom doesn't 2x-move).
        let dxCanvas = deltaScreenX / c.scale;
        let dyCanvas = deltaScreenY / c.scale;

        const nextEdits: Record<string, Edit> = { ...editsRef.current };
        let liveUnion = startUnion;

        if (mode === "move") {
          // Smart guide snap (compute against projected union box in screen-space).
          let projUnion = new DOMRect(
            startUnion.left + deltaScreenX,
            startUnion.top + deltaScreenY,
            startUnion.width,
            startUnion.height
          );
          if (useSnap && !ev.altKey) {
            const { guides, labels, snapDX, snapDY } = computeGuidesFor(projUnion, idsForOp);
            // Apply guide snap (screen units -> canvas units)
            if (snapDX) dxCanvas += snapDX / c.scale;
            if (snapDY) dyCanvas += snapDY / c.scale;
            // Otherwise grid snap
            if (!snapDX) dxCanvas = snap(dxCanvas, SNAP_GRID, true);
            if (!snapDY) dyCanvas = snap(dyCanvas, SNAP_GRID, true);
            setActiveGuides(guides);
            setDistanceLabels(labels);
            projUnion = new DOMRect(
              startUnion.left + dxCanvas * c.scale,
              startUnion.top + dyCanvas * c.scale,
              startUnion.width,
              startUnion.height
            );
          } else {
            setActiveGuides([]);
            setDistanceLabels([]);
          }
          liveUnion = projUnion;

          // Apply delta to every non-position-locked id.
          idsForOp.forEach((id) => {
            const el = elMap[id]; if (!el) return;
            if (getLockMode(el) === "position") return;
            const start = startingEdits[id];
            const next: Edit = { ...start, dx: start.dx + dxCanvas, dy: start.dy + dyCanvas };
            applyEditToEl(el, next);
            nextEdits[id] = next;
          });
        } else {
          // Resize: scale union proportionally from anchor opposite the dragged corner.
          let anchorX = startUnion.left, anchorY = startUnion.top;
          let dW = 0, dH = 0;
          if (mode === "se") { anchorX = startUnion.left; anchorY = startUnion.top; dW = deltaScreenX; dH = deltaScreenY; }
          else if (mode === "ne") { anchorX = startUnion.left; anchorY = startUnion.bottom; dW = deltaScreenX; dH = -deltaScreenY; }
          else if (mode === "sw") { anchorX = startUnion.right; anchorY = startUnion.top; dW = -deltaScreenX; dH = deltaScreenY; }
          else if (mode === "nw") { anchorX = startUnion.right; anchorY = startUnion.bottom; dW = -deltaScreenX; dH = -deltaScreenY; }

          let newW = Math.max(MIN_SIZE, startUnion.width + dW);
          let newH = Math.max(MIN_SIZE, startUnion.height + dH);
          if (ev.shiftKey) {
            // Lock aspect
            const ratio = startUnion.width / startUnion.height;
            if (newW / newH > ratio) newW = newH * ratio;
            else newH = newW / ratio;
          }
          const sx = newW / startUnion.width;
          const sy = newH / startUnion.height;

          idsForOp.forEach((id) => {
            const el = elMap[id]; if (!el) return;
            const lock = getLockMode(el);
            if (lock !== "none") return; // size-locked + position-locked both excluded from resize
            const startRect = startingScreenRects[id];
            const start = startingEdits[id];
            // Element's current screen offset within startUnion
            const offX = startRect.left - startUnion.left;
            const offY = startRect.top - startUnion.top;
            // New screen offset within union
            const newOffX = (anchorX === startUnion.left ? offX * sx : (startUnion.width - offX - startRect.width) * sx);
            const newOffY = (anchorY === startUnion.top ? offY * sy : (startUnion.height - offY - startRect.height) * sy);
            // Recompose target screen position
            const targetScreenLeft = (anchorX === startUnion.left ? startUnion.left + newOffX : startUnion.right - newOffX - startRect.width * sx);
            const targetScreenTop = (anchorY === startUnion.top ? startUnion.top + newOffY : startUnion.bottom - newOffY - startRect.height * sy);
            const screenDX = targetScreenLeft - startRect.left;
            const screenDY = targetScreenTop - startRect.top;
            const newWCanvas = Math.max(MIN_SIZE, (startRect.width * sx) / c.scale);
            const newHCanvas = Math.max(MIN_SIZE, (startRect.height * sy) / c.scale);
            const next: Edit = {
              ...start,
              width: useSnap ? snap(newWCanvas, SNAP_GRID, true) : newWCanvas,
              height: useSnap ? snap(newHCanvas, SNAP_GRID, true) : newHCanvas,
              dx: useSnap ? snap(start.dx + screenDX / c.scale, SNAP_GRID, true) : start.dx + screenDX / c.scale,
              dy: useSnap ? snap(start.dy + screenDY / c.scale, SNAP_GRID, true) : start.dy + screenDY / c.scale,
            };
            applyEditToEl(el, next);
            nextEdits[id] = next;
          });

          liveUnion = new DOMRect(
            anchorX === startUnion.left ? startUnion.left : startUnion.right - newW,
            anchorY === startUnion.top ? startUnion.top : startUnion.bottom - newH,
            newW,
            newH
          );
        }

        editsRef.current = nextEdits;

        // Update live target rects so handles track without rescanning everything.
        setTargets((prev) =>
          prev.map((p) => {
            if (!idsForOp.has(p.id)) return p;
            const el = elMap[p.id];
            if (!el) return p;
            return { ...p, rect: el.getBoundingClientRect() };
          })
        );
        // Suppress unused variable lint
        void liveUnion;
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        draggingRef.current = false;
        setActiveGuides([]);
        setDistanceLabels([]);
        commitEdits({ ...editsRef.current });
        requestAnimationFrame(() => rescan());
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [snapEnabled, commitEdits, rescan, computeGuidesFor, selectOnly]
  );

  // ---------- Marquee ----------
  const startMarquee = useCallback((e: React.PointerEvent) => {
    if (spaceHeld) return; // Space-drag pans instead.
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    setMarquee({ x: startX, y: startY, w: 0, h: 0 });
    const additive = e.shiftKey || e.metaKey;
    const onMove = (ev: PointerEvent) => {
      const x = Math.min(startX, ev.clientX);
      const y = Math.min(startY, ev.clientY);
      const w = Math.abs(ev.clientX - startX);
      const h = Math.abs(ev.clientY - startY);
      setMarquee({ x, y, w, h });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const x = Math.min(startX, ev.clientX);
      const y = Math.min(startY, ev.clientY);
      const w = Math.abs(ev.clientX - startX);
      const h = Math.abs(ev.clientY - startY);
      setMarquee(null);
      if (w < 3 && h < 3) {
        if (!additive) clearSelection();
        return;
      }
      const hits = targets.filter((t) => {
        const r = t.rect;
        return r.right >= x && r.left <= x + w && r.bottom >= y && r.top <= y + h;
      }).map((t) => t.id);
      setSelectedIds((prev) => {
        const next = additive ? new Set(prev) : new Set<string>();
        hits.forEach((id) => next.add(id));
        return next;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [targets, clearSelection, spaceHeld]);

  // ---------- Style edits target primary selection ----------
  const updateStyle = useCallback((patch: Partial<StyleEdit>) => {
    const id = primarySelectedId;
    if (!id) return;
    const el = document.getElementById(id) as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const c = canvasRef.current;
    const current: Edit = editsRef.current[id] || {
      dx: 0, dy: 0,
      width: r.width / c.scale, height: r.height / c.scale,
      origWidth: r.width / c.scale, origHeight: r.height / c.scale,
    };
    const next: Edit = { ...current, style: { ...(current.style || {}), ...patch } };
    applyEditToEl(el, next);
    commitEdits({ ...editsRef.current, [id]: next });
  }, [primarySelectedId, commitEdits]);

  // ---------- Z-order + alignment for primary selection ----------
  const bumpZ = useCallback((delta: number) => {
    const id = primarySelectedId;
    if (!id) return;
    const cur = editsRef.current[id];
    const currentZ = cur?.style?.zIndex ?? 0;
    updateStyle({ zIndex: currentZ + delta });
  }, [primarySelectedId, updateStyle]);

  const alignSelected = useCallback((where: "tl" | "tr" | "bl" | "br" | "center" | "cx" | "cy") => {
    const id = primarySelectedId;
    if (!id) return;
    const el = document.getElementById(id) as HTMLElement | null;
    if (!el) return;
    if (getLockMode(el) === "position") return;
    const cur = editsRef.current[id];
    const prevTransform = el.style.transform;
    el.style.transform = (cur?.style?.rotate ? `rotate(${cur.style.rotate}deg)` : "");
    const natural = el.getBoundingClientRect();
    el.style.transform = prevTransform;

    const c = canvasRef.current;
    const w = (cur?.width ?? natural.width / c.scale);
    const h = (cur?.height ?? natural.height / c.scale);
    // natural rect is currently in screen coords; convert to canvas.
    const naturalLeftCanvas = (natural.left - c.panX) / c.scale - (cur?.dx ?? 0);
    const naturalTopCanvas = (natural.top - c.panY) / c.scale - (cur?.dy ?? 0);
    const vw = window.innerWidth / c.scale;
    const vh = window.innerHeight / c.scale;
    const PAD = 8 / c.scale;
    let targetLeft = naturalLeftCanvas;
    let targetTop = naturalTopCanvas;
    if (where === "tl") { targetLeft = PAD; targetTop = PAD; }
    else if (where === "tr") { targetLeft = vw - w - PAD; targetTop = PAD; }
    else if (where === "bl") { targetLeft = PAD; targetTop = vh - h - PAD; }
    else if (where === "br") { targetLeft = vw - w - PAD; targetTop = vh - h - PAD; }
    else if (where === "center") { targetLeft = (vw - w) / 2; targetTop = (vh - h) / 2; }
    else if (where === "cx") { targetLeft = (vw - w) / 2; }
    else if (where === "cy") { targetTop = (vh - h) / 2; }

    const next: Edit = {
      ...(cur || {
        dx: 0, dy: 0, width: w, height: h,
        origWidth: natural.width / c.scale, origHeight: natural.height / c.scale,
      }),
      dx: Math.round(targetLeft - naturalLeftCanvas),
      dy: Math.round(targetTop - naturalTopCanvas),
    };
    applyEditToEl(el, next);
    commitEdits({ ...editsRef.current, [id]: next });
    requestAnimationFrame(() => rescan());
  }, [primarySelectedId, commitEdits, rescan]);

  const editedIds = useMemo(() => Object.keys(edits), [edits]);
  const primaryTarget = useMemo(
    () => (primarySelectedId ? targets.find((t) => t.id === primarySelectedId) ?? null : null),
    [primarySelectedId, targets]
  );
  const primaryEdit = primarySelectedId ? edits[primarySelectedId] : undefined;

  if (!active) return null;

  // Union outline for multi-select.
  const selectionUnion = (() => {
    if (selectedIds.size < 2) return null;
    const rects: DOMRect[] = [];
    selectedIds.forEach((id) => {
      const t = targets.find((x) => x.id === id);
      if (t) rects.push(t.rect);
    });
    return unionOfRects(rects);
  })();

  return (
    <div
      onPointerDown={(e) => {
        // Empty-area pointer-down: pan if Space, else marquee.
        if (e.target !== e.currentTarget) return;
        if (spaceHeld) startPan(e);
        else startMarquee(e);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "auto",
        cursor: spaceHeld ? "grab" : "default",
        background: "transparent",
      }}
      aria-hidden="true"
    >
      {/* Per-target outlines + handles. */}
      {targets.map((t) => (
        <DevEditOutline
          key={t.id}
          target={t}
          selected={selectedIds.has(t.id)}
          isPrimary={t.id === primarySelectedId}
          edited={!!edits[t.id]}
          spaceHeld={spaceHeld}
          onClick={(e) => {
            if (e.shiftKey || e.metaKey) toggleSelect(t.id);
            else selectOnly(t.id);
          }}
          onStart={(meta, mode, e) => startInteraction(meta, mode, e, selectedIds.has(t.id) && selectedIds.size > 1)}
        />
      ))}

      {/* Union bounding box + group resize handles. */}
      {selectionUnion && (
        <GroupBox
          rect={selectionUnion}
          onStart={(mode, e) => {
            // Use the primary target as the meta carrier.
            if (!primaryTarget) return;
            startInteraction(primaryTarget, mode, e, true);
          }}
        />
      )}

      {/* Smart guides */}
      {activeGuides.map((g, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            background: "rgba(255,0,200,0.9)",
            pointerEvents: "none",
            ...(g.axis === "x"
              ? { left: g.pos, top: g.from, width: 1, height: g.to - g.from }
              : { top: g.pos, left: g.from, height: 1, width: g.to - g.from }),
          }}
        />
      ))}
      {distanceLabels.map((l, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            left: l.x,
            top: l.y,
            transform: "translate(-50%, -50%)",
            background: "rgba(15,15,15,0.9)",
            color: "#ffd84d",
            border: "1px solid rgba(255,0,200,0.9)",
            padding: "2px 5px",
            font: "10px/1 ui-monospace, Menlo, monospace",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {l.text}
        </div>
      ))}

      {/* Marquee */}
      {marquee && (
        <div
          style={{
            position: "fixed",
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
            border: "1px dashed rgba(255,200,0,0.9)",
            background: "rgba(255,200,0,0.07)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* HUD bar */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          padding: "10px 16px",
          background: "rgba(15,15,15,0.94)",
          color: "#f5f2ed",
          font: "11px/1.4 ui-monospace, Menlo, monospace",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderTop: "1px solid rgba(255,200,0,0.4)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "rgba(255,200,0,0.9)" }}>● Dev Mode</span>
        <span style={{ opacity: 0.7 }}>{targets.length} tagged · {editedIds.length} edited</span>
        {selectedIds.size === 1 && primaryTarget && (
          <span style={{ opacity: 0.85, color: "rgba(120,220,140,0.95)" }}>▸ {primaryTarget.label}</span>
        )}
        {selectedIds.size > 1 && (
          <span style={{ opacity: 0.85, color: "rgba(120,220,140,0.95)", display: "flex", alignItems: "center", gap: 6 }}>
            ▸ {selectedIds.size} selected
            <button type="button" onClick={clearSelection} style={miniBtn}>×</button>
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setCanvas({ scale: 1, panX: 0, panY: 0 })}
          style={miniBtn}
          title="Reset zoom (`)"
        >
          {Math.round(canvas.scale * 100)}% ⊕
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.85 }}>
          <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} style={{ accentColor: "#ffd84d" }} />
          Snap 8px
        </label>
        <div style={{ display: "flex", gap: 4, opacity: primarySelectedId ? 1 : 0.4 }}>
          <button type="button" disabled={!primarySelectedId} onClick={() => alignSelected("tl")} style={miniBtn} title="Snap top-left">⌜</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => alignSelected("tr")} style={miniBtn} title="Snap top-right">⌝</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => alignSelected("bl")} style={miniBtn} title="Snap bottom-left">⌞</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => alignSelected("br")} style={miniBtn} title="Snap bottom-right">⌟</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => alignSelected("cx")} style={miniBtn} title="Center horizontally">↔</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => alignSelected("cy")} style={miniBtn} title="Center vertically">↕</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => alignSelected("center")} style={miniBtn} title="Center on screen">◎</button>
        </div>
        <div style={{ display: "flex", gap: 4, opacity: primarySelectedId ? 1 : 0.4 }}>
          <button type="button" disabled={!primarySelectedId} onClick={() => bumpZ(100)} style={miniBtn} title="Bring to front">▲▲</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => bumpZ(1)} style={miniBtn} title="Forward">▲</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => bumpZ(-1)} style={miniBtn} title="Backward">▼</button>
          <button type="button" disabled={!primarySelectedId} onClick={() => bumpZ(-100)} style={miniBtn} title="Send to back">▼▼</button>
        </div>
        <button type="button" onClick={() => setShowStyle((s) => !s)} disabled={!primarySelectedId} style={hudBtn(!primarySelectedId, showStyle)}>Style</button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Reset ALL edits? This clears localStorage too.")) return;
            document.querySelectorAll<HTMLElement>("[data-devedit], [data-devedit-lock]").forEach((el) => {
              el.style.cssText = "";
            });
            commitEdits({});
            clearSelection();
            setCanvas({ scale: 1, panX: 0, panY: 0 });
          }}
          disabled={editedIds.length === 0}
          style={hudBtn(editedIds.length === 0)}
        >
          Reset
        </button>
        <button type="button" onClick={() => setShowDone(true)} style={hudBtn(false, true)}>Done ({editedIds.length})</button>
        <span style={{ opacity: 0.5, fontSize: 9 }}>Shift+D · Esc · ←↑→↓ · Space=pan · ⌘scroll=zoom · `=reset · 1=fit · Alt=free</span>
      </div>

      {/* Style panel */}
      {showStyle && primaryTarget && (
        <StylePanel
          target={primaryTarget}
          edit={primaryEdit}
          extraSelectedCount={selectedIds.size - 1}
          onUpdate={updateStyle}
          onClose={() => setShowStyle(false)}
        />
      )}

      {/* Done panel */}
      {showDone && <DonePanel edits={edits} onClose={() => setShowDone(false)} />}
    </div>
  );
}

// --------------------------------------------------------------------------
// Outline + handles
// --------------------------------------------------------------------------

function DevEditOutline({
  target, selected, isPrimary, edited, spaceHeld, onClick, onStart,
}: {
  target: TargetMeta;
  selected: boolean;
  isPrimary: boolean;
  edited: boolean;
  spaceHeld: boolean;
  onClick: (e: React.PointerEvent) => void;
  onStart: (t: TargetMeta, mode: "move" | "nw" | "ne" | "sw" | "se", e: React.PointerEvent) => void;
}) {
  const r = target.rect;
  const outlineColor = isPrimary
    ? "rgba(255,200,0,0.95)"
    : selected
    ? "rgba(255,200,0,0.7)"
    : edited
    ? "rgba(120,220,140,0.7)"
    : "rgba(255,200,0,0.35)";
  const handleSize = 10;
  const positionLocked = target.lockMode === "position";
  const sizeLocked = target.lockMode === "size";

  if (!selected) {
    return (
      <div
        onPointerDown={(e) => {
          if (spaceHeld) return;
          e.preventDefault();
          e.stopPropagation();
          onClick(e);
        }}
        style={{
          position: "fixed",
          left: r.left, top: r.top, width: r.width, height: r.height,
          outline: `1px dashed ${outlineColor}`,
          outlineOffset: -1,
          background: edited ? "rgba(120,220,140,0.04)" : "transparent",
          cursor: positionLocked ? "default" : "pointer",
          pointerEvents: "auto",
        }}
      >
        <span style={labelChip(outlineColor, false)}>
          {target.label}{target.lockMode !== "none" ? ` · 🔒${target.lockMode}` : ""}
        </span>
      </div>
    );
  }

  const corners: Array<["nw" | "ne" | "sw" | "se", React.CSSProperties]> = [
    ["nw", { left: r.left - handleSize / 2, top: r.top - handleSize / 2, cursor: "nwse-resize" }],
    ["ne", { left: r.right - handleSize / 2, top: r.top - handleSize / 2, cursor: "nesw-resize" }],
    ["sw", { left: r.left - handleSize / 2, top: r.bottom - handleSize / 2, cursor: "nesw-resize" }],
    ["se", { left: r.right - handleSize / 2, top: r.bottom - handleSize / 2, cursor: "nwse-resize" }],
  ];

  return (
    <>
      <div
        onPointerDown={(e) => {
          if (spaceHeld) return;
          if (positionLocked) return;
          onStart(target, "move", e);
        }}
        onClickCapture={(e) => {
          if (e.shiftKey || e.metaKey) { e.stopPropagation(); onClick(e); }
        }}
        style={{
          position: "fixed",
          left: r.left, top: r.top, width: r.width, height: r.height,
          outline: `2px solid ${outlineColor}`,
          outlineOffset: -1,
          background: "rgba(255,200,0,0.06)",
          cursor: positionLocked ? "default" : "move",
          pointerEvents: "auto",
        }}
      >
        <span style={labelChip(outlineColor, true)}>
          {target.label} · {Math.round(r.width)}×{Math.round(r.height)}
          {target.lockMode !== "none" ? ` · 🔒${target.lockMode}` : ""}
        </span>
      </div>
      {!sizeLocked && !positionLocked && corners.map(([mode, style]) => (
        <div
          key={mode}
          onPointerDown={(e) => onStart(target, mode, e)}
          style={{
            position: "fixed",
            width: handleSize, height: handleSize,
            background: outlineColor,
            border: "1px solid rgba(15,15,15,0.9)",
            pointerEvents: "auto",
            ...style,
          }}
        />
      ))}
    </>
  );
}

function labelChip(color: string, primary: boolean): React.CSSProperties {
  return {
    position: "absolute",
    left: 0,
    top: primary ? -20 : -16,
    font: `${primary ? 10 : 9}px/1 ui-monospace, Menlo, monospace`,
    letterSpacing: primary ? "0.14em" : "0.12em",
    textTransform: "uppercase",
    color,
    background: "rgba(15,15,15,0.92)",
    padding: primary ? "3px 7px" : "2px 5px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  };
}

function GroupBox({
  rect, onStart,
}: {
  rect: DOMRect;
  onStart: (mode: "nw" | "ne" | "sw" | "se", e: React.PointerEvent) => void;
}) {
  const handleSize = 12;
  const corners: Array<["nw" | "ne" | "sw" | "se", React.CSSProperties]> = [
    ["nw", { left: rect.left - handleSize / 2, top: rect.top - handleSize / 2, cursor: "nwse-resize" }],
    ["ne", { left: rect.right - handleSize / 2, top: rect.top - handleSize / 2, cursor: "nesw-resize" }],
    ["sw", { left: rect.left - handleSize / 2, top: rect.bottom - handleSize / 2, cursor: "nesw-resize" }],
    ["se", { left: rect.right - handleSize / 2, top: rect.bottom - handleSize / 2, cursor: "nwse-resize" }],
  ];
  return (
    <>
      <div
        style={{
          position: "fixed",
          left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          outline: "1px solid rgba(255,200,0,0.55)",
          outlineOffset: 4,
          pointerEvents: "none",
        }}
      />
      {corners.map(([mode, style]) => (
        <div
          key={mode}
          onPointerDown={(e) => onStart(mode, e)}
          style={{
            position: "fixed",
            width: handleSize, height: handleSize,
            background: "rgba(255,200,0,0.95)",
            border: "1px solid rgba(15,15,15,0.9)",
            borderRadius: 2,
            pointerEvents: "auto",
            ...style,
          }}
        />
      ))}
    </>
  );
}

// --------------------------------------------------------------------------
// Style panel + scrub input
// --------------------------------------------------------------------------

const SHADOW_PRESETS: Array<{ label: string; value: string }> = [
  { label: "None", value: "none" },
  { label: "Soft", value: "0 8px 24px rgba(0,0,0,0.18)" },
  { label: "Medium", value: "0 16px 40px rgba(0,0,0,0.32)" },
  { label: "Heavy", value: "0 30px 80px rgba(0,0,0,0.55)" },
  { label: "Glass", value: "inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 56px rgba(0,0,0,0.45)" },
];

const GLASS_PRESETS: Array<{ label: string; patch: StyleEdit }> = [
  { label: "Frosted Light", patch: { background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)", borderWidth: 1, backdropBlur: 24, backdropSaturate: 130, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 56px rgba(0,0,0,0.4)" } },
  { label: "Frosted Dark",  patch: { background: "rgba(18,18,18,0.48)",   borderColor: "rgba(255,255,255,0.09)", borderWidth: 1, backdropBlur: 20, backdropSaturate: 130, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 56px rgba(0,0,0,0.55)" } },
  { label: "Ghost",         patch: { background: "rgba(255,255,255,0.045)",borderColor: "rgba(255,255,255,0.07)", borderWidth: 1, backdropBlur: 28, backdropSaturate: 120, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.45)" } },
  { label: "Clear",         patch: { background: "transparent", borderColor: "transparent", borderWidth: 0, backdropBlur: 0, backdropSaturate: 100, boxShadow: "none" } },
];

function ScrubInput({
  label, value, step, min, max, onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const startScrub = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = value;
    const onMove = (ev: PointerEvent) => {
      const mult = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
      let next = startVal + (ev.clientX - startX) * step * mult;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      // Round to a sensible precision based on step
      const decimals = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
      next = Number(next.toFixed(decimals));
      onChange(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        onPointerDown={startScrub}
        style={{
          flex: 1,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          opacity: 0.85,
          cursor: "ew-resize",
          userSelect: "none",
        }}
        title="Drag to scrub · Shift=×10 · Alt=÷10"
      >
        ↔ {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...inputStyle, width: 72 }}
      />
    </div>
  );
}

function StylePanel({
  target, edit, extraSelectedCount, onUpdate, onClose,
}: {
  target: TargetMeta;
  edit: Edit | undefined;
  extraSelectedCount: number;
  onUpdate: (patch: Partial<StyleEdit>) => void;
  onClose: () => void;
}) {
  const s = edit?.style || {};
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        right: 16, bottom: 80,
        width: 300, maxHeight: "70vh", overflow: "auto",
        background: "#0f0f0f", color: "#f5f2ed",
        border: "1px solid rgba(255,200,0,0.4)",
        padding: 14,
        font: "11px/1.4 ui-monospace, Menlo, monospace",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}>Style · {target.label}</strong>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} style={hudBtn(false)}>×</button>
      </div>
      {extraSelectedCount > 0 && (
        <div style={{
          marginBottom: 10,
          padding: "5px 8px",
          background: "rgba(255,200,0,0.08)",
          border: "1px solid rgba(255,200,0,0.3)",
          color: "#f5f2ed",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          opacity: 0.85,
        }}>
          Editing primary · {extraSelectedCount} other{extraSelectedCount > 1 ? "s" : ""} selected (style applies to primary only)
        </div>
      )}

      <Section title="Glass Presets">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {GLASS_PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => onUpdate(p.patch)} style={hudBtn(false)}>
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Background">
        <input type="text" value={s.background ?? ""} placeholder="rgba(0,0,0,0.5) or #fff"
          onChange={(e) => onUpdate({ background: e.target.value })} style={inputStyle} />
      </Section>

      <Section title="Backdrop Blur (px)">
        <ScrubInput label="blur" step={1} min={0} max={80} value={s.backdropBlur ?? 0} onChange={(v) => onUpdate({ backdropBlur: v })} />
      </Section>
      <Section title="Backdrop Saturate (%)">
        <ScrubInput label="sat" step={1} min={0} max={300} value={s.backdropSaturate ?? 100} onChange={(v) => onUpdate({ backdropSaturate: v })} />
      </Section>
      <Section title="Border">
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input type="text" value={s.borderColor ?? ""} placeholder="rgba(255,255,255,0.1)"
            onChange={(e) => onUpdate({ borderColor: e.target.value })} style={{ ...inputStyle, flex: 2 }} />
        </div>
        <ScrubInput label="width" step={1} min={0} max={20} value={s.borderWidth ?? 0} onChange={(v) => onUpdate({ borderWidth: v })} />
      </Section>
      <Section title="Border Radius">
        <ScrubInput label="radius" step={1} min={0} max={120} value={s.borderRadius ?? 0} onChange={(v) => onUpdate({ borderRadius: v })} />
      </Section>
      <Section title="Box Shadow">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {SHADOW_PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => onUpdate({ boxShadow: p.value })} style={hudBtn(false, s.boxShadow === p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Rotate (deg)">
        <ScrubInput label="rotate" step={0.5} min={-180} max={180} value={s.rotate ?? 0} onChange={(v) => onUpdate({ rotate: v })} />
      </Section>
      <Section title="Z-Index">
        <ScrubInput label="z" step={1} value={s.zIndex ?? 0} onChange={(v) => onUpdate({ zIndex: v })} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.55, marginBottom: 5 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a",
  color: "#f5f2ed",
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "5px 7px",
  font: "11px/1.2 ui-monospace, Menlo, monospace",
  width: "100%",
  outline: "none",
};

// --------------------------------------------------------------------------
// Done panel
// --------------------------------------------------------------------------

function buildCss(edits: Record<string, Edit>) {
  return Object.entries(edits)
    .map(([id, e]) => {
      const dx = Math.round(e.dx);
      const dy = Math.round(e.dy);
      const w = Math.round(e.width);
      const h = Math.round(e.height);
      const lines: string[] = [];
      const rotate = e.style?.rotate ? ` rotate(${e.style.rotate}deg)` : "";
      lines.push(`  transform: translate(${dx}px, ${dy}px)${rotate};`);
      lines.push(`  width: ${w}px;`);
      lines.push(`  height: ${h}px;`);
      const s = e.style;
      if (s) {
        if (s.background !== undefined) lines.push(`  background: ${s.background};`);
        if (s.borderColor !== undefined && s.borderWidth !== undefined) {
          lines.push(`  border: ${s.borderWidth}px solid ${s.borderColor};`);
        }
        if (s.borderRadius !== undefined) lines.push(`  border-radius: ${s.borderRadius}px;`);
        if (s.boxShadow !== undefined) lines.push(`  box-shadow: ${s.boxShadow};`);
        if (s.backdropBlur !== undefined || s.backdropSaturate !== undefined) {
          const b = s.backdropBlur ?? 0;
          const sat = s.backdropSaturate ?? 100;
          lines.push(`  backdrop-filter: blur(${b}px) saturate(${sat}%);`);
          lines.push(`  -webkit-backdrop-filter: blur(${b}px) saturate(${sat}%);`);
        }
        if (s.zIndex !== undefined) lines.push(`  z-index: ${s.zIndex};`);
      }
      return `#${id} {\n${lines.join("\n")}\n}`;
    })
    .join("\n\n");
}

function DonePanel({ edits, onClose }: { edits: Record<string, Edit>; onClose: () => void }) {
  const entries = Object.entries(edits);
  const css = buildCss(edits);
  const lockedBrief = `/* Locked layout — do NOT modify these selectors' transform/width/height/background/border/backdrop-filter. */\n${css}`;
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, pointerEvents: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(820px, 100%)", maxHeight: "80vh", overflow: "auto",
          background: "#0f0f0f", color: "#f5f2ed",
          border: "1px solid rgba(255,200,0,0.4)",
          padding: 20,
          font: "12px/1.5 ui-monospace, Menlo, monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <strong style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>CSS Output · {entries.length} edits</strong>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={() => navigator.clipboard?.writeText(css)} style={hudBtn(false, true)}>Copy CSS</button>
          <span style={{ width: 8 }} />
          <button type="button" onClick={() => navigator.clipboard?.writeText(lockedBrief)} style={hudBtn(false)}>Copy Locked Brief</button>
          <span style={{ width: 8 }} />
          <button type="button" onClick={onClose} style={hudBtn(false)}>Close</button>
        </div>
        {entries.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No edits yet. Click an element, then drag/resize or open Style.</p>
        ) : (
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#1a1a1a", padding: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            {css}
          </pre>
        )}
        <p style={{ opacity: 0.55, marginTop: 12 }}>
          Paste into the matching component's CSS and refresh. Edits persist in localStorage so a refresh won't lose them — use Reset to clear.
        </p>
      </div>
    </div>
  );
}

function hudBtn(disabled: boolean, primary = false): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: primary ? "#f5f2ed" : "transparent",
    color: primary ? "#0f0f0f" : "#f5f2ed",
    border: "1px solid rgba(255,255,255,0.25)",
    font: "10px/1 ui-monospace, Menlo, monospace",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}

const miniBtn: React.CSSProperties = {
  padding: "4px 7px",
  background: "transparent",
  color: "#f5f2ed",
  border: "1px solid rgba(255,255,255,0.2)",
  font: "11px/1 ui-monospace, Menlo, monospace",
  cursor: "pointer",
  minWidth: 26,
};

import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Minimize2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { motion, useMotionValue, animate, useMotionValueEvent } from "framer-motion";
import { useGesture } from "@use-gesture/react";
import { listSketches, type Sketch } from "@/lib/sketch.functions";

const TILE = 300;
const GAP = 24;
const PITCH = TILE + GAP;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.0;
const PRIORITY_CELL_COUNT = 14;

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const Route = createFileRoute("/sketch")({
  loader: () => listSketches(),
  head: () => ({
    meta: [
      { title: "Sketchbook — Archive 001" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SketchPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#d4cdc4] flex items-center justify-center p-8">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#1a1a1a]/60 font-serif">
        Archive Unavailable — {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-[#d4cdc4] flex items-center justify-center">
      <p className="text-[10px] tracking-[0.4em] uppercase text-[#1a1a1a]/60 font-serif">
        Not Found
      </p>
    </div>
  ),
});

function SketchPage() {
  const rawSketches = Route.useLoaderData() as Sketch[];

  const sketches = useMemo(() => {
    const hash = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    return [...rawSketches].sort((a, b) => hash(a.name) - hash(b.name));
  }, [rawSketches]);

  // Progressive reveal: decode only the first viewport before lifting the
  // veil. The rest are handed to the browser's native lazy loader + our
  // fetchPriority hints — no giant Image() waterfall that saturates the
  // connection on mobile and pins ~200MB of decoded bitmaps on low-end
  // devices for tiles the user may never pan to.
  const [loaded, setLoaded] = useState(0);
  const total = sketches.length;
  const FIRST_PAINT_COUNT = Math.min(24, total);
  const ready = total > 0 && loaded >= FIRST_PAINT_COUNT;

  useEffect(() => {
    if (total === 0) return;
    let cancelled = false;
    let done = 0;

    const priority = sketches.slice(0, FIRST_PAINT_COUNT);
    priority.forEach((s) => {
      const img = new Image();
      img.decoding = "async";
      img.src = s.tileUrl;
      const finish = () => {
        if (cancelled) return;
        done += 1;
        setLoaded(done);
      };
      img.decode().then(finish).catch(() => {
        if (img.complete) finish();
        else {
          img.onload = finish;
          img.onerror = finish;
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [sketches, total, FIRST_PAINT_COUNT]);


  const N = sketches.length;
  const COLS = Math.max(1, Math.ceil(Math.sqrt(N)));
  const ROWS = Math.max(1, Math.ceil(N / COLS));
  const WORLD_W = COLS * PITCH;
  const WORLD_H = ROWS * PITCH;

  const containerRef = useRef<HTMLDivElement>(null);

  const initialVp = { w: 1440, h: 900 };

  // Center the whole world on first paint. IDs wrap at the edges; the render
  // window tracks pan in coarse cell steps so there is no finite dead zone.
  const initialX = -Math.round(Math.max(0, WORLD_W - initialVp.w) / 2);
  const initialY = -Math.round(Math.max(0, WORLD_H - initialVp.h) / 2);

  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);
  const scale = useMotionValue(1);

  const [vp, setVp] = useState(initialVp);
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const [panOrigin, setPanOrigin] = useState({
    qx: Math.floor(-initialX / PITCH),
    qy: Math.floor(-initialY / PITCH),
  });

  const dynamicZoomMin = Math.min(
    1,
    Math.max(ZOOM_MIN, vp.w / Math.max(1, WORLD_W * 2), vp.h / Math.max(1, WORLD_H * 2)),
  );

  // Quantize pan origin in COARSE steps so React only re-renders every
  // PAN_STEP cells crossed, not every one. Bleed absorbs the difference.
  const PAN_STEP = 3;
  const [zoomBucket, setZoomBucket] = useState(0);
  useMotionValueEvent(x, "change", (latest) => {
    const qx = Math.floor(-latest / (PITCH * scale.get() * PAN_STEP)) * PAN_STEP;
    setPanOrigin((prev) => (qx === prev.qx ? prev : { ...prev, qx }));
  });

  useMotionValueEvent(y, "change", (latest) => {
    const qy = Math.floor(-latest / (PITCH * scale.get() * PAN_STEP)) * PAN_STEP;
    setPanOrigin((prev) => (qy === prev.qy ? prev : { ...prev, qy }));
  });

  // Bucket zoom into coarse steps so the render-window recomputes when the
  // user zooms out (more cells fit), without re-rendering on every frame.
  useMotionValueEvent(scale, "change", (latest) => {
    const b = Math.round(Math.log2(Math.max(0.1, latest)) * 4);
    setZoomBucket((prev) => (prev === b ? prev : b));
  });

  const cells = useMemo(() => {
    if (N === 0) return [];
    const out: { c: number; r: number; idx: number; key: string }[] = [];
    const s = Math.max(dynamicZoomMin, scale.get());
    // Bleed scales with zoom. At zoom-out (s < 1) the viewport already fits
    // many more cells; a fixed bleed of 6 there means 288+ tiles in the DOM,
    // most invisible. Shrink bleed with zoom so mobile at min-zoom carries
    // ~4× fewer DOM nodes. At zoom=1: bleed=4. At zoom=2: bleed=4. At
    // zoom=0.4: bleed=2. Never below 2 (avoids visible pop at pan boundaries).
    const bleed = Math.max(2, Math.round(4 * Math.min(1, s)));
    const cols = Math.ceil(vp.w / (PITCH * s));
    const rows = Math.ceil(vp.h / (PITCH * s));
    const c0 = panOrigin.qx - bleed;
    const c1 = panOrigin.qx + cols + bleed;
    const r0 = panOrigin.qy - bleed;
    const r1 = panOrigin.qy + rows + bleed;

    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const idx = mod(mod(r, ROWS) * COLS + mod(c, COLS), N);
        out.push({ c, r, idx, key: `${c},${r}` });
      }
    }

    return out;
    // zoomBucket forces recompute on coarse zoom changes; scale ref itself
    // is stable so it can't drive the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, dynamicZoomMin, vp.w, vp.h, panOrigin, ROWS, COLS, zoomBucket]);



  const applyZoom = useCallback(
    (delta: number, ox: number, oy: number) => {
      const current = scale.get();
      const next = Math.max(dynamicZoomMin, Math.min(ZOOM_MAX, current * (1 + delta)));
      if (next === current) return;
      const ratio = next / current;
      scale.set(next);
      x.set(ox - (ox - x.get()) * ratio);
      y.set(oy - (oy - y.get()) * ratio);
    },
    [x, y, scale, dynamicZoomMin],
  );

  const [hintVisible, setHintVisible] = useState(true);
  const hintDismissed = useRef(false);
  const dismissHint = useCallback(() => {
    if (hintDismissed.current) return;
    hintDismissed.current = true;
    setHintVisible(false);
  }, []);

  // Auto-drift intro removed — canvas stays put on load.

  useEffect(() => {
    const timeout = setTimeout(() => setHintVisible(false), 7000);
    return () => clearTimeout(timeout);
  }, []);

  // Respect reduced-motion: skip wheel lerp + drag inertia entirely for
  // users who ask for it (accessibility + battery savings on low-end).
  const reducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotion.current = mq.matches;
    };
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  // Smooth wheel: accumulate deltas into a target, lerp current toward it.
  // Only used for coarse mouse-wheel notches. Trackpads deliver OS-momentum
  // in tiny pixel deltas — layering our own lerp on top produces the
  // "molasses" feel users report. Detected below and skipped.
  const wheelTargetX = useRef(x.get());
  const wheelTargetY = useRef(y.get());
  const wheelRaf = useRef<number | null>(null);
  const startWheelLerp = useCallback(() => {
    if (wheelRaf.current !== null) return;
    const tick = () => {
      const cx = x.get();
      const cy = y.get();
      const tx = wheelTargetX.current;
      const ty = wheelTargetY.current;
      const nx = cx + (tx - cx) * 0.28;
      const ny = cy + (ty - cy) * 0.28;
      x.set(nx);
      y.set(ny);
      if (Math.abs(tx - nx) < 0.5 && Math.abs(ty - ny) < 0.5) {
        x.set(tx);
        y.set(ty);
        wheelRaf.current = null;
        return;
      }
      wheelRaf.current = requestAnimationFrame(tick);
    };
    wheelRaf.current = requestAnimationFrame(tick);
  }, [x, y]);

  useEffect(() => () => {
    if (wheelRaf.current !== null) cancelAnimationFrame(wheelRaf.current);
  }, []);

  // Track cursor position so keyboard zoom (+/-) can zoom toward whatever
  // tile the user is hovering, not the dead-center of the viewport.
  const lastPointer = useRef({ x: 0, y: 0 });

  // Pan-idle effect toggle: mix-blend-multiply and box-shadow are the two
  // most expensive per-frame paint operations on this canvas. During active
  // pan/zoom we drop both (via a `data-panning` attribute + CSS) and restore
  // them 140ms after the last input. This is what Figma/Miro do — the eye
  // can't resolve blend/shadow detail during motion anyway, and the frame
  // budget goes from ~30ms/frame to ~4ms/frame on mid-range hardware.
  const panningRef = useRef(false);
  const panIdleTimer = useRef<number | null>(null);
  const markPanning = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!panningRef.current) {
      panningRef.current = true;
      el.setAttribute("data-panning", "");
    }
    if (panIdleTimer.current !== null) window.clearTimeout(panIdleTimer.current);
    panIdleTimer.current = window.setTimeout(() => {
      panningRef.current = false;
      el.removeAttribute("data-panning");
      panIdleTimer.current = null;
    }, 140);
  }, []);
  useEffect(() => () => {
    if (panIdleTimer.current !== null) window.clearTimeout(panIdleTimer.current);
  }, []);





  useGesture(
    {
      onDrag: ({ delta: [dx, dy], last, velocity: [vx, vy], direction: [dirX, dirY], tap }) => {
        if (tap) return;
        dismissHint();
        markPanning();
        x.stop();
        y.stop();

        x.set(x.get() + dx);
        y.set(y.get() + dy);

        if (last && !reducedMotion.current) {
          // Tighter inertia: shorter tail (200 vs 280) + lower cap (900 vs
          // 1400) so a fast flick settles in <0.4s and the Reset button
          // isn't racing an in-flight spring when the user re-engages.
          animate(x, x.get() + dirX * Math.min(vx * 120, 900), {
            type: "inertia",
            power: 0.45,
            timeConstant: 200,
          });
          animate(y, y.get() + dirY * Math.min(vy * 120, 900), {
            type: "inertia",
            power: 0.45,
            timeConstant: 200,
          });
        }
      },
      onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
        event.preventDefault();
        dismissHint();
        markPanning();



        if (ctrlKey) {
          // Ctrl+wheel = zoom. Standard mouse wheels fire deltaY ≈ 100+ per
          // notch; unclamped, -dy*0.01 = -1.0 = 100% scale jump in a single
          // click. Cap the effective delta so one notch is a smooth ~15%
          // step regardless of device (trackpads already send small deltas).
          const clamped = Math.sign(dy) * Math.min(Math.abs(dy), 30);
          applyZoom(-clamped * 0.01, event.clientX, event.clientY);
          return;
        }

        // Trackpad heuristic: pixel-mode wheel with small per-event delta =
        // OS-momentum trackpad. Layering our own lerp on top double-eases
        // (OS decelerates, then we decelerate again) → the "molasses" feel.
        // Direct-set matches Figma's trackpad behavior. Coarse mouse wheels
        // (line-mode or |delta| ≥ 40) still get the lerp for smoothness.
        const isTrackpad =
          (event as WheelEvent).deltaMode === 0 &&
          Math.abs(dx) < 40 &&
          Math.abs(dy) < 40;

        if (reducedMotion.current || isTrackpad) {
          x.stop();
          y.stop();
          x.set(x.get() - dx);
          y.set(y.get() - dy);
        } else {
          // Resync target from live position on wheel entry — cheaper than
          // a reactive useMotionValueEvent subscription that fires 60/sec.
          if (wheelRaf.current === null) {
            wheelTargetX.current = x.get();
            wheelTargetY.current = y.get();
          }
          wheelTargetX.current -= dx;
          wheelTargetY.current -= dy;
          startWheelLerp();
        }
      },

      onPinch: ({ origin: [ox, oy], offset: [distance], memo }) => {
        dismissHint();
        const base = memo ?? scale.get() / distance;
        const next = Math.max(dynamicZoomMin, Math.min(ZOOM_MAX, base * distance));
        const ratio = next / scale.get();
        scale.set(next);
        x.set(ox - (ox - x.get()) * ratio);
        y.set(oy - (oy - y.get()) * ratio);
        return base;
      },
      onMove: ({ event }) => {
        // Track pointer for zoom-to-cursor on keyboard +/-. Ref write — no
        // React state, no re-render.
        lastPointer.current.x = (event as PointerEvent).clientX ?? 0;
        lastPointer.current.y = (event as PointerEvent).clientY ?? 0;
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: { filterTaps: true, tapsThreshold: 8, pointer: { keys: false } },
    },
  );


  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const close = useCallback(() => setOpenIdx(null), []);
  const prev = useCallback(
    () => setOpenIdx((i) => (i === null ? null : (i - 1 + N) % N)),
    [N],
  );
  const next = useCallback(
    () => setOpenIdx((i) => (i === null ? null : (i + 1) % N)),
    [N],
  );

  const navigate = Route.useNavigate();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (openIdx !== null) {
        if (event.key === "Escape") close();
        if (event.key === "ArrowLeft") prev();
        if (event.key === "ArrowRight") next();
        return;
      }

      // ESC on the canvas = exit to home (accessibility escape hatch)
      if (event.key === "Escape") {
        navigate({ to: "/" });
        return;
      }


      const STEP = 200;
      if (event.key === "ArrowLeft") animate(x, x.get() + STEP, { type: "spring", stiffness: 200, damping: 30 });
      if (event.key === "ArrowRight") animate(x, x.get() - STEP, { type: "spring", stiffness: 200, damping: 30 });
      if (event.key === "ArrowUp") animate(y, y.get() + STEP, { type: "spring", stiffness: 200, damping: 30 });
      if (event.key === "ArrowDown") animate(y, y.get() - STEP, { type: "spring", stiffness: 200, damping: 30 });
      // Zoom toward the last known cursor position (Figma-style) rather
      // than the viewport center — makes +/- feel like it's zooming into
      // whatever the user was looking at. Falls back to center if the
      // pointer hasn't been over the canvas yet.
      const zx = lastPointer.current.x || vp.w / 2;
      const zy = lastPointer.current.y || vp.h / 2;
      if (event.key === "+" || event.key === "=") applyZoom(0.15, zx, zy);
      if (event.key === "-" || event.key === "_") applyZoom(-0.15, zx, zy);

      if (event.key === "0") {
        animate(x, initialX);
        animate(y, initialY);
        animate(scale, 1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close, prev, next, x, y, scale, applyZoom, vp.w, vp.h, navigate, initialX, initialY]);

  useEffect(() => {
    if (scale.get() < dynamicZoomMin) scale.set(dynamicZoomMin);
  }, [dynamicZoomMin, scale]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  const totalLabel = N.toString().padStart(3, "0");
  const recenter = useCallback(() => {
    animate(x, initialX, { type: "spring", stiffness: 150, damping: 25 });
    animate(y, initialY, { type: "spring", stiffness: 150, damping: 25 });
    animate(scale, 1, { type: "spring", stiffness: 150, damping: 25 });
  }, [x, y, scale, initialX, initialY]);


  const pct = total === 0 ? 0 : Math.round((loaded / total) * 100);

  return (
    <div className="fixed inset-0 bg-[#d4cdc4] text-[#1a1a1a] font-serif overflow-hidden select-none">
      {/* Loading veil — sits above the canvas until every tile is decoded */}
      <div
        className={`absolute inset-0 z-40 bg-[#d4cdc4] flex flex-col items-center justify-center gap-6 transition-opacity duration-700 ${
          ready ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        <div className="text-[10px] tracking-[0.5em] uppercase text-[#1a1a1a]/70">
          Loading Sketchbook
        </div>
        <div className="w-48 h-px bg-[#1a1a1a]/15 overflow-hidden">
          <div
            className="h-full bg-[#1a1a1a] transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[9px] tracking-[0.4em] uppercase text-[#1a1a1a]/50 tabular-nums">
          {loaded.toString().padStart(3, "0")} / {totalLabel}
        </div>
      </div>

      <div
        ref={containerRef}
        // Cursor swap via CSS pseudo-state — was JS `style.cursor` writes on
        // every pointerdown/up/leave, which forced style recalcs on a subtree
        // of ~200 tiles. `active:` covers the down-state with zero JS.
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
        style={{ WebkitUserSelect: "none" }}
      >

        <motion.div
          className={`absolute top-0 left-0 will-change-transform ${ready ? "opacity-100" : "opacity-0"}`}
          style={{
            x,
            y,
            scale,
            transformOrigin: "0 0",
            backfaceVisibility: "hidden",
            // Isolate the blend context so `mix-blend-multiply` on every
            // tile image resolves inside this one composited layer instead
            // of forcing a full-page repaint against the page backdrop on
            // every pan/zoom frame. The background must match the page so
            // multiply produces the same visual result as blending against
            // the page directly.
            isolation: "isolate",
            backgroundColor: "#d4cdc4",
          }}
        >

          {cells.map(({ c, r, idx, key }) => {
            const sketch = sketches[idx];
            if (!sketch) return null;
            return (
              <Tile
                key={key}
                tileUrl={sketch.tileUrl}
                idx={idx}
                c={c}
                r={r}
                onOpen={setOpenIdx}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Persistent top bar — solid backdrop (no blur), always visible,
          always focusable. Sits above canvas + intro drift. */}
      <nav className="pointer-events-none fixed top-0 left-0 right-0 z-[60] flex justify-between items-center gap-4 px-4 md:px-6 pt-4" aria-label="Sketchbook navigation">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="pointer-events-auto flex items-center gap-3 bg-[#ffffff] shadow-[0_2px_18px_rgba(26,26,26,0.08)] px-4 py-2.5 border-r border-[#1a1a1a]/5">
            <span className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-bold text-[#1a1a1a]">
              Archive 001
            </span>
          </div>
          
          <button
            type="button"
            onClick={recenter}
            className="pointer-events-auto flex items-center gap-2 bg-[#ffffff] text-[#1a1a1a]/70 hover:text-[#1a1a1a] px-4 py-2.5 shadow-[0_2px_18px_rgba(26,26,26,0.08)] transition-all active:scale-95"
            aria-label="Reset sketchbook view"
            title="Reset View"
          >
            <Minimize2 size={12} />
            <span className="hidden sm:inline text-[9px] tracking-[0.3em] uppercase font-medium">Reset</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="pointer-events-auto flex items-center gap-2 bg-[#ffffff] shadow-[0_2px_18px_rgba(26,26,26,0.08)] p-1">
            <Link
              to="/collection"
              className="hidden sm:flex items-center bg-[#ffffff] text-[#1a1a1a] text-[10px] md:text-[11px] tracking-[0.3em] uppercase font-medium px-3 py-2.5 hover:bg-[#f1f1f1] transition-colors"
              aria-label="Go to collection"
            >
              Collection
            </Link>
            <Link
              to="/"
              className="flex items-center bg-[#ffffff] text-[#1a1a1a]/70 hover:text-[#1a1a1a] p-3 transition-all"
              aria-label="Return home"
            >
              <Home size={14} />
            </Link>
          </div>
          <Link
            to="/"
            className="pointer-events-auto flex items-center gap-2 bg-[#1a1a1a] text-[#ffffff] text-[10px] md:text-[11px] tracking-[0.35em] uppercase font-bold px-5 py-3 md:px-6 shadow-[0_4px_20px_rgba(26,26,26,0.25)] hover:bg-[#000000] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            aria-label="Exit sketchbook"
          >
            <span aria-hidden="true">✕</span>
            <span>Exit</span>
          </Link>
        </div>
      </nav>

      {/* Bottom hint — auto-fades but only for the ambient tips, never the Exit */}
      <div
        className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-[#ffffff]/95 px-4 py-2 shadow-[0_2px_12px_rgba(26,26,26,0.08)] transition-opacity duration-[1200ms] ${hintVisible ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-[9px] tracking-[0.4em] uppercase text-[#1a1a1a]/70">
          Drag · Scroll · Pinch
        </span>
        <span className="text-[9px] tracking-[0.4em] uppercase text-[#1a1a1a]/40">
          ESC to exit
        </span>
      </div>


      {openIdx !== null && sketches[openIdx] && (
        <div
          className="fixed inset-0 z-50 bg-[#1a1a1a]/95 flex items-center justify-center p-4 md:p-12"
          onClick={close}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              prev();
            }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-[#d4cdc4]/60 hover:text-[#d4cdc4] transition text-[10px] tracking-[0.4em] uppercase"
            aria-label="Previous plate"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              next();
            }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-[#d4cdc4]/60 hover:text-[#d4cdc4] transition text-[10px] tracking-[0.4em] uppercase"
            aria-label="Next plate"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            className="absolute top-4 right-4 md:top-8 md:right-8 text-[#d4cdc4]/60 hover:text-[#d4cdc4] transition text-[10px] tracking-[0.4em] uppercase"
            aria-label="Close"
          >
            Close ×
          </button>
          <div
            className="max-w-[92vw] max-h-[85vh] bg-[#ffffff] p-4 md:p-8 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={sketches[openIdx].url}
              alt={`Sketch plate ${(openIdx + 1).toString().padStart(3, "0")}`}
              className="max-w-full max-h-[75vh] object-contain mix-blend-multiply"
              decoding="async"
              loading="eager"
              fetchPriority="high"
            />
            <div className="mt-4 pt-3 border-t border-[#1a1a1a]/10 flex justify-between text-[9px] tracking-[0.35em] uppercase text-[#1a1a1a]/60 font-serif">
              <span>Plate</span>
              <span>
                {(openIdx + 1).toString().padStart(3, "0")} / {totalLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized tile: props are all primitives so React.memo skips reconciliation
// on every parent render. Combined with the fixed render range, this means
// zero React work during pan/zoom — only the parent transform moves.
type TileProps = {
  tileUrl: string;
  idx: number;
  c: number;
  r: number;
  onOpen: (idx: number) => void;
};

const Tile = memo(function Tile({ tileUrl, idx, c, r, onOpen }: TileProps) {
  const label = (idx + 1).toString().padStart(3, "0");
  // Priority derived from stable idx only — never flips during pan, so
  // React.memo's shallow prop compare always short-circuits.
  const priority = idx < PRIORITY_CELL_COUNT;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(idx);
      }}
      // tabIndex=-1: canvas tiles are NOT in the keyboard tab order (the
      // top-bar controls are). Arrow keys pan the canvas globally; Tab-ing
      // through hundreds of infinite-wrap tiles has no meaningful nav story.
      // focus-visible: retains a visible ring when a tile IS focused
      // programmatically (e.g. after opening a lightbox and returning).
      tabIndex={-1}
      className="absolute block bg-[#ffffff] shadow-[0_2px_18px_rgba(26,26,26,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#d4cdc4]"
      style={{
        left: c * PITCH,
        top: r * PITCH,
        width: TILE,
        height: TILE,
        contain: "layout paint style size",
        // NOTE: Do NOT add `will-change: transform` here. It promotes the
        // tile to its own compositor layer, which creates a new stacking
        // context and isolates the image's `mix-blend-multiply` inside that
        // layer — the img then blends against the button's white bg instead
        // of the isolation layer's beige, rendering as an opaque white box.
      }}

      aria-label={`Open plate ${label}`}
      draggable={false}
    >

      <img
        src={tileUrl}
        alt=""
        width={TILE}
        height={TILE}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}

        decoding="async"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
      />
      <span className="absolute bottom-2 right-2 text-[8px] tracking-[0.3em] uppercase text-[#1a1a1a]/40 font-medium pointer-events-none">
        {label}
      </span>
    </button>
  );
});

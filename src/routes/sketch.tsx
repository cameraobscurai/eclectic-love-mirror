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

  // Progressive reveal: show canvas as soon as the first viewport is decoded,
  // then stream the rest in the background. No more waiting on 200+ tiles.
  const [loaded, setLoaded] = useState(0);
  const total = sketches.length;
  const FIRST_PAINT_COUNT = Math.min(24, total);
  const ready = total > 0 && loaded >= FIRST_PAINT_COUNT;

  useEffect(() => {
    if (total === 0) return;
    let cancelled = false;
    let done = 0;

    const preload = (url: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
        const finish = () => {
          if (cancelled) return resolve();
          done += 1;
          setLoaded(done);
          resolve();
        };
        img
          .decode()
          .then(finish)
          .catch(() => {
            if (img.complete) finish();
            else {
              img.onload = finish;
              img.onerror = finish;
            }
          });
      });

    (async () => {
      const priority = sketches.slice(0, FIRST_PAINT_COUNT);
      const rest = sketches.slice(FIRST_PAINT_COUNT);
      await Promise.all(priority.map((s) => preload(s.tileUrl)));
      Promise.all(rest.map((s) => preload(s.tileUrl))).catch(() => {});
    })().catch(() => {});

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

  useMotionValueEvent(x, "change", (latest) => {
    const qx = Math.floor(-latest / (PITCH * scale.get()));
    setPanOrigin((prev) => (qx === prev.qx ? prev : { ...prev, qx }));
  });

  useMotionValueEvent(y, "change", (latest) => {
    const qy = Math.floor(-latest / (PITCH * scale.get()));
    setPanOrigin((prev) => (qy === prev.qy ? prev : { ...prev, qy }));
  });

  const cells = useMemo(() => {
    if (N === 0) return [];
    const out: { c: number; r: number; idx: number; key: string; priority: boolean }[] = [];
    const s = Math.max(dynamicZoomMin, scale.get());
    const bleed = 5;
    const cols = Math.ceil(vp.w / (PITCH * s));
    const rows = Math.ceil(vp.h / (PITCH * s));
    const c0 = panOrigin.qx - bleed;
    const c1 = panOrigin.qx + cols + bleed;
    const r0 = panOrigin.qy - bleed;
    const r1 = panOrigin.qy + rows + bleed;

    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const idx = mod(mod(r, ROWS) * COLS + mod(c, COLS), N);
        const priority = Math.abs(c - panOrigin.qx) <= 2 && Math.abs(r - panOrigin.qy) <= 2;
        out.push({ c, r, idx, key: `${c},${r}`, priority });
      }
    }

    return out;
  }, [N, dynamicZoomMin, vp.w, vp.h, panOrigin, ROWS, COLS, scale]);

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
  const dismissHint = useCallback(() => setHintVisible(false), []);

  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    if (introDone || !ready) return;

    x.stop();
    y.stop();
    const startX = x.get();
    const startY = y.get();
    const ax = animate(x, startX - 180, {
      duration: 6,
      ease: [0.4, 0, 0.2, 1],
    });
    const ay = animate(y, startY - 60, {
      duration: 6,
      ease: [0.4, 0, 0.2, 1],
    });

    const cancel = () => {
      ax.stop();
      ay.stop();
      setIntroDone(true);
    };

    window.addEventListener("pointerdown", cancel, { once: true });
    window.addEventListener("wheel", cancel, { once: true, passive: true });
    window.addEventListener("keydown", cancel, { once: true });

    return () => {
      ax.stop();
      ay.stop();
    };
  }, [introDone, ready, x, y]);

  useEffect(() => {
    const timeout = setTimeout(() => setHintVisible(false), 7000);
    return () => clearTimeout(timeout);
  }, []);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], last, velocity: [vx, vy], direction: [dirX, dirY], tap }) => {
        if (tap) return;
        dismissHint();
        x.stop();
        y.stop();
        x.set(x.get() + dx);
        y.set(y.get() + dy);

        if (last) {
          animate(x, x.get() + dirX * Math.min(vx * 140, 1400), {
            type: "inertia",
            power: 0.55,
            timeConstant: 280,
          });
          animate(y, y.get() + dirY * Math.min(vy * 140, 1400), {
            type: "inertia",
            power: 0.55,
            timeConstant: 280,
          });
        }
      },
      onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
        event.preventDefault();
        dismissHint();

        if (ctrlKey) {
          applyZoom(-dy * 0.01, event.clientX, event.clientY);
        } else {
          x.stop();
          y.stop();
          x.set(x.get() - dx);
          y.set(y.get() - dy);
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
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: { filterTaps: true, pointer: { keys: false } },
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
      if (event.key === "+" || event.key === "=") applyZoom(0.15, vp.w / 2, vp.h / 2);
      if (event.key === "-" || event.key === "_") applyZoom(-0.15, vp.w / 2, vp.h / 2);
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
        onPointerDown={() => {
          if (containerRef.current) containerRef.current.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          if (containerRef.current) containerRef.current.style.cursor = "grab";
        }}
        onPointerLeave={() => {
          if (containerRef.current) containerRef.current.style.cursor = "grab";
        }}
        className="absolute inset-0 touch-none cursor-grab"
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
          }}
        >
          {cells.map(({ c, r, idx, key, priority }) => {
            const sketch = sketches[idx];
            if (!sketch) return null;
            return (
              <Tile
                key={key}
                tileUrl={sketch.tileUrl}
                idx={idx}
                c={c}
                r={r}
                priority={priority || idx < PRIORITY_CELL_COUNT}
                ready={ready}
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
  priority: boolean;
  ready: boolean;
  onOpen: (idx: number) => void;
};

const Tile = memo(function Tile({
  tileUrl,
  idx,
  c,
  r,
  priority,
  ready,
  onOpen,
}: TileProps) {
  const label = (idx + 1).toString().padStart(3, "0");
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(idx);
      }}
      className="absolute block bg-[#ffffff] shadow-[0_2px_18px_rgba(26,26,26,0.06)] focus:outline-none"
      style={{
        left: c * PITCH,
        top: r * PITCH,
        width: TILE,
        height: TILE,
        contain: "layout paint style size",
      }}
      aria-label={`Open plate ${label}`}
      draggable={false}
    >
      <img
        src={tileUrl}
        alt=""
        width={TILE}
        height={TILE}
        loading="eager"
        fetchPriority={priority ? "high" : "auto"}
        decoding={ready ? "sync" : "async"}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
      />
      <span className="absolute bottom-2 right-2 text-[8px] tracking-[0.3em] uppercase text-[#1a1a1a]/40 font-medium pointer-events-none">
        {label}
      </span>
    </button>
  );
});

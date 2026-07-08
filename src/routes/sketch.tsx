import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
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

  // Preload every tile bitmap into the browser cache + decode it on the GPU
  // BEFORE rendering the canvas. Once decoded, remounts during pan hit the
  // cache instantly with zero white-flash and zero re-decode cost.
  const [loaded, setLoaded] = useState(0);
  const total = sketches.length;
  const ready = total > 0 && loaded >= total;

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
        // decode() forces the browser to rasterize NOW, not on first paint
        img
          .decode()
          .then(finish)
          .catch(() => {
            // fallback: at least wait for network
            if (img.complete) finish();
            else {
              img.onload = finish;
              img.onerror = finish;
            }
          });
      });

    // Run in parallel — browser will cap concurrency per-origin automatically
    Promise.all(sketches.map((s) => preload(s.tileUrl))).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sketches, total]);

  const N = sketches.length;
  const COLS = Math.max(1, Math.ceil(Math.sqrt(N)));
  const ROWS = Math.max(1, Math.ceil(N / COLS));

  const containerRef = useRef<HTMLDivElement>(null);

  const initialVp =
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1440, h: 900 };

  // Center the world on first paint (torus, but visually pleasant starting frame)
  const initialX = -Math.round((PITCH - initialVp.w) / 2);
  const initialY = -Math.round((PITCH - initialVp.h) / 2);

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

  const initialRange = (() => {
    const bleed = 3;
    const worldPitch = PITCH;
    const cx = -initialX / worldPitch;
    const cy = -initialY / worldPitch;
    const cols = Math.ceil(initialVp.w / worldPitch);
    const rows = Math.ceil(initialVp.h / worldPitch);
    return {
      c0: Math.floor(cx) - bleed,
      c1: Math.floor(cx) + cols + bleed,
      r0: Math.floor(cy) - bleed,
      r1: Math.floor(cy) + rows + bleed,
    };
  })();

  const [range, setRange] = useState(initialRange);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  useEffect(() => {
    let raf = 0;
    const bleed = 3;
    const tick = () => {
      const currentScale = scale.get();
      const worldPitch = PITCH * currentScale;
      const cx = -x.get() / worldPitch;
      const cy = -y.get() / worldPitch;
      const cols = Math.ceil(vp.w / worldPitch);
      const rows = Math.ceil(vp.h / worldPitch);
      const c0 = Math.floor(cx) - bleed;
      const c1 = Math.floor(cx) + cols + bleed;
      const r0 = Math.floor(cy) - bleed;
      const r1 = Math.floor(cy) + rows + bleed;
      const current = rangeRef.current;

      if (
        c0 !== current.c0 ||
        c1 !== current.c1 ||
        r0 !== current.r0 ||
        r1 !== current.r1
      ) {
        setRange({ c0, c1, r0, r1 });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vp.w, vp.h, x, y, scale]);

  const cells = useMemo(() => {
    if (N === 0) return [];
    const out: { c: number; r: number; idx: number; key: string }[] = [];

    for (let c = range.c0; c <= range.c1; c++) {
      for (let r = range.r0; r <= range.r1; r++) {
        const idx = mod(mod(r, ROWS) * COLS + mod(c, COLS), N);
        out.push({ c, r, idx, key: `${c},${r}` });
      }
    }

    return out;
  }, [range, COLS, ROWS, N]);

  const applyZoom = useCallback(
    (delta: number, ox: number, oy: number) => {
      const current = scale.get();
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current * (1 + delta)));
      if (next === current) return;
      const ratio = next / current;
      x.set(ox - (ox - x.get()) * ratio);
      y.set(oy - (oy - y.get()) * ratio);
      scale.set(next);
    },
    [x, y, scale],
  );

  const [hintVisible, setHintVisible] = useState(true);
  const dismissHint = useCallback(() => setHintVisible(false), []);

  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    if (introDone) return;

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
  }, [introDone, x, y]);

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
          animate(x, x.get() + dirX * vx * 180, {
            type: "inertia",
            power: 0.7,
            timeConstant: 380,
          });
          animate(y, y.get() + dirY * vy * 180, {
            type: "inertia",
            power: 0.7,
            timeConstant: 380,
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
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, base * distance));
        const ratio = next / scale.get();
        x.set(ox - (ox - x.get()) * ratio);
        y.set(oy - (oy - y.get()) * ratio);
        scale.set(next);
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (openIdx !== null) {
        if (event.key === "Escape") close();
        if (event.key === "ArrowLeft") prev();
        if (event.key === "ArrowRight") next();
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
        animate(x, 0);
        animate(y, 0);
        animate(scale, 1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close, prev, next, x, y, scale, applyZoom, vp.w, vp.h]);

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
  const [grabbing, setGrabbing] = useState(false);

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
        onPointerDown={() => setGrabbing(true)}
        onPointerUp={() => setGrabbing(false)}
        onPointerLeave={() => setGrabbing(false)}
        className={`absolute inset-0 touch-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ WebkitUserSelect: "none" }}
      >
        <motion.div
          className="absolute top-0 left-0 will-change-transform"
          style={{ x, y, scale, transformOrigin: "0 0" }}
        >
          {cells.map(({ c, r, idx, key }, cellIndex) => {
            const sketch = sketches[idx];
            if (!sketch) return null;
            const priority = cellIndex < PRIORITY_CELL_COUNT;

            return (
              <button
                key={key}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIdx(idx);
                }}
                className="absolute block bg-[#ffffff] shadow-[0_2px_18px_rgba(26,26,26,0.06)] hover:shadow-[0_8px_32px_rgba(26,26,26,0.14)] transition-shadow duration-500 group focus:outline-none"
                style={{
                  left: c * PITCH,
                  top: r * PITCH,
                  width: TILE,
                  height: TILE,
                  contain: "layout paint style size",
                }}
                aria-label={`Open plate ${(idx + 1).toString().padStart(3, "0")}`}
                draggable={false}
              >
                <img
                  src={sketch.tileUrl}
                  alt=""
                  width={TILE}
                  height={TILE}
                  loading="eager"
                  fetchPriority={priority ? "high" : "auto"}
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-2 right-2 text-[8px] tracking-[0.3em] uppercase text-[#1a1a1a]/40 font-medium pointer-events-none">
                  {(idx + 1).toString().padStart(3, "0")}
                </span>
              </button>
            );
          })}
        </motion.div>
      </div>

      <header className="pointer-events-none absolute top-0 left-0 right-0 px-6 md:px-10 pt-6 md:pt-8 flex justify-between items-center z-10">
        <h1 className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-medium">
          Sketchbook · Archive 001
        </h1>
        <div className="flex items-center gap-4 md:gap-6 pointer-events-auto">
          <span className="hidden md:inline text-[9px] tracking-[0.4em] uppercase opacity-50">
            {totalLabel} Plates · Loop
          </span>
          <Link
            to="/"
            className="text-[10px] tracking-[0.4em] uppercase font-medium border border-[#1a1a1a]/30 hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors px-3 py-2 md:px-4 md:py-2 bg-white/70 backdrop-blur-sm"
          >
            ← Exit
          </Link>
        </div>
      </header>

      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-6 md:pb-8 flex justify-between items-baseline z-10 transition-opacity duration-[1200ms] ${hintVisible ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-[9px] tracking-[0.5em] uppercase opacity-60">
          Drag · Scroll · Pinch to Zoom
        </span>
        <span className="text-[9px] tracking-[0.4em] uppercase opacity-40">
          0 = Reset · +/− = Zoom
        </span>
      </div>

      {openIdx !== null && sketches[openIdx] && (
        <div
          className="fixed inset-0 z-50 bg-[#1a1a1a]/95 flex items-center justify-center p-4 md:p-12 backdrop-blur-sm"
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

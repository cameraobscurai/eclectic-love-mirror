import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useGesture } from "@use-gesture/react";
import { listSketches, type Sketch } from "@/lib/sketch.functions";

const sketchesQuery = (fn: () => Promise<Sketch[]>) =>
  queryOptions({
    queryKey: ["sketches"],
    queryFn: fn,
    staleTime: 1000 * 60 * 60,
  });

export const Route = createFileRoute("/sketch")({
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

// Tile geometry (world space, unscaled)
const TILE = 300;
const GAP = 24;
const PITCH = TILE + GAP;

// Zoom bounds
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.0;

const mod = (n: number, m: number) => ((n % m) + m) % m;

function SketchPage() {
  const fn = useServerFn(listSketches);
  const { data: rawSketches } = useSuspenseQuery(sketchesQuery(fn));

  // Deterministic shuffle so color/BW don't clump in upload-order pockets
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

  const N = sketches.length;
  const COLS = Math.max(1, Math.ceil(Math.sqrt(N)));
  const ROWS = Math.max(1, Math.ceil(N / COLS));

  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Viewport size
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () =>
      setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Visible cell range — updated only when range actually changes
  const [range, setRange] = useState({ c0: -2, c1: 4, r0: -2, r1: 4 });
  const rangeRef = useRef(range);
  rangeRef.current = range;

  useEffect(() => {
    let raf = 0;
    const bleed = 1;
    const tick = () => {
      const s = scale.get();
      const worldPitch = PITCH * s;
      const cx = -x.get() / worldPitch;
      const cy = -y.get() / worldPitch;
      const cols = Math.ceil(vp.w / worldPitch);
      const rows = Math.ceil(vp.h / worldPitch);
      const c0 = Math.floor(cx) - bleed;
      const c1 = Math.floor(cx) + cols + bleed;
      const r0 = Math.floor(cy) - bleed;
      const r1 = Math.floor(cy) + rows + bleed;
      const r = rangeRef.current;
      if (c0 !== r.c0 || c1 !== r.c1 || r0 !== r.r0 || r1 !== r.r1) {
        setRange({ c0, c1, r0, r1 });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vp.w, vp.h, x, y, scale]);

  // Cell list for current viewport
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

  // Zoom around a viewport point
  const applyZoom = useCallback(
    (delta: number, ox: number, oy: number) => {
      const cur = scale.get();
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cur * (1 + delta)));
      if (next === cur) return;
      const ratio = next / cur;
      x.set(ox - (ox - x.get()) * ratio);
      y.set(oy - (oy - y.get()) * ratio);
      scale.set(next);
    },
    [x, y, scale],
  );

  // Hint state
  const [hintVisible, setHintVisible] = useState(true);
  const dismissHint = useCallback(() => setHintVisible(false), []);

  // Auto-drift intro — 3s gentle pan, cancelled on any interaction
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    if (introDone) return;
    const t = setTimeout(() => {
      const ax = animate(x, -220, { duration: 3.4, ease: [0.22, 1, 0.36, 1] });
      const ay = animate(y, -80, { duration: 3.4, ease: [0.22, 1, 0.36, 1] });
      const cancel = () => {
        ax.stop();
        ay.stop();
        setIntroDone(true);
      };
      window.addEventListener("pointerdown", cancel, { once: true });
      window.addEventListener("wheel", cancel, { once: true, passive: true });
      window.addEventListener("keydown", cancel, { once: true });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hint auto-fade after 7s
  useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), 7000);
    return () => clearTimeout(t);
  }, []);

  // Gestures
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
      onPinch: ({ origin: [ox, oy], offset: [d], memo }) => {
        dismissHint();
        const base = memo ?? scale.get() / d;
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, base * d));
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

  // Lightbox
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

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openIdx !== null) {
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
        return;
      }
      const STEP = 200;
      if (e.key === "ArrowLeft") animate(x, x.get() + STEP, { type: "spring", stiffness: 200, damping: 30 });
      if (e.key === "ArrowRight") animate(x, x.get() - STEP, { type: "spring", stiffness: 200, damping: 30 });
      if (e.key === "ArrowUp") animate(y, y.get() + STEP, { type: "spring", stiffness: 200, damping: 30 });
      if (e.key === "ArrowDown") animate(y, y.get() - STEP, { type: "spring", stiffness: 200, damping: 30 });
      if (e.key === "+" || e.key === "=") applyZoom(0.15, vp.w / 2, vp.h / 2);
      if (e.key === "-" || e.key === "_") applyZoom(-0.15, vp.w / 2, vp.h / 2);
      if (e.key === "0") {
        animate(x, 0);
        animate(y, 0);
        animate(scale, 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close, prev, next, x, y, scale, applyZoom, vp.w, vp.h]);

  // Lock page scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  const total = N.toString().padStart(3, "0");

  // Drag tracking for cursor state
  const [grabbing, setGrabbing] = useState(false);

  return (
    <div className="fixed inset-0 bg-[#d4cdc4] text-[#1a1a1a] font-serif overflow-hidden select-none">
      {/* Canvas surface */}
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
          {cells.map(({ c, r, idx, key }) => {
            const s = sketches[idx];
            if (!s) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIdx(idx);
                }}
                className="absolute block bg-[#ffffff] shadow-[0_2px_18px_rgba(26,26,26,0.06)] hover:shadow-[0_8px_32px_rgba(26,26,26,0.14)] transition-shadow duration-500 group focus:outline-none"
                style={{
                  left: c * PITCH,
                  top: r * PITCH,
                  width: TILE,
                  height: TILE,
                }}
                aria-label={`Open plate ${(idx + 1).toString().padStart(3, "0")}`}
                draggable={false}
              >
                <img
                  src={s.url}
                  alt=""
                  loading="lazy"
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

      {/* Chrome — header */}
      <header className="pointer-events-none absolute top-0 left-0 right-0 px-6 md:px-10 pt-6 md:pt-8 flex justify-between items-baseline z-10">
        <h1 className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-medium">
          Sketchbook · Archive 001
        </h1>
        <span className="text-[9px] tracking-[0.4em] uppercase opacity-50">
          {total} Plates · Loop
        </span>
      </header>

      {/* Chrome — footer hint */}
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

      {/* Lightbox */}
      {openIdx !== null && sketches[openIdx] && (
        <div
          className="fixed inset-0 z-50 bg-[#1a1a1a]/95 flex items-center justify-center p-4 md:p-12 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-[#d4cdc4]/60 hover:text-[#d4cdc4] transition text-[10px] tracking-[0.4em] uppercase"
            aria-label="Previous plate"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-[#d4cdc4]/60 hover:text-[#d4cdc4] transition text-[10px] tracking-[0.4em] uppercase"
            aria-label="Next plate"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="absolute top-4 right-4 md:top-8 md:right-8 text-[#d4cdc4]/60 hover:text-[#d4cdc4] transition text-[10px] tracking-[0.4em] uppercase"
            aria-label="Close"
          >
            Close ×
          </button>
          <div
            className="max-w-[92vw] max-h-[85vh] bg-[#ffffff] p-4 md:p-8 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={sketches[openIdx].url}
              alt={`Sketch plate ${(openIdx + 1).toString().padStart(3, "0")}`}
              className="max-w-full max-h-[75vh] object-contain mix-blend-multiply"
            />
            <div className="mt-4 pt-3 border-t border-[#1a1a1a]/10 flex justify-between text-[9px] tracking-[0.35em] uppercase text-[#1a1a1a]/60 font-serif">
              <span>Plate</span>
              <span>
                {(openIdx + 1).toString().padStart(3, "0")} / {total}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

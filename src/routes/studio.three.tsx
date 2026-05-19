// /studio/three — 3D viewer. Real models only, no invented metadata.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Maximize2, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ModelEntry = {
  id: string;
  name: string;
  src: string;
};

// Real models only. Add entries as .glb files land in public/studio/models/.
const MODELS: ModelEntry[] = [
  {
    id: "directors-chair",
    name: "Director's Chair",
    src: "/studio/models/directors-chair.glb",
  },
  {
    id: "chair-curved-back",
    name: "Curved-Back Chair",
    src: "/studio/models/chair-curved-back.glb",
  },
  {
    id: "chair-armrest",
    name: "Armrest Lounge",
    src: "/studio/models/chair-armrest.glb",
  },
];

export const Route = createFileRoute("/studio/three")({
  head: () => ({
    meta: [
      { title: "3D · Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      // Preload the first model only. Others prefetch on hover/focus.
      {
        rel: "preload",
        as: "fetch",
        href: MODELS[0].src,
        crossOrigin: "anonymous",
        type: "model/gltf-binary",
      },
    ],
  }),
  component: ThreePage,
});

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

// Kick the viewer module off the moment this route's JS evaluates
// (parallel with the GLB preload), not after the component mounts.
const viewerReady: Promise<unknown> =
  typeof window === "undefined"
    ? Promise.resolve()
    : import("@google/model-viewer");

// Track prefetched URLs so we don't fire the same fetch twice.
const prefetched = new Set<string>();
function prefetchModel(src: string) {
  if (typeof window === "undefined" || prefetched.has(src)) return;
  prefetched.add(src);
  // Low-priority warm fetch — browser caches, model-viewer reuses on switch.
  fetch(src, { priority: "low" as RequestPriority, cache: "force-cache" }).catch(
    () => prefetched.delete(src),
  );
}

function ThreePage() {
  const [active, setActive] = useState<ModelEntry>(MODELS[0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    viewerReady.then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // After viewer module loads, idle-prefetch the rest of the library so the
  // next switch is instant.
  useEffect(() => {
    if (!ready) return;
    const idle =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, 600));
    const handle = idle(() => {
      for (const m of MODELS) if (m.id !== active.id) prefetchModel(m.src);
    });
    return () => {
      const cancel =
        (window as any).cancelIdleCallback ??
        ((h: number) => clearTimeout(h));
      cancel(handle);
    };
  }, [ready, active.id]);

  const onChange = useCallback((m: ModelEntry) => {
    setActive(m);
  }, []);

  return (
    <div className="min-h-screen bg-cream text-charcoal page-fade">
      <header className="border-b border-charcoal/10">
        <div className="fluid-canvas pt-10 pb-6 flex items-center justify-between">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-charcoal/50 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Studio
          </Link>
          <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45 tabular-nums">
            3D · {pad(MODELS.length)}
          </p>
        </div>
      </header>

      <section className="fluid-canvas py-8">
        <div className="grid grid-cols-12 gap-x-[var(--archive-grid-gap-x)] gap-y-8">
          {/* INDEX */}
          <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
            <ul className="divide-y divide-charcoal/10 border-y border-charcoal/10">
              {MODELS.map((m, i) => {
                const isActive = m.id === active.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onChange(m)}
                      onMouseEnter={() => prefetchModel(m.src)}
                      onFocus={() => prefetchModel(m.src)}
                      onTouchStart={() => prefetchModel(m.src)}
                      className="group w-full py-3 text-left flex items-baseline gap-3"
                    >
                      <span
                        className={`text-[10px] tabular-nums tracking-[0.22em] shrink-0 ${
                          isActive ? "text-charcoal" : "text-charcoal/35"
                        }`}
                      >
                        {pad(i + 1)}
                      </span>
                      <span
                        className={`flex-1 min-w-0 font-display text-[14px] uppercase tracking-[0.06em] truncate transition-colors ${
                          isActive ? "text-charcoal" : "text-charcoal/65 group-hover:text-charcoal"
                        }`}
                      >
                        {m.name}
                      </span>
                      <span
                        aria-hidden
                        className={`h-px shrink-0 transition-all duration-300 ${
                          isActive ? "bg-charcoal w-6" : "bg-charcoal/20 w-3"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* VIEWER */}
          <div className="col-span-12 lg:col-span-9">
            <Viewer model={active} ready={ready} />
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-charcoal/55">
              <span
                key={active.id}
                className="font-display text-[14px] tracking-[0.06em] text-charcoal normal-case fade-in"
              >
                {active.name}
              </span>
              <span className="text-charcoal/40">Drag · Scroll · Pinch</span>
            </div>
          </div>
        </div>
      </section>

      {/* Local fade + cross-dissolve keyframes — scoped to this route. */}
      <style>{`
        @keyframes mv-fade-in { from { opacity: 0 } to { opacity: 1 } }
        .fade-in { animation: mv-fade-in 380ms ease-out both; }
        .page-fade { animation: mv-fade-in 280ms ease-out both; }
        .viewer-swap { transition: opacity 220ms ease; }
      `}</style>
    </div>
  );
}

function Viewer({ model, ready }: { model: ModelEntry; ready: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mvRef = useRef<HTMLElement | null>(null);
  const [swapping, setSwapping] = useState(false);

  // Fade out on model change, then back in when the new one is loaded.
  useEffect(() => {
    if (!ready) return;
    setSwapping(true);
    const el = ref.current?.querySelector("model-viewer") as HTMLElement | null;
    if (!el) {
      setSwapping(false);
      return;
    }
    mvRef.current = el;
    const onLoad = () => setSwapping(false);
    const onErr = () => setSwapping(false);
    el.addEventListener("load", onLoad, { once: true });
    el.addEventListener("error", onErr, { once: true });
    // Safety: clear after 4s if no event fires
    const t = window.setTimeout(() => setSwapping(false), 4000);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onErr);
      window.clearTimeout(t);
      // Explicit cleanup — drop GPU resources from the previous instance.
      try {
        (el as any).dismissPoster?.();
      } catch {}
    };
  }, [model.id, ready]);

  const fullscreen = () => {
    const el = ref.current?.querySelector("model-viewer") as HTMLElement | null;
    el?.requestFullscreen?.();
  };

  const reset = () => {
    const el = ref.current?.querySelector("model-viewer") as any;
    if (el && typeof el.resetTurntableRotation === "function") {
      el.resetTurntableRotation();
      el.jumpCameraToGoal?.();
    }
  };

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] bg-white border border-charcoal/10 overflow-hidden"
      style={{ viewTransitionName: "studio-viewer" }}
    >
      {ready ? (
        // @ts-expect-error - custom element
        <model-viewer
          key={model.id}
          src={model.src}
          alt={model.name}
          camera-controls
          auto-rotate
          auto-rotate-delay="1500"
          rotation-per-second="18deg"
          interaction-prompt="none"
          interpolation-decay="80"
          shadow-intensity="1.1"
          shadow-softness="0.9"
          exposure="1.05"
          tone-mapping="neutral"
          environment-image="neutral"
          loading="eager"
          reveal="auto"
          disable-tap
          min-camera-orbit="auto auto 0.5m"
          max-camera-orbit="auto auto 4m"
          poster-color="transparent"
          className="viewer-swap"
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
            opacity: swapping ? 0.15 : 1,
            "--progress-bar-color": "#1a1a1a",
            "--progress-bar-height": "1px",
          } as React.CSSProperties}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.3em] text-charcoal/35">
          Loading
        </div>
      )}

      {/* Swap indicator — hairline scan line during model change */}
      {swapping && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-charcoal/40 animate-pulse"
        />
      )}

      <div className="absolute top-3 right-3 flex flex-col gap-px">
        <ControlButton onClick={reset} aria-label="Reset view">
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.25} />
        </ControlButton>
        <ControlButton onClick={fullscreen} aria-label="Fullscreen">
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.25} />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="h-9 w-9 grid place-items-center bg-cream/85 hover:bg-charcoal hover:text-cream border border-charcoal/15 text-charcoal/70 transition-colors backdrop-blur-sm"
    >
      {children}
    </button>
  );
}

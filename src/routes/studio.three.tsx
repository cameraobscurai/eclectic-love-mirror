// /studio/three — 3D viewer. Real models only, no invented metadata.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Maximize2, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/studio/three")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "3D · Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      // Warm the first model + the viewer bundle before React mounts.
      // `as: "fetch"` matches model-viewer's internal fetch and reuses cache.
      {
        rel: "preload",
        as: "fetch",
        href: "/studio/models/directors-chair.glb",
        crossOrigin: "anonymous",
        type: "model/gltf-binary",
      },
    ],
  }),

  component: ThreePage,
});


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
];

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

// Kick the viewer module off the moment this route's JS evaluates
// (parallel with the GLB preload), not after the component mounts.
const viewerReady: Promise<unknown> =
  typeof window === "undefined"
    ? Promise.resolve()
    : import("@google/model-viewer");

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


  return (
    <div className="min-h-screen bg-cream text-charcoal">
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
                      onClick={() => setActive(m)}
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
                        className={`h-px shrink-0 transition-all ${
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
              <span className="font-display text-[14px] tracking-[0.06em] text-charcoal normal-case">
                {active.name}
              </span>
              <span className="text-charcoal/40">Drag · Scroll · Pinch</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Viewer({ model, ready }: { model: ModelEntry; ready: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

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
          shadow-intensity="1.1"
          shadow-softness="0.9"
          exposure="1"
          environment-image="neutral"
          loading="eager"
          reveal="auto"
          poster-color="transparent"
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
            "--progress-bar-color": "#1a1a1a",
            "--progress-bar-height": "1px",
          } as React.CSSProperties}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.3em] text-charcoal/35">
          Loading
        </div>
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

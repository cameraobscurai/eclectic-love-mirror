import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box, Maximize2, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/studio/three")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "3D Gallery · Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ThreePage,
});

type ModelEntry = {
  id: string;
  name: string;
  category: string;
  src: string;
  notes?: string;
};

const MODELS: ModelEntry[] = [
  {
    id: "directors-chair",
    name: "Director's Chair",
    category: "Seating",
    src: "/studio/models/directors-chair.glb",
    notes: "Wooden folding frame, canvas seat + back.",
  },
];

function ThreePage() {
  const [active, setActive] = useState<ModelEntry>(MODELS[0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    import("@google/model-viewer").then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header className="px-6 lg:px-16 pt-12 pb-8 border-b border-charcoal/10">
        <Link
          to="/studio"
          className="text-[10px] uppercase tracking-[0.24em] text-charcoal/55 hover:text-charcoal inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3" /> Studio
        </Link>
        <div className="mt-6 flex items-baseline gap-4">
          <Box className="h-5 w-5 text-charcoal/60" />
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">3D Gallery</h1>
          <span className="text-[9px] uppercase tracking-[0.28em] px-2 py-1 border border-charcoal/15 text-charcoal/45">
            {MODELS.length} {MODELS.length === 1 ? "piece" : "pieces"}
          </span>
        </div>
        <p className="mt-3 max-w-xl text-[11px] uppercase tracking-[0.18em] text-charcoal/55">
          Walk pieces in the round before they ship.
        </p>
      </header>

      <section className="px-6 lg:px-16 py-10 grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <Viewer model={active} ready={ready} />
          <div className="mt-4 flex items-baseline justify-between border-t border-charcoal/10 pt-4">
            <div>
              <div className="font-display text-2xl uppercase tracking-[0.04em]">{active.name}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-charcoal/55">
                {active.category}
              </div>
            </div>
            {active.notes && (
              <div className="hidden md:block max-w-xs text-[11px] uppercase tracking-[0.16em] text-charcoal/55 text-right">
                {active.notes}
              </div>
            )}
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-4">
          <div className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45 mb-3">Library</div>
          <ul className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {MODELS.map((m) => {
              const isActive = m.id === active.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setActive(m)}
                    className={`w-full text-left border p-3 transition-colors ${
                      isActive
                        ? "border-charcoal bg-charcoal text-cream"
                        : "border-charcoal/15 hover:border-charcoal/40"
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.22em]">{m.name}</div>
                    <div
                      className={`mt-1 text-[9px] uppercase tracking-[0.28em] ${
                        isActive ? "text-cream/60" : "text-charcoal/45"
                      }`}
                    >
                      {m.category}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 text-[10px] uppercase tracking-[0.22em] text-charcoal/40 leading-relaxed">
            Drop .glb files into <span className="text-charcoal/70">public/studio/models/</span> and register them in this route.
          </div>
        </aside>
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
    <div ref={ref} className="relative border border-charcoal/10 bg-[#f1f1f1] aspect-[4/3]">
      {ready ? (
        // @ts-expect-error - custom element
        <model-viewer
          key={model.id}
          src={model.src}
          alt={model.name}
          camera-controls
          auto-rotate
          auto-rotate-delay="1500"
          rotation-per-second="20deg"
          interaction-prompt="none"
          shadow-intensity="1"
          exposure="1"
          environment-image="neutral"
          style={{ width: "100%", height: "100%", background: "transparent" }}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.28em] text-charcoal/40">
          Loading viewer…
        </div>
      )}

      <div className="absolute top-3 right-3 flex gap-1.5">
        <button
          type="button"
          onClick={reset}
          aria-label="Reset view"
          className="h-8 w-8 grid place-items-center bg-white/85 hover:bg-white border border-charcoal/10 text-charcoal/70"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={fullscreen}
          aria-label="Fullscreen"
          className="h-8 w-8 grid place-items-center bg-white/85 hover:bg-white border border-charcoal/10 text-charcoal/70"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.28em] text-charcoal/45 bg-white/70 px-2 py-1">
        Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
}

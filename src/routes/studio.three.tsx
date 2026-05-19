// /studio/three — Editorial 3D viewing room.
// Pieces are walked in the round before they ship. Brand register:
// charcoal on cream, hairline rules, indexed pieces, sticky context.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Maximize2, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/studio/three")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Viewing Room · Studio" },
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
  materials?: string;
  dimensions?: string;
  notes?: string;
};

const MODELS: ModelEntry[] = [
  {
    id: "directors-chair",
    name: "Director's Chair",
    category: "Seating",
    src: "/studio/models/directors-chair.glb",
    materials: "Oak frame · canvas",
    dimensions: 'H 34" · W 22" · D 19"',
    notes: "Wooden folding frame with canvas seat and back.",
  },
];

function pad(n: number, width = 3) {
  return String(n).padStart(width, "0");
}

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

  const activeIndex = MODELS.findIndex((m) => m.id === active.id);

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      {/* MASTHEAD */}
      <header className="border-b border-charcoal/10">
        <div className="fluid-canvas pt-16 pb-10">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-charcoal/50 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Studio
          </Link>

          <div className="mt-8 grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 lg:col-span-8">
              <p className="text-[10px] uppercase tracking-[0.32em] text-charcoal/45">
                Chapter · 02 — Viewing Room
              </p>
              <h1 className="mt-4 font-display text-5xl lg:text-7xl uppercase tracking-[0.02em] leading-[0.95]">
                Pieces in the Round
              </h1>
            </div>
            <div className="col-span-12 lg:col-span-4 lg:text-right">
              <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/55 leading-relaxed lg:max-w-xs lg:ml-auto">
                Walk each piece before it ships. Drag to orbit, scroll to draw closer.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* STAGE */}
      <section className="fluid-canvas py-12 lg:py-16">
        <div className="grid grid-cols-12 gap-x-[var(--archive-grid-gap-x)] gap-y-10">
          {/* LEFT — index */}
          <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-8 lg:self-start">
            <div className="flex items-baseline justify-between border-b border-charcoal/15 pb-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">Index</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40 tabular-nums">
                {pad(activeIndex + 1)} / {pad(MODELS.length)}
              </p>
            </div>

            <ul className="mt-4 divide-y divide-charcoal/10">
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
                      <span className="flex-1 min-w-0">
                        <span
                          className={`block font-display text-[15px] uppercase tracking-[0.06em] leading-tight transition-colors ${
                            isActive ? "text-charcoal" : "text-charcoal/70 group-hover:text-charcoal"
                          }`}
                        >
                          {m.name}
                        </span>
                        <span className="mt-1 block text-[9px] uppercase tracking-[0.28em] text-charcoal/40">
                          {m.category}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={`h-px w-4 shrink-0 transition-all ${
                          isActive ? "bg-charcoal w-8" : "bg-charcoal/20"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mt-8 text-[10px] uppercase tracking-[0.22em] text-charcoal/35 leading-[1.7]">
              Drop .glb files into{" "}
              <span className="text-charcoal/55">public/studio/models/</span>
              {" "}and register them in this route.
            </p>
          </aside>

          {/* CENTER — viewer */}
          <div className="col-span-12 lg:col-span-6">
            <Viewer model={active} ready={ready} />
            <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-[0.28em] text-charcoal/40">
              <span>Drag · Scroll · Pinch</span>
              <span className="tabular-nums">Plate {pad(activeIndex + 1)}</span>
            </div>
          </div>

          {/* RIGHT — specimen card */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="border-t border-charcoal pt-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">
                Specimen
              </p>
              <h2 className="mt-3 font-display text-3xl uppercase tracking-[0.03em] leading-[1.05]">
                {active.name}
              </h2>
              <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-charcoal/50">
                {active.category}
              </p>
            </div>

            <dl className="mt-6 divide-y divide-charcoal/10 border-t border-charcoal/10">
              {active.materials && (
                <Row label="Materials" value={active.materials} />
              )}
              {active.dimensions && (
                <Row label="Dimensions" value={active.dimensions} />
              )}
              <Row label="Format" value="glTF · Draco" />
            </dl>

            {active.notes && (
              <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-charcoal/55 leading-[1.8]">
                {active.notes}
              </p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 flex items-baseline justify-between gap-4">
      <dt className="text-[9px] uppercase tracking-[0.28em] text-charcoal/40 shrink-0">
        {label}
      </dt>
      <dd className="text-[11px] uppercase tracking-[0.18em] text-charcoal/75 text-right">
        {value}
      </dd>
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
      className="relative aspect-[4/5] lg:aspect-[4/5] bg-white border border-charcoal/10 overflow-hidden"
    >
      {/* Hairline corner registration marks */}
      <Corner className="top-2 left-2" />
      <Corner className="top-2 right-2 rotate-90" />
      <Corner className="bottom-2 right-2 rotate-180" />
      <Corner className="bottom-2 left-2 -rotate-90" />

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
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-charcoal/30 animate-pulse" />
            Composing plate
          </span>
        </div>
      )}

      {/* Controls — bare hairline buttons, no glassy chrome */}
      <div className="absolute top-4 right-4 flex flex-col gap-px">
        <ControlButton onClick={reset} aria-label="Reset view">
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.25} />
        </ControlButton>
        <ControlButton onClick={fullscreen} aria-label="Fullscreen">
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.25} />
        </ControlButton>
      </div>

      {/* Plate number */}
      <div className="absolute bottom-4 left-4 text-[9px] uppercase tracking-[0.3em] text-charcoal/40">
        <span className="block">Eclectic Hive</span>
        <span className="mt-0.5 block text-charcoal/30">Atelier Plate</span>
      </div>
    </div>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute h-3 w-3 ${className}`}
      style={{
        borderLeft: "1px solid rgba(26,26,26,0.35)",
        borderTop: "1px solid rgba(26,26,26,0.35)",
      }}
    />
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

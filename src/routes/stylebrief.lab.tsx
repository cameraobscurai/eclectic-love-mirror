import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { publicStorageUrl } from "@/lib/storage-image";

const MODELS = [
  { id: "directors-chair", name: "Director's Chair", src: publicStorageUrl("3dfiles", "directorschair.glb") },
  { id: "bleached-oak", name: "Bleached Oak", src: publicStorageUrl("3dfiles", "bleachedoak.glb") },
  { id: "black-chair", name: "Black Chair", src: publicStorageUrl("3dfiles", "blackchair.glb") },
];

const viewerReady: Promise<unknown> =
  typeof window === "undefined" ? Promise.resolve() : import("@google/model-viewer");

export const Route = createFileRoute("/studio/lab")({
  head: () => ({
    meta: [
      { title: "Creative Lab · Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LabPage,
});

function LabPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let m = true;
    viewerReady.then(() => m && setReady(true));
    return () => { m = false; };
  }, []);

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header className="px-6 lg:px-16 pt-10 pb-6 border-b border-charcoal/10 flex items-center justify-between">
        <Link to="/studio" className="text-[10px] uppercase tracking-[0.28em] text-charcoal/50 hover:text-charcoal inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> Studio
        </Link>
        <div className="flex items-baseline gap-3">
          <Sparkles className="h-4 w-4 text-charcoal/60" />
          <h1 className="font-display text-2xl uppercase tracking-[0.04em]">Lab</h1>
        </div>
      </header>

      <section className="px-6 lg:px-16 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45">3D Pieces · Live</p>
          <Link to="/studio/three" className="text-[10px] uppercase tracking-[0.28em] text-charcoal/60 hover:text-charcoal inline-flex items-center gap-1.5">
            Full Viewer <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MODELS.map((m) => (
            <LabTile key={m.id} model={m} ready={ready} />
          ))}
        </div>
      </section>
    </div>
  );
}

function LabTile({ model, ready }: { model: { id: string; name: string; src: string }; ready: boolean }) {
  const [load, setLoad] = useState(false);
  return (
    <Link to="/studio/three" className="group block">
      <div
        className="aspect-square bg-white border border-charcoal/10 overflow-hidden relative"
        onPointerEnter={() => setLoad(true)}
        onFocus={() => setLoad(true)}
      >
        {ready && load ? (
          // @ts-expect-error - custom element
          <model-viewer
            src={model.src}
            alt={model.name}
            auto-rotate
            auto-rotate-delay="0"
            rotation-per-second="22deg"
            interaction-prompt="none"
            disable-zoom
            disable-pan
            disable-tap
            camera-controls={false}
            shadow-intensity="1"
            exposure="1.05"
            environment-image="neutral"
            loading="lazy"
            reveal="auto"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.3em] text-charcoal/30">
            {ready ? "Hover to preview" : "Loading"}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-display text-[14px] tracking-[0.06em] normal-case">{model.name}</span>
        <span className="text-[10px] uppercase tracking-[0.24em] text-charcoal/40 group-hover:text-charcoal transition-colors">Open →</span>
      </div>
    </Link>
  );
}


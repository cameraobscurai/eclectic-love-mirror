import { createFileRoute, useServerFn } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { listSketches, type Sketch } from "@/lib/sketch.functions";

const sketchesQuery = (fn: () => Promise<Sketch[]>) =>
  queryOptions({
    queryKey: ["sketches"],
    queryFn: fn,
    staleTime: 1000 * 60 * 60, // 1 hour
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

function SketchPage() {
  const fn = useServerFn(listSketches);
  const { data: sketches } = useSuspenseQuery(sketchesQuery(fn));
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const prev = useCallback(
    () => setOpenIdx((i) => (i === null ? null : (i - 1 + sketches.length) % sketches.length)),
    [sketches.length],
  );
  const next = useCallback(
    () => setOpenIdx((i) => (i === null ? null : (i + 1) % sketches.length)),
    [sketches.length],
  );

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIdx, close, prev, next]);

  const total = sketches.length.toString().padStart(3, "0");

  return (
    <section className="min-h-screen w-full bg-[#d4cdc4] py-16 md:py-24 px-6 md:px-16 lg:px-24 font-serif text-[#1a1a1a] selection:bg-[#1a1a1a] selection:text-[#ffffff]">
      <header className="w-full max-w-[1600px] mx-auto mb-16 border-b border-[#1a1a1a]/10 pb-8">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-4">
          <h1 className="text-4xl md:text-5xl tracking-tighter leading-none uppercase font-light">
            Sketchbook / Archive 001
          </h1>
          <p className="text-[10px] tracking-[0.3em] uppercase font-medium opacity-70">
            Conceptual Furniture Studies & Form Explorations · {total} Plates
          </p>
        </div>
      </header>

      <div className="w-full max-w-[1600px] mx-auto">
        {sketches.length === 0 ? (
          <p className="text-center text-[10px] tracking-[0.4em] uppercase opacity-40 py-32">
            Archive Empty
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
            {sketches.map((s, i) => {
              const fig = (i + 1).toString().padStart(3, "0");
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setOpenIdx(i)}
                  className="group text-left focus:outline-none"
                  aria-label={`Open plate ${fig}`}
                >
                  <div className="bg-[#ffffff] p-4 md:p-6 shadow-[0_4px_20px_rgba(26,26,26,0.03)] transition-all duration-500 group-hover:shadow-[0_8px_30px_rgba(26,26,26,0.08)] group-focus-visible:shadow-[0_8px_30px_rgba(26,26,26,0.12)]">
                    <div className="aspect-square bg-[#fdfdfd] border border-[#1a1a1a]/5 relative overflow-hidden">
                      <img
                        src={s.url}
                        alt={`Sketch plate ${fig}`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-contain mix-blend-multiply transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
                      />
                      <span className="absolute bottom-3 right-3 text-[9px] tracking-[0.3em] uppercase opacity-40 font-medium">
                        Fig. {fig}
                      </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#1a1a1a]/5 flex items-baseline justify-between">
                      <span className="text-[9px] tracking-[0.35em] uppercase opacity-50">
                        Plate
                      </span>
                      <span className="text-[9px] tracking-[0.3em] uppercase opacity-30">
                        {fig} / {total}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-24 border-t border-[#1a1a1a]/10 pt-10 flex justify-between items-baseline text-[9px] tracking-[0.4em] uppercase opacity-40">
          <span>End of Archive</span>
          <span>001 — {total}</span>
        </div>
      </div>

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
    </section>
  );
}

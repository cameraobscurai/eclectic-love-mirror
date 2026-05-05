import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/image-qa")({
  component: ImageQA,
});

type Item = {
  id: string;
  rms_id: string | null;
  title: string;
  category: string | null;
  images: string[];
};

type Status = "ok" | "missing" | "broken" | "loading";

function ImageQA() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [filter, setFilter] = useState<string>("pillows-throws");
  const [showOnly, setShowOnly] = useState<"all" | "issues">("issues");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("id,rms_id,title,category,images")
        .neq("status", "draft")
        .order("category")
        .order("title")
        .limit(2000);
      setItems((data ?? []) as Item[]);
    })();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[],
    [items],
  );

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  useEffect(() => {
    filtered.forEach((it) => {
      const url = it.images?.[0];
      if (!url) {
        setStatus((s) => ({ ...s, [it.id]: "missing" }));
        return;
      }
      if (status[it.id]) return;
      setStatus((s) => ({ ...s, [it.id]: "loading" }));
      const img = new Image();
      img.onload = () => setStatus((s) => ({ ...s, [it.id]: "ok" }));
      img.onerror = () => setStatus((s) => ({ ...s, [it.id]: "broken" }));
      img.src = url;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { ok: 0, missing: 0, broken: 0, loading: 0 };
    filtered.forEach((it) => {
      const s = status[it.id] ?? "loading";
      c[s]++;
    });
    return c;
  }, [filtered, status]);

  const visible = filtered.filter((it) => {
    if (showOnly === "all") return true;
    const s = status[it.id];
    return s === "missing" || s === "broken";
  });

  return (
    <div className="min-h-screen bg-[hsl(var(--cream))] p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-serif text-4xl text-[hsl(var(--charcoal))]">IMAGE QA</h1>
        <p className="mt-2 text-sm uppercase tracking-widest text-[hsl(var(--charcoal))]/70">
          {filtered.length} ITEMS · OK {counts.ok} · MISSING {counts.missing} · BROKEN {counts.broken} · LOADING {counts.loading}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs uppercase tracking-widest border ${filter === "all" ? "bg-[hsl(var(--charcoal))] text-[hsl(var(--cream))]" : "border-[hsl(var(--charcoal))]/30"}`}
          >
            ALL
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 text-xs uppercase tracking-widest border ${filter === c ? "bg-[hsl(var(--charcoal))] text-[hsl(var(--cream))]" : "border-[hsl(var(--charcoal))]/30"}`}
            >
              {c}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowOnly("issues")}
              className={`px-3 py-1 text-xs uppercase tracking-widest border ${showOnly === "issues" ? "bg-red-700 text-white" : "border-[hsl(var(--charcoal))]/30"}`}
            >
              ISSUES ONLY
            </button>
            <button
              onClick={() => setShowOnly("all")}
              className={`px-3 py-1 text-xs uppercase tracking-widest border ${showOnly === "all" ? "bg-[hsl(var(--charcoal))] text-[hsl(var(--cream))]" : "border-[hsl(var(--charcoal))]/30"}`}
            >
              SHOW ALL
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {visible.map((it) => {
            const s = status[it.id] ?? "loading";
            const ring =
              s === "ok"
                ? "ring-2 ring-emerald-500"
                : s === "missing"
                  ? "ring-2 ring-amber-500"
                  : s === "broken"
                    ? "ring-2 ring-red-600"
                    : "ring-2 ring-neutral-400";
            return (
              <div key={it.id} className={`relative bg-white ${ring}`}>
                <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
                  {it.images?.[0] && s !== "broken" ? (
                    <img src={it.images[0]} alt={it.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs uppercase tracking-widest text-neutral-500">
                      {s === "broken" ? "404" : "NO IMAGE"}
                    </span>
                  )}
                  <span
                    className={`absolute top-1 left-1 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white ${
                      s === "ok"
                        ? "bg-emerald-600"
                        : s === "missing"
                          ? "bg-amber-600"
                          : s === "broken"
                            ? "bg-red-700"
                            : "bg-neutral-500"
                    }`}
                  >
                    {s}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--charcoal))] line-clamp-2">
                    {it.title}
                  </p>
                  <p className="text-[10px] text-neutral-500">RMS {it.rms_id}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

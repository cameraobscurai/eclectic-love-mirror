// /admin/render — AI Photo Studio. Pick an inventory item, pick a preset, generate
// editorial product photography via Gemini Pro Image with the product photo as
// a visual reference. Stream partials with blur→sharp, save to private bucket,
// optionally publish to the product's images[].

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";
import { Loader2, Search, Wand2, Save, Send, Trash2, Check } from "lucide-react";

import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { supabase } from "@/integrations/supabase/client";
import {
  listRenderPickables,
  saveRender,
  listRenders,
  discardRender,
  publishRender,
  type RenderPickable,
  type RenderHistoryItem,
} from "@/lib/studio-render.functions";

const search = z.object({ rms: z.string().optional() });

export const Route = createFileRoute("/admin/render")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Photo Studio · Admin · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RenderPage,
});

type Preset = {
  id: string;
  label: string;
  hint: string;
};

const PRESETS: Preset[] = [
  { id: "white_room", label: "White room", hint: "Studio room, soft daylight, no props" },
  { id: "editorial_scene", label: "Editorial scene", hint: "Plaster wall, oak floor, golden light" },
  { id: "tablescape", label: "Tablescape", hint: "Linen, ceramics, tapers — table hero" },
  { id: "cutout", label: "Cutout", hint: "Pure white background, contact shadow" },
];

const MODELS = [
  { id: "google/gemini-3-pro-image", label: "Gemini 3 Pro Image", note: "highest fidelity · ~$0.10" },
  { id: "google/gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image", note: "fast · ~$0.04" },
  { id: "google/gemini-2.5-flash-image", label: "Nano Banana", note: "fastest · ~$0.02" },
];

function RenderPage() {
  const { rms } = Route.useSearch();
  const [pickables, setPickables] = useState<RenderPickable[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RenderPickable | null>(null);
  const [preset, setPreset] = useState<string>(PRESETS[0].id);
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [extra, setExtra] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [finalB64, setFinalB64] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<RenderHistoryItem[]>([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // load inventory
  useEffect(() => {
    listRenderPickables({ data: undefined } as never)
      .then((rows: RenderPickable[]) => {
        setPickables(rows);
        if (rms) {
          const hit = rows.find((r) => r.rmsId === rms);
          if (hit) setSelected(hit);
        }
      })
      .catch((e: Error) => setErr(e.message));
  }, [rms]);

  const refreshHistory = useMemo(
    () => async (rmsId: string | null) => {
      const rows = await listRenders({ data: { rmsId } });
      setHistory(rows);
    },
    [],
  );

  useEffect(() => {
    refreshHistory(selected?.rmsId ?? null).catch(() => {});
  }, [selected, refreshHistory]);

  const filtered = useMemo(() => {
    if (!pickables) return [];
    const q = query.trim().toLowerCase();
    if (!q) return pickables.slice(0, 200);
    return pickables.filter((p) => p.title.toLowerCase().includes(q) || p.rmsId.toLowerCase().includes(q)).slice(0, 200);
  }, [pickables, query]);

  async function generate() {
    if (!selected?.primaryImage) {
      setErr("Select a product with a reference photo first.");
      return;
    }
    setErr(null);
    setBusy(true);
    setFrame(null);
    setIsFinal(false);
    setFinalB64(null);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/admin-render", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          refImageUrl: selected.primaryImage,
          productTitle: selected.title,
          rmsId: selected.rmsId,
          preset,
          model,
          extraPrompt: extra,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`${res.status} ${await res.text().catch(() => "")}`.trim());
      }

      const parser = createParser({
        onEvent(ev) {
          if (ev.event !== "image_generation.partial_image" && ev.event !== "image_generation.completed") return;
          try {
            const payload = JSON.parse(ev.data) as { b64_json?: string };
            if (!payload.b64_json) return;
            const final = ev.event === "image_generation.completed";
            flushSync(() => {
              setFrame(`data:image/png;base64,${payload.b64_json}`);
              if (final) {
                setIsFinal(true);
                setFinalB64(payload.b64_json ?? null);
              }
            });
          } catch { /* ignore */ }
        },
      });

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(value);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!finalB64 || !selected) return;
    setSavedNotice(null);
    try {
      await saveRender({
        data: {
          rmsId: selected.rmsId,
          productTitle: selected.title,
          preset,
          model,
          prompt: extra,
          b64: finalB64,
        },
      });
      setSavedNotice("Saved to library");
      setTimeout(() => setSavedNotice(null), 2000);
      refreshHistory(selected.rmsId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function onDiscard(id: string) {
    await discardRender({ data: { id } });
    refreshHistory(selected?.rmsId ?? null);
  }

  async function onPublish(id: string) {
    setSavedNotice(null);
    try {
      await publishRender({ data: { id } });
      setSavedNotice("Attached to product");
      setTimeout(() => setSavedNotice(null), 2000);
      refreshHistory(selected?.rmsId ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <header className="px-6 lg:px-12 pt-10 pb-6 border-b border-charcoal/10 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">Admin · Tool</p>
          <h1 className="mt-1 font-display text-3xl uppercase tracking-[0.04em]">Photo Studio</h1>
        </div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45">AI render · {model.split("/")[1]}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-charcoal/10 border-b border-charcoal/10">
        {/* LEFT — picker */}
        <aside className="lg:col-span-3 bg-cream p-5 lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-3">Inventory</p>
          <label className="relative block mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or RMS id"
              className="w-full bg-transparent border border-charcoal/15 pl-7 pr-2 py-2 text-[12px] font-sans normal-case placeholder:text-charcoal/30 focus:outline-none focus:border-charcoal/60"
            />
          </label>
          <ul className="space-y-px">
            {pickables === null && <li className="text-[11px] uppercase tracking-[0.22em] text-charcoal/40">Loading…</li>}
            {filtered.map((p) => {
              const active = selected?.rmsId === p.rmsId;
              return (
                <li key={p.rmsId}>
                  <button
                    onClick={() => setSelected(p)}
                    className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${active ? "bg-charcoal text-cream" : "hover:bg-charcoal/[0.04]"}`}
                  >
                    {p.primaryImage ? (
                      <img src={p.primaryImage} alt="" className="w-10 h-10 object-cover bg-charcoal/5 shrink-0" />
                    ) : (
                      <span className="w-10 h-10 bg-charcoal/5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[12px] font-sans normal-case ${active ? "text-cream" : "text-charcoal"}`}>{p.title}</span>
                      <span className={`block text-[9px] uppercase tracking-[0.2em] ${active ? "text-cream/60" : "text-charcoal/45"}`}>{p.category ?? "—"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* CENTER — canvas */}
        <section className="lg:col-span-6 bg-cream p-6 min-w-0">
          <div className="relative aspect-[4/5] w-full bg-charcoal/[0.03] border border-charcoal/10 overflow-hidden grid place-items-center">
            {!frame && !busy && selected && (
              <div className="text-center px-8">
                <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">Reference</p>
                {selected.primaryImage ? (
                  <img src={selected.primaryImage} alt="" className="mt-3 max-h-[60vh] mx-auto object-contain" />
                ) : (
                  <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-charcoal/40">No reference photo</p>
                )}
                <p className="mt-4 font-display text-lg normal-case">{selected.title}</p>
              </div>
            )}
            {!frame && !busy && !selected && (
              <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/40">Select an item to begin</p>
            )}
            {busy && !frame && (
              <div className="text-center">
                <Loader2 className="h-5 w-5 animate-spin text-charcoal/60 mx-auto" />
                <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-charcoal/50">Rendering</p>
              </div>
            )}
            {frame && (
              <img
                src={frame}
                alt="render preview"
                className={`w-full h-full object-contain transition-[filter] duration-500 ${isFinal ? "blur-0" : "blur-2xl"}`}
              />
            )}
            {frame && !isFinal && (
              <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.28em] text-cream bg-charcoal/70 px-2 py-1">
                Resolving
              </span>
            )}
          </div>

          {/* Action bar */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={generate}
              disabled={!selected?.primaryImage || busy}
              className="px-5 py-2.5 bg-charcoal text-cream text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 hover:bg-charcoal/85 transition-colors inline-flex items-center gap-2"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {busy ? "Rendering" : "Generate"}
            </button>
            <button
              onClick={onSave}
              disabled={!finalB64}
              className="px-4 py-2.5 border border-charcoal/30 text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 hover:border-charcoal transition-colors inline-flex items-center gap-2"
            >
              <Save className="h-3.5 w-3.5" /> Save to library
            </button>
            {savedNotice && (
              <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/70 inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> {savedNotice}
              </span>
            )}
            {err && <span className="text-[11px] uppercase tracking-[0.18em] text-red-700/80">{err}</span>}
          </div>
        </section>

        {/* RIGHT — controls + history */}
        <aside className="lg:col-span-3 bg-cream p-5 lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-3">Preset</p>
          <ul className="space-y-px mb-5">
            {PRESETS.map((p) => {
              const active = preset === p.id;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setPreset(p.id)}
                    className={`w-full text-left p-3 border transition-colors ${active ? "border-charcoal bg-charcoal text-cream" : "border-charcoal/15 hover:border-charcoal/40"}`}
                  >
                    <span className={`block text-[11px] uppercase tracking-[0.22em] ${active ? "text-cream" : "text-charcoal"}`}>{p.label}</span>
                    <span className={`block text-[10px] mt-1 normal-case font-sans ${active ? "text-cream/70" : "text-charcoal/55"}`}>{p.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-2">Model</p>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-transparent border border-charcoal/15 p-2 text-[11px] uppercase tracking-[0.18em] mb-5 focus:outline-none focus:border-charcoal/60"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
            ))}
          </select>

          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-2">Extra direction</p>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={4}
            placeholder="optional: e.g. 'late winter light, viewed slightly from below'"
            className="w-full bg-transparent border border-charcoal/15 p-2 text-[12px] font-sans normal-case placeholder:text-charcoal/30 focus:outline-none focus:border-charcoal/60 resize-none mb-6"
          />

          <div className="border-t border-charcoal/10 pt-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-3">
              History {selected ? `· ${selected.rmsId}` : ""}
            </p>
            <ul className="space-y-2">
              {history.length === 0 && (
                <li className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40">None yet</li>
              )}
              {history.map((h) => (
                <li key={h.id} className="border border-charcoal/10 p-2">
                  {h.signedUrl && (
                    <img src={h.signedUrl} alt="" className="w-full aspect-[4/5] object-cover bg-charcoal/5 mb-2" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-[0.22em] text-charcoal/60">
                      {h.preset} · {h.status}
                    </span>
                    <div className="flex items-center gap-1">
                      {h.status !== "published" && h.rmsId && (
                        <button
                          onClick={() => onPublish(h.id)}
                          title="Attach to product"
                          className="p-1 text-charcoal/60 hover:text-charcoal"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => onDiscard(h.id)}
                        title="Discard"
                        className="p-1 text-charcoal/60 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

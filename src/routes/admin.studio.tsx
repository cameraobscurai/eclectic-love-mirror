// /admin/studio — Internal style builder anchored to one inquiry.
// Not in the admin nav yet; reach it via /admin/insights row "Studio →" link
// or by URL: /admin/studio?inquiry=<uuid>.

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, Save, Send, AlertCircle, Copy, Check } from "lucide-react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { useStyleBoard } from "@/hooks/use-style-board";
import { InspoDropZone } from "@/components/studio/InspoDropZone";
import { StyleBoardCanvas } from "@/components/studio/StyleBoardCanvas";
import { PaletteTab } from "@/components/studio/PaletteTab";
import { TonesTab } from "@/components/studio/TonesTab";
import { InsightsTab } from "@/components/studio/InsightsTab";
import { CatalogPickerTab } from "@/components/studio/CatalogPickerTab";
import { listStudioBoards, type StudioBoardSummary } from "@/server/studio.functions";

const search = z.object({ inquiry: z.string().uuid().optional() });

export const Route = createFileRoute("/admin/studio")({
  validateSearch: (s) => search.parse(s),
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Studio · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const { inquiry } = Route.useSearch();
  return (
    <AdminShell>
      {inquiry ? <StudioWorkspace inquiryId={inquiry} /> : <NoInquiry />}
    </AdminShell>
  );
}

function NoInquiry() {
  return (
    <div className="min-h-[calc(100vh-3rem)] grid place-items-center bg-cream text-charcoal p-12 text-center">
      <div className="max-w-md">
        <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">Studio · Internal</p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-[0.04em]">No inquiry selected</h1>
        <p className="mt-4 text-[12px] uppercase tracking-[0.18em] text-charcoal/60 leading-relaxed">
          Open the inbox and click "Studio →" on any inquiry to begin a style board.
        </p>
        <Link
          to="/admin/insights"
          className="mt-6 inline-block text-[11px] uppercase tracking-[0.22em] text-charcoal underline underline-offset-4"
        >
          Open inbox
        </Link>
      </div>
    </div>
  );
}

type Tab = "palette" | "tones" | "insights" | "catalog";

function StudioWorkspace({ inquiryId }: { inquiryId: string }) {
  const { state, catalog, addInspoFiles, removeInspo, pin, unpin, setNotes, analyze, save } = useStyleBoard(inquiryId);
  const [tab, setTab] = useState<Tab>("palette");

  if (!state.ready) {
    return (
      <div className="min-h-[calc(100vh-3rem)] grid place-items-center bg-cream text-charcoal/55 text-[11px] uppercase tracking-[0.22em]">
        Loading workspace…
      </div>
    );
  }

  const inq = state.inquiry!;
  const totalImages = state.inspo.length + state.pinned.length;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-charcoal/10 border-b border-charcoal/10">
        {/* LEFT — Inquiry context */}
        <aside className="lg:col-span-3 bg-cream p-6 lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">Inquiry</p>
          <h1 className="mt-2 font-display text-2xl leading-tight">{inq.name}</h1>
          <a href={`mailto:${inq.email}`} className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-charcoal/60 underline-offset-4 hover:underline truncate">
            {inq.email}
          </a>
          {inq.subject && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-charcoal/55">{inq.subject}</p>
          )}
          <div className="mt-5 pt-5 border-t border-charcoal/10">
            <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 mb-2">Message</p>
            <p className="text-[13px] leading-relaxed text-charcoal/80 whitespace-pre-wrap font-sans normal-case">
              {inq.message}
            </p>
          </div>
          <div className="mt-6 pt-5 border-t border-charcoal/10">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">Pinned</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 tabular-nums">{state.pinned.length}</p>
            </div>
            <ul className="mt-2 space-y-1.5">
              {state.pinned.length === 0 && (
                <li className="text-[11px] uppercase tracking-[0.18em] text-charcoal/40">No pieces yet</li>
              )}
              {state.pinned.map((rms) => {
                const p = catalog.get(rms);
                return (
                  <li key={rms} className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-charcoal/75">
                    {p?.primaryImage?.url ? (
                      <img src={p.primaryImage.url} alt="" className="w-7 h-7 object-cover bg-charcoal/5" />
                    ) : (
                      <span className="w-7 h-7 bg-charcoal/5" />
                    )}
                    <span className="truncate flex-1 font-sans normal-case text-[12px]">{p?.title ?? rms}</span>
                    <button onClick={() => unpin(rms)} className="text-charcoal/40 hover:text-charcoal text-[10px]">×</button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* CENTER — board */}
        <section className="lg:col-span-6 bg-cream p-6 min-w-0">
          <header className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45">Style board</p>
              <h2 className="mt-1 font-display text-xl uppercase tracking-[0.04em]">Inspiration + pieces</h2>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={state.status} dirty={state.dirty} />
            </div>
          </header>

          <div className="space-y-4">
            <InspoDropZone onFiles={addInspoFiles} count={state.inspo.length} />
            <StyleBoardCanvas
              inspo={state.inspo}
              pinned={state.pinned}
              catalog={catalog}
              onRemoveInspo={removeInspo}
              onUnpin={unpin}
            />
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={analyze}
              disabled={state.analyzing || totalImages === 0}
              className="px-5 py-2.5 bg-charcoal text-cream text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 hover:bg-charcoal/85 transition-colors inline-flex items-center gap-2"
            >
              {state.analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {state.analyzing ? "Analyzing" : "Analyze palette"}
            </button>
            <button
              type="button"
              onClick={() => save()}
              disabled={state.saving || !state.dirty}
              className="px-4 py-2.5 border border-charcoal/30 text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 hover:border-charcoal transition-colors inline-flex items-center gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              {state.saving ? "Saving…" : "Save"}
            </button>
            {state.status !== "ready" && (
              <button
                type="button"
                onClick={() => save("ready")}
                disabled={state.saving}
                className="px-4 py-2.5 border border-charcoal/30 text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 hover:border-charcoal transition-colors inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark ready
              </button>
            )}
            {state.error && (
              <span className="text-[11px] uppercase tracking-[0.18em] text-red-700/80 inline-flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {state.error}
              </span>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-charcoal/10">
            <label className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 block mb-2">
              Curator notes
            </label>
            <textarea
              value={state.curatorNotes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="What to send back to the client…"
              className="w-full bg-transparent border border-charcoal/15 p-3 text-[13px] leading-relaxed font-sans normal-case focus:outline-none focus:border-charcoal/50 resize-none"
            />
          </div>
        </section>

        {/* RIGHT — analysis tabs */}
        <aside className="lg:col-span-3 bg-cream lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto flex flex-col">
          <div className="flex border-b border-charcoal/10">
            {(["palette", "tones", "insights", "catalog"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                  tab === t ? "text-charcoal border-b border-charcoal" : "text-charcoal/50 hover:text-charcoal/80"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {tab === "palette" && (
              <PaletteTab result={{ palette: state.palette, tones: state.tones ?? defaultTones(), insights: state.insights, perImage: state.perImage }} />
            )}
            {tab === "tones" && <TonesTab tones={state.tones} imageCount={totalImages} />}
            {tab === "insights" && <InsightsTab insights={state.insights} />}
            {tab === "catalog" && (
              <CatalogPickerTab catalog={catalog} pinned={state.pinned} onPin={pin} onUnpin={unpin} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status, dirty }: { status: string; dirty: boolean }) {
  const label = dirty ? `${status} · unsaved` : status;
  return (
    <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/55 border border-charcoal/15 px-2 py-1">
      {label}
    </span>
  );
}

function defaultTones() {
  return { warm: 0, cool: 0, neutral: 0, light: 0, dark: 0, saturated: 0, muted: 0 };
}

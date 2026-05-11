// /admin/insights — the operator dashboard.
//
// Lives next to /admin (which is the inventory ops dashboard). This page is
// the conversion + demand dashboard. Two distinct mental models, one panel
// each, kept on separate routes so each one stays scannable.
//
// Reads via getInsights() server fn; writes via updateInquiryOutcome().
// Both are admin-gated.

import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  getInsights,
  updateInquiryOutcome,
  type InsightsPayload,
  type InsightsInquiry,
  type InquiryStatus,
} from "@/server/insights.functions";
import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin/insights")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Insights · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InsightsPage,
});

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "NEW",
  quoted: "QUOTED",
  booked: "BOOKED",
  lost: "LOST",
  ghosted: "GHOSTED",
};

const STATUS_DOT: Record<InquiryStatus, string> = {
  new: "var(--sand)",
  quoted: "color-mix(in oklab, var(--sand) 60%, var(--charcoal))",
  booked: "var(--charcoal)",
  lost: "color-mix(in oklab, var(--charcoal) 30%, transparent)",
  ghosted: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
};

function InsightsPage() {
  const fetchInsights = useServerFn(getInsights);
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await fetchInsights();
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load insights");
    }
  }, [fetchInsights]);

  useEffect(() => {
    let alive = true;
    fetchInsights()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "Failed to load insights"));
    return () => {
      alive = false;
    };
  }, [fetchInsights]);

  if (err) {
    return (
      <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal grid place-items-center px-6">
        <p className="text-sm uppercase tracking-[0.2em] text-charcoal/60">{err}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal grid place-items-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/50">
          Loading insights…
        </p>
      </div>
    );
  }

  const { kpis, inquiries, top_items, dead_stock, category_demand } = data;
  const wowDelta = kpis.inquiries_this_week - kpis.inquiries_last_week;
  const wowPct =
    kpis.inquiries_last_week > 0
      ? Math.round((wowDelta / kpis.inquiries_last_week) * 100)
      : null;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <div className="px-6 lg:px-12 pt-10 pb-24 max-w-[1500px] mx-auto">
        <header
          className="border-b pb-8 mb-10"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
            ADMIN · INSIGHTS
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] uppercase tracking-[0.02em]">
            Demand
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-charcoal/55">
            Inquiries · outcomes · what the market is asking for
          </p>
        </header>

        {/* KPI strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-charcoal/10 border border-charcoal/10 mb-12">
          <Kpi
            label="This week"
            value={kpis.inquiries_this_week}
            hint={
              wowPct !== null
                ? `${wowDelta >= 0 ? "+" : ""}${wowPct}% vs last week`
                : `vs ${kpis.inquiries_last_week} last week`
            }
          />
          <Kpi
            label="Open pipeline"
            value={kpis.open_count}
            hint={kpis.pipeline_value ? `$${kpis.pipeline_value.toLocaleString()} quoted` : "no quotes yet"}
          />
          <Kpi
            label="Booked"
            value={kpis.booked_count}
            hint={kpis.booked_value_total ? `$${kpis.booked_value_total.toLocaleString()} closed` : "all-time"}
          />
          <Kpi
            label="Last 30 days"
            value={kpis.inquiries_this_month}
            hint={`vs ${kpis.inquiries_last_month} prior 30`}
          />
        </section>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT — inquiry inbox */}
          <section className="lg:col-span-7 space-y-10">
            <Panel
              eyebrow="Inquiries · last 30 days"
              title="Volume"
            >
              <Sparkline data={kpis.daily.map((d) => d.count)} />
            </Panel>

            <Panel
              eyebrow={`Inbox · ${inquiries.length} most recent`}
              title="Conversations"
            >
              {inquiries.length === 0 ? (
                <p className="text-sm text-charcoal/55">No inquiries yet.</p>
              ) : (
                <div className="border-t" style={{ borderColor: "var(--archive-rule)" }}>
                  {inquiries.map((r) => (
                    <InquiryRow key={r.id} row={r} onSaved={refresh} />
                  ))}
                </div>
              )}
            </Panel>
          </section>

          {/* RIGHT — demand */}
          <section className="lg:col-span-5 space-y-10">
            <Panel
              eyebrow="Demand · category intensity"
              title="What's being asked for"
              right={
                <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
                  mentions / 100 SKUs
                </span>
              }
            >
              <ul className="space-y-2.5">
                {category_demand.map((c) => {
                  const max = category_demand[0]?.intensity || 1;
                  return (
                    <li key={c.category} className="flex items-center gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-charcoal/70 w-32 shrink-0 truncate">
                        {c.category}
                      </span>
                      <span className="flex-1 h-[2px] bg-charcoal/10 relative">
                        <span
                          className="absolute inset-y-0 left-0"
                          style={{
                            width: `${Math.min(100, (c.intensity / max) * 100)}%`,
                            background: "var(--charcoal)",
                            opacity: 0.75,
                          }}
                        />
                      </span>
                      <span className="text-[10px] tabular-nums text-charcoal/55 w-20 text-right">
                        {c.inquiry_mentions} / {c.inventory_count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel eyebrow="Demand · most-requested pieces" title="Top items">
              {top_items.length === 0 ? (
                <p className="text-sm text-charcoal/55">
                  No item names found in inquiries yet. As inquiries arrive that mention
                  catalog pieces by name, they'll surface here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {top_items.map((it) => (
                    <ItemRow key={it.id} it={it} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              eyebrow="Inventory · attention"
              title="Never mentioned"
              right={
                <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
                  consider promoting
                </span>
              }
            >
              {dead_stock.length === 0 ? (
                <p className="text-sm text-charcoal/55">Every public piece has been mentioned. 👏</p>
              ) : (
                <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {dead_stock.map((it) => (
                    <ItemRow key={it.id} it={it} hideCount />
                  ))}
                </ul>
              )}
            </Panel>
          </section>
        </div>

        <footer
          className="mt-16 pt-8 border-t text-[10px] uppercase tracking-[0.22em] text-charcoal/40"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          Internal · GA4 page-views and source attribution available in Google Analytics
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inquiry row — collapsed by default, expands to show the full message and
// outcome editor (status / quote / notes).
// ---------------------------------------------------------------------------

function InquiryRow({ row, onSaved }: { row: InsightsInquiry; onSaved: () => void }) {
  const updateOutcome = useServerFn(updateInquiryOutcome);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<InquiryStatus>(row.status);
  const [quote, setQuote] = useState<string>(
    row.quote_value !== null ? String(row.quote_value) : "",
  );
  const [notes, setNotes] = useState<string>(row.outcome_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    status !== row.status ||
    (quote === "" ? row.quote_value !== null : Number(quote) !== row.quote_value) ||
    (notes || "") !== (row.outcome_notes ?? "");

  async function save() {
    setSaving(true);
    try {
      const quoteNum = quote.trim() === "" ? null : Number(quote);
      await updateOutcome({
        data: {
          id: row.id,
          status,
          quote_value: quoteNum !== null && Number.isFinite(quoteNum) ? quoteNum : null,
          outcome_notes: notes.trim() === "" ? null : notes,
        },
      });
      setSavedAt(Date.now());
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group border-b py-4" style={{ borderColor: "var(--archive-rule)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-baseline justify-between gap-4"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight truncate">{row.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-charcoal/50 truncate">
            {row.email}
            {row.subject ? <> · {row.subject}</> : null}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusPill status={row.status} />
          {row.quote_value !== null && (
            <span className="text-[11px] tabular-nums text-charcoal/65 uppercase tracking-[0.14em]">
              ${row.quote_value.toLocaleString()}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40 tabular-nums">
            {formatDate(row.created_at)}
          </span>
          <a
            href={`/admin/studio?inquiry=${row.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] uppercase tracking-[0.2em] text-charcoal/55 hover:text-charcoal underline-offset-4 hover:underline"
          >
            Studio →
          </a>
        </div>
      </button>

      {open && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 mb-2">
              Message
            </p>
            <pre className="font-sans text-sm leading-relaxed text-charcoal/80 whitespace-pre-wrap">
              {row.message}
            </pre>
            {row.phone && (
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-charcoal/55">
                Phone · <a className="underline" href={`tel:${row.phone}`}>{row.phone}</a>
              </p>
            )}
            {row.mentioned_items.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 mb-2">
                  Mentioned pieces ({row.mentioned_items.length})
                </p>
                <ul className="flex flex-wrap gap-2">
                  {row.mentioned_items.map((m) => (
                    <li
                      key={m.id}
                      className="text-[11px] uppercase tracking-[0.14em] text-charcoal/75 border border-charcoal/15 px-2 py-1"
                    >
                      {m.title}
                      <span className="ml-2 text-charcoal/40">{m.category}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="md:col-span-5 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
                Status
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABEL) as InquiryStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`text-[11px] uppercase tracking-[0.16em] px-3 py-1.5 border transition-colors ${
                      status === s
                        ? "bg-charcoal text-cream border-charcoal"
                        : "border-charcoal/20 text-charcoal/65 hover:border-charcoal/50"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
                Quote value (USD)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={100}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="—"
                className="mt-2 w-full bg-transparent border-b border-charcoal/25 py-2 text-sm tabular-nums focus:outline-none focus:border-charcoal"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
                Internal notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Why booked / lost / ghosted…"
                className="mt-2 w-full bg-transparent border border-charcoal/15 p-2 text-sm leading-relaxed focus:outline-none focus:border-charcoal/50"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
                {savedAt
                  ? "Saved"
                  : row.outcome_updated_at
                    ? `Last update ${formatDate(row.outcome_updated_at)}`
                    : ""}
              </span>
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={save}
                className={`text-[11px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors ${
                  dirty && !saving
                    ? "bg-charcoal text-cream border-charcoal hover:bg-charcoal/85"
                    : "border-charcoal/15 text-charcoal/35 cursor-not-allowed"
                }`}
              >
                {saving ? "Saving…" : "Save outcome"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: InquiryStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-charcoal/70">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: STATUS_DOT[status] }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ItemRow({ it, hideCount }: { it: { id: string; title: string; category: string; mention_count: number; image_url: string | null }; hideCount?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-12 h-12 bg-charcoal/5 shrink-0 overflow-hidden">
        {it.image_url ? (
          <img src={it.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight truncate">{it.title}</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-charcoal/45 mt-0.5 truncate">
          {it.category}
        </p>
      </div>
      {!hideCount && (
        <span className="text-[11px] tabular-nums text-charcoal/65 uppercase tracking-[0.14em]">
          {it.mention_count}×
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Tiny shared primitives. Mirrors the visual language of /admin so the two
// pages feel like one editor.
// ---------------------------------------------------------------------------

function Kpi({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-cream p-6">
      <p className="text-[10px] uppercase tracking-[0.26em] text-charcoal/45">{label}</p>
      <p className="mt-3 font-display text-[2rem] leading-none tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-charcoal/45">{hint}</p>
      )}
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article>
      <header className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-charcoal/45">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.04em]">{title}</h2>
        </div>
        {right}
      </header>
      <div className="border-t pt-6" style={{ borderColor: "var(--archive-rule)" }}>
        {children}
      </div>
    </article>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 600;
  const h = 120;
  const pad = 4;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1]?.[0] ?? 0} ${h - pad} L ${pts[0]?.[0] ?? 0} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none" aria-hidden="true">
      <path d={areaPath} fill="color-mix(in oklab, var(--sand) 35%, transparent)" />
      <path d={linePath} fill="none" stroke="var(--charcoal)" strokeWidth={1.2} />
      {pts.map(([x, y], i) =>
        data[i] > 0 ? <circle key={i} cx={x} cy={y} r={1.8} fill="var(--charcoal)" /> : null,
      )}
    </svg>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

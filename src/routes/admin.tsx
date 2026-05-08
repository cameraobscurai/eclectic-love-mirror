import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";
import {
  getInquirySummary,
  type InquirySummary,
} from "@/server/admin.functions";

// ---------------------------------------------------------------------------
// /admin — Editorial admin dashboard
//
// Test build, intentionally NOT password-protected (per owner). When auth is
// added, gate this route via `beforeLoad` + `has_role('admin')`.
//
// Three columns of insight:
//   1. Inventory snapshot from the baked Phase 3 catalog (no DB round-trip).
//   2. Inquiries summary + recent table from Supabase (admin-bypass server fn).
//   3. Category mix + image-coverage health.
// ---------------------------------------------------------------------------

import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Admin · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

interface InventoryStats {
  total: number;
  publicReady: number;
  excluded: number;
  withImages: number;
  withDimensions: number;
  customOrder: number;
  manualReview: number;
  imageCoverage: number; // 0..1
  dimensionsCoverage: number; // 0..1
  topCategories: { display: string; count: number }[];
  imageBuckets: { label: string; count: number }[];
}

function buildInventoryStats(products: CollectionProduct[]): InventoryStats {
  const total = products.length;
  let publicReady = 0;
  let withImages = 0;
  let withDimensions = 0;
  let customOrder = 0;
  let manualReview = 0;
  const byCat = new Map<string, number>();
  const buckets = { "0": 0, "1": 0, "2-3": 0, "4-6": 0, "7+": 0 };

  for (const p of products) {
    if (p.publicReady) publicReady++;
    if (p.imageCount > 0) withImages++;
    if (p.dimensions) withDimensions++;
    if (p.isCustomOrder) customOrder++;
    if (p.needsManualReview) manualReview++;
    byCat.set(p.displayCategory, (byCat.get(p.displayCategory) ?? 0) + 1);
    if (p.imageCount === 0) buckets["0"]++;
    else if (p.imageCount === 1) buckets["1"]++;
    else if (p.imageCount <= 3) buckets["2-3"]++;
    else if (p.imageCount <= 6) buckets["4-6"]++;
    else buckets["7+"]++;
  }

  const topCategories = Array.from(byCat.entries())
    .map(([display, count]) => ({ display, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total,
    publicReady,
    excluded: total - publicReady,
    withImages,
    withDimensions,
    customOrder,
    manualReview,
    imageCoverage: total ? withImages / total : 0,
    dimensionsCoverage: total ? withDimensions / total : 0,
    topCategories,
    imageBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
  };
}

function AdminPage() {
  const stats = useMemo(() => {
    const { products } = getCollectionCatalog();
    return buildInventoryStats(products);
  }, []);

  const [inq, setInq] = useState<InquirySummary | null>(null);
  const [inqError, setInqError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getInquirySummary()
      .then((d) => alive && setInq(d))
      .catch((e) => alive && setInqError(e?.message ?? "Failed to load inquiries"));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main
      className="min-h-screen bg-cream text-charcoal"
      style={{ paddingTop: "var(--nav-h)" }}
    >
      <div className="px-6 lg:px-12 pt-10 pb-24 max-w-[1500px] mx-auto">
        {/* Header */}
        <header
          className="border-b pb-8 mb-10 flex items-end justify-between gap-6 flex-wrap"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              ADMIN · INTERNAL
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] uppercase tracking-[0.02em]">
              Operations
            </h1>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-charcoal/55">
              Inventory health · inquiries · category mix
            </p>
          </div>
          <nav className="flex gap-6 text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
            <Link to="/admin/colors" className="hover:text-charcoal">Color QA →</Link>
            <Link to="/admin/image-qa" className="hover:text-charcoal">Image QA →</Link>
            <Link to="/admin/image-health" className="hover:text-charcoal">Image Health →</Link>
            <Link to="/" className="hover:text-charcoal">Site →</Link>
            <Link to="/collection" className="hover:text-charcoal">Collection →</Link>
            <Link to="/contact" className="hover:text-charcoal">Contact →</Link>
          </nav>
        </header>

        {/* KPI row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-charcoal/10 border border-charcoal/10 mb-12">
          <Kpi label="Catalog" value={stats.total} hint="total records" />
          <Kpi label="Public-ready" value={stats.publicReady} hint={`${pct(stats.publicReady, stats.total)} of catalog`} />
          <Kpi
            label="Inquiries"
            value={inq?.total ?? "—"}
            hint={inq ? `${inq.open} open · ${inq.handled} handled` : "loading"}
          />
          <Kpi
            label="Last 7 days"
            value={inq?.last7d ?? "—"}
            hint={inq ? `${inq.last30d} in last 30 days` : "loading"}
          />
        </section>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT — inquiries */}
          <section className="lg:col-span-7 space-y-10">
            <Panel
              eyebrow="Inquiries · last 30 days"
              title="Inbound volume"
              right={
                inq ? (
                  <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
                    {inq.last30d} total
                  </span>
                ) : null
              }
            >
              {inqError ? (
                <p className="text-sm text-charcoal/60">Couldn't load: {inqError}</p>
              ) : inq ? (
                <Sparkline data={inq.daily.map((d) => d.count)} labels={inq.daily.map((d) => d.date)} />
              ) : (
                <SkeletonBlock h={120} />
              )}
            </Panel>

            <Panel eyebrow="Recent submissions" title="Inbox">
              {inq ? (
                inq.recent.length === 0 ? (
                  <p className="text-sm text-charcoal/55">No submissions yet.</p>
                ) : (
                  <div
                    className="border-t"
                    style={{ borderColor: "var(--archive-rule)" }}
                  >
                    {inq.recent.map((r) => (
                      <details
                        key={r.id}
                        className="group border-b py-4"
                        style={{ borderColor: "var(--archive-rule)" }}
                      >
                        <summary className="cursor-pointer list-none flex items-baseline justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg leading-tight truncate">
                              {r.name}
                            </p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-charcoal/50 truncate">
                              {r.email}
                              {r.subject ? <> · {r.subject}</> : null}
                            </p>
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40 shrink-0 tabular-nums">
                            {formatDate(r.created_at)}
                            {!r.handled && (
                              <span
                                className="ml-3 inline-block w-1.5 h-1.5 rounded-full align-middle"
                                style={{ background: "var(--sand)" }}
                                aria-label="Open"
                              />
                            )}
                          </div>
                        </summary>
                        <div className="mt-4 pl-0 text-sm leading-relaxed text-charcoal/75 whitespace-pre-wrap">
                          {r.message}
                        </div>
                        {r.phone && (
                          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-charcoal/50">
                            Phone · {r.phone}
                          </p>
                        )}
                      </details>
                    ))}
                  </div>
                )
              ) : (
                <SkeletonBlock h={240} />
              )}
            </Panel>
          </section>

          {/* RIGHT — inventory */}
          <section className="lg:col-span-5 space-y-10">
            <Panel eyebrow="Inventory · health" title="Coverage">
              <div className="space-y-5">
                <Bar label="Image coverage" pct={stats.imageCoverage} accent="var(--sand)" />
                <Bar label="Dimensions on file" pct={stats.dimensionsCoverage} />
                <Bar
                  label="Public-ready"
                  pct={stats.total ? stats.publicReady / stats.total : 0}
                />
              </div>
              <dl className="mt-8 grid grid-cols-3 gap-px bg-charcoal/10 border border-charcoal/10">
                <Cell k="Custom order" v={stats.customOrder} />
                <Cell k="Manual review" v={stats.manualReview} />
                <Cell k="No image" v={stats.imageBuckets.find((b) => b.label === "0")?.count ?? 0} />
              </dl>
            </Panel>

            <Panel eyebrow="Inventory · mix" title="Top categories">
              <ul className="space-y-2.5">
                {stats.topCategories.map((c) => {
                  const max = stats.topCategories[0]?.count ?? 1;
                  return (
                    <li key={c.display} className="flex items-center gap-3">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal/70 w-40 shrink-0 truncate">
                        {c.display}
                      </span>
                      <span className="flex-1 h-[2px] bg-charcoal/10 relative">
                        <span
                          className="absolute inset-y-0 left-0"
                          style={{
                            width: `${(c.count / max) * 100}%`,
                            background: "var(--charcoal)",
                            opacity: 0.7,
                          }}
                        />
                      </span>
                      <span className="text-[11px] tabular-nums text-charcoal/55 w-10 text-right">
                        {c.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel eyebrow="Inventory · images" title="Per-product image counts">
              <div className="grid grid-cols-5 gap-2">
                {stats.imageBuckets.map((b) => {
                  const max = Math.max(...stats.imageBuckets.map((x) => x.count));
                  const h = max ? (b.count / max) * 100 : 0;
                  return (
                    <div key={b.label} className="flex flex-col items-center gap-2">
                      <div className="w-full h-24 flex items-end">
                        <div
                          className="w-full transition-all"
                          style={{
                            height: `${h}%`,
                            background:
                              b.label === "0"
                                ? "color-mix(in oklab, var(--sand) 80%, transparent)"
                                : "var(--charcoal)",
                            opacity: b.label === "0" ? 1 : 0.78,
                          }}
                        />
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-charcoal/55">
                        {b.label}
                      </p>
                      <p className="text-[11px] tabular-nums text-charcoal/85">
                        {b.count}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t text-[10px] uppercase tracking-[0.22em] text-charcoal/40" style={{ borderColor: "var(--archive-rule)" }}>
          Internal tool · not indexed · authentication pending
        </footer>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Tiny presentational primitives — kept inline so the dashboard stays one
// surface area without polluting the component library.
// ---------------------------------------------------------------------------

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="bg-cream p-6">
      <p className="text-[10px] uppercase tracking-[0.26em] text-charcoal/45">
        {label}
      </p>
      <p className="mt-3 font-display text-[2rem] leading-none tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-charcoal/45">
          {hint}
        </p>
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
          <p className="text-[10px] uppercase tracking-[0.26em] text-charcoal/45">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.04em]">
            {title}
          </h2>
        </div>
        {right}
      </header>
      <div
        className="border-t pt-6"
        style={{ borderColor: "var(--archive-rule)" }}
      >
        {children}
      </div>
    </article>
  );
}

function Bar({
  label,
  pct,
  accent = "var(--charcoal)",
}: {
  label: string;
  pct: number;
  accent?: string;
}) {
  const w = Math.round(pct * 1000) / 10;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-charcoal/65">
        <span>{label}</span>
        <span className="tabular-nums text-charcoal/85">{w.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-[3px] bg-charcoal/10 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-700"
          style={{ width: `${w}%`, background: accent }}
        />
      </div>
    </div>
  );
}

function Cell({ k, v }: { k: string; v: number }) {
  return (
    <div className="bg-cream p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
        {k}
      </p>
      <p className="mt-2 font-display text-xl tabular-nums">{v.toLocaleString()}</p>
    </div>
  );
}

function SkeletonBlock({ h }: { h: number }) {
  return (
    <div
      className="w-full animate-pulse"
      style={{
        height: h,
        background: "color-mix(in oklab, var(--charcoal) 6%, transparent)",
      }}
    />
  );
}

function Sparkline({ data, labels }: { data: number[]; labels: string[] }) {
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
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none" aria-hidden="true">
        <path d={areaPath} fill="color-mix(in oklab, var(--sand) 35%, transparent)" />
        <path d={linePath} fill="none" stroke="var(--charcoal)" strokeWidth={1.2} />
        {pts.map(([x, y], i) =>
          data[i] > 0 ? (
            <circle key={i} cx={x} cy={y} r={1.8} fill="var(--charcoal)" />
          ) : null,
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-charcoal/40 tabular-nums">
        <span>{shortDate(labels[0])}</span>
        <span>{shortDate(labels[Math.floor(labels.length / 2)])}</span>
        <span>{shortDate(labels[labels.length - 1])}</span>
      </div>
    </div>
  );
}

function pct(n: number, d: number) {
  if (!d) return "—";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortDate(iso?: string) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${m}/${d}`;
}

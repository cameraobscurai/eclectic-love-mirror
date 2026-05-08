import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";

// ---------------------------------------------------------------------------
// /admin/image-health — verifies that every product card image URL still
// loads. Runs entirely in the browser using <img> probes (no CORS drama, no
// server round-trips). Reports per-URL failures with a CSV export.
//
// Two scopes:
//   • Card images only        — ~833 checks (the primaryImage of each tile)
//   • All gallery images      — ~1,847 checks (every URL in the catalog)
// ---------------------------------------------------------------------------

import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin/image-health")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Image Health · Admin · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImageHealthPage,
});

const CONCURRENCY = 12;
const TIMEOUT_MS = 15_000;

type Status = "ok" | "error" | "timeout";

interface CheckResult {
  url: string;
  rmsId: string;
  title: string;
  category: string;
  position: number; // 0 = hero, 1+ = gallery
  status: Status;
  ms: number;
}

interface Job {
  url: string;
  rmsId: string;
  title: string;
  category: string;
  position: number;
}

function buildJobs(
  products: CollectionProduct[],
  scope: "primary" | "all",
): Job[] {
  const jobs: Job[] = [];
  for (const p of products) {
    const imgs = p.images ?? [];
    const list = scope === "primary" ? imgs.slice(0, 1) : imgs;
    list.forEach((img, idx) => {
      const url = typeof img === "string" ? img : img?.url;
      if (!url) return;
      jobs.push({
        url,
        rmsId: p.id,
        title: p.title,
        category: p.displayCategory,
        position: idx,
      });
    });
  }
  return jobs;
}

function probeImage(url: string): Promise<{ status: Status; ms: number }> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const img = new Image();
    let settled = false;
    const finish = (status: Status) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = ""; // cancel
      resolve({ status, ms: Math.round(performance.now() - t0) });
    };
    const timer = setTimeout(() => finish("timeout"), TIMEOUT_MS);
    img.onload = () => finish("ok");
    img.onerror = () => finish("error");
    // Cache-bust optional? Skip — we want to test the same URL the UI requests.
    img.src = url;
  });
}

function ImageHealthPage() {
  const { products } = useMemo(() => getCollectionCatalog(), []);
  const [scope, setScope] = useState<"primary" | "all">("primary");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<CheckResult[]>([]);
  const cancelRef = useRef(false);

  const failures = useMemo(
    () => results.filter((r) => r.status !== "ok"),
    [results],
  );
  const okCount = results.length - failures.length;

  const run = useCallback(async () => {
    cancelRef.current = false;
    const jobs = buildJobs(products, scope);
    setTotal(jobs.length);
    setDone(0);
    setResults([]);
    setRunning(true);

    const collected: CheckResult[] = [];
    let cursor = 0;

    const worker = async () => {
      while (!cancelRef.current) {
        const i = cursor++;
        if (i >= jobs.length) return;
        const j = jobs[i];
        const { status, ms } = await probeImage(j.url);
        collected.push({ ...j, status, ms });
        // Throttle React updates: flush every ~20 results
        if (collected.length % 20 === 0 || collected.length === jobs.length) {
          setResults([...collected]);
          setDone(collected.length);
        }
      }
    };

    await Promise.all(
      Array.from({ length: CONCURRENCY }, () => worker()),
    );
    setResults([...collected]);
    setDone(collected.length);
    setRunning(false);
  }, [products, scope]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
  }, []);

  const downloadCsv = useCallback(() => {
    const rows = [
      ["status", "rms_id", "title", "category", "position", "ms", "url"],
      ...failures.map((r) => [
        r.status,
        r.rmsId,
        `"${r.title.replace(/"/g, '""')}"`,
        r.category,
        String(r.position),
        String(r.ms),
        r.url,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `image-health-failures-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [failures]);

  const progressPct = total ? (done / total) * 100 : 0;

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
              Image Health
            </h1>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-charcoal/55">
              Probes every catalog image URL · reports 404s and timeouts
            </p>
          </div>
          <nav className="flex gap-6 text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
            <Link to="/admin" className="hover:text-charcoal">← Admin</Link>
            <Link to="/admin/colors" className="hover:text-charcoal">Color QA →</Link>
            <Link to="/admin/image-qa" className="hover:text-charcoal">Image QA →</Link>
          </nav>
        </header>

        {/* Controls */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <ScopeButton
                active={scope === "primary"}
                onClick={() => !running && setScope("primary")}
                disabled={running}
                label="CARD IMAGES ONLY"
                hint={`~${products.length} checks`}
              />
              <ScopeButton
                active={scope === "all"}
                onClick={() => !running && setScope("all")}
                disabled={running}
                label="ALL GALLERY IMAGES"
                hint={`~${products.reduce(
                  (a, p) => a + (p.images?.length ?? 0),
                  0,
                )} checks`}
              />
            </div>

            <div className="flex items-center gap-3">
              {!running ? (
                <button
                  onClick={run}
                  className="px-6 py-3 bg-charcoal text-cream text-[11px] uppercase tracking-[0.22em] hover:bg-charcoal/85 transition-colors"
                >
                  Run health check
                </button>
              ) : (
                <button
                  onClick={cancel}
                  className="px-6 py-3 border border-charcoal text-charcoal text-[11px] uppercase tracking-[0.22em] hover:bg-charcoal/5 transition-colors"
                >
                  Cancel
                </button>
              )}
              {failures.length > 0 && !running && (
                <button
                  onClick={downloadCsv}
                  className="px-6 py-3 border border-charcoal/30 text-charcoal text-[11px] uppercase tracking-[0.22em] hover:bg-charcoal/5 transition-colors"
                >
                  Download failures CSV
                </button>
              )}
            </div>

            {/* Progress */}
            {(running || done > 0) && (
              <div className="mt-8">
                <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.18em] text-charcoal/65">
                  <span>{running ? "Probing…" : "Complete"}</span>
                  <span className="tabular-nums text-charcoal/85">
                    {done.toLocaleString()} / {total.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 h-[3px] bg-charcoal/10 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 transition-[width] duration-300"
                    style={{
                      width: `${progressPct}%`,
                      background: "var(--charcoal)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* KPI tiles */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-px bg-charcoal/10 border border-charcoal/10 self-start">
            <Kpi label="OK" value={okCount} />
            <Kpi
              label="Failed"
              value={failures.length}
              accent={failures.length > 0}
            />
            <Kpi
              label="Pass rate"
              value={
                results.length
                  ? `${((okCount / results.length) * 100).toFixed(1)}%`
                  : "—"
              }
            />
          </div>
        </section>

        {/* Failures table */}
        <section>
          <header className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.26em] text-charcoal/45">
                Broken image references
              </p>
              <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.04em]">
                Failures
              </h2>
            </div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-charcoal/55 tabular-nums">
              {failures.length} total
            </span>
          </header>

          <div
            className="border-t border-b"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            {!running && results.length === 0 && (
              <p className="py-10 text-sm text-charcoal/55 text-center">
                Choose a scope and run the check.
              </p>
            )}
            {results.length > 0 && failures.length === 0 && !running && (
              <p className="py-10 text-sm text-charcoal/70 text-center">
                ✓ All {results.length.toLocaleString()} images loaded
                successfully.
              </p>
            )}
            {failures.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-charcoal/50">
                      <th className="py-3 pr-4 font-normal">Status</th>
                      <th className="py-3 pr-4 font-normal">Title</th>
                      <th className="py-3 pr-4 font-normal">Category</th>
                      <th className="py-3 pr-4 font-normal">Pos</th>
                      <th className="py-3 pr-4 font-normal tabular-nums">ms</th>
                      <th className="py-3 pr-4 font-normal">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failures.map((r, i) => (
                      <tr
                        key={`${r.rmsId}-${r.position}-${i}`}
                        className="border-t"
                        style={{ borderColor: "var(--archive-rule)" }}
                      >
                        <td className="py-2.5 pr-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-2.5 pr-4 max-w-[260px] truncate">
                          {r.title}
                        </td>
                        <td className="py-2.5 pr-4 text-charcoal/65 text-[11px] uppercase tracking-[0.16em]">
                          {r.category}
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-charcoal/55">
                          {r.position === 0 ? "hero" : r.position}
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-charcoal/55">
                          {r.ms}
                        </td>
                        <td className="py-2.5 pr-4">
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-charcoal/70 hover:text-charcoal underline decoration-charcoal/20 underline-offset-2 break-all text-[11px] font-mono"
                            title={r.url}
                          >
                            {shortenUrl(r.url)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <footer
          className="mt-16 pt-8 border-t text-[10px] uppercase tracking-[0.22em] text-charcoal/40"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          Internal tool · client-side probes · {CONCURRENCY} parallel ·{" "}
          {TIMEOUT_MS / 1000}s timeout
        </footer>
      </div>
    </main>
  );
}

function ScopeButton({
  active,
  onClick,
  disabled,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 text-left border transition-colors ${
        active
          ? "border-charcoal bg-charcoal text-cream"
          : "border-charcoal/30 text-charcoal hover:bg-charcoal/5"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="text-[10px] uppercase tracking-[0.22em]">{label}</div>
      <div
        className={`mt-1 text-[10px] tracking-[0.12em] ${
          active ? "text-cream/65" : "text-charcoal/50"
        }`}
      >
        {hint}
      </div>
    </button>
  );
}

function Kpi({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="bg-cream p-5">
      <p className="text-[10px] uppercase tracking-[0.26em] text-charcoal/45">
        {label}
      </p>
      <p
        className="mt-3 font-display text-[1.75rem] leading-none tabular-nums"
        style={accent ? { color: "var(--sand)" } : undefined}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles =
    status === "timeout"
      ? "bg-charcoal/10 text-charcoal"
      : "bg-charcoal text-cream";
  return (
    <span
      className={`inline-block px-2 py-1 text-[9px] uppercase tracking-[0.22em] ${styles}`}
    >
      {status === "error" ? "404 / err" : status}
    </span>
  );
}

function shortenUrl(url: string): string {
  if (url.length <= 80) return url;
  return `${url.slice(0, 50)}…${url.slice(-26)}`;
}

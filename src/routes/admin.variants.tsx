/**
 * /admin/variants — VARIANT SETUP.
 *
 * One family at a time. The page guesses the option axis ("Size", "Finish",
 * "Piece") and a short label per piece from the titles, shows the photos, and
 * asks a human one question: is this right? Accepting writes option_name +
 * variant_label, which is exactly what switches the public PDP from a plain
 * gallery to a variant configurator.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { runAdminMutation } from "@/lib/admin/runAdminMutation";
import { withCdnWidth } from "@/lib/image-url";
import { suggestForFamily } from "@/lib/variant-suggest";
import {
  listFamilySetup,
  applyFamilySetup,
  clearFamilySetup,
  type SetupFamily,
} from "@/lib/variant-setup.functions";

export const Route = createFileRoute("/admin/variants")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  component: VariantSetup,
  head: () => ({
    meta: [
      { title: "Variant Setup — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const AXES = ["Size", "Finish", "Piece", "Color", "Style", "Option"];

function VariantSetup() {
  const [families, setFamilies] = useState<SetupFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [axis, setAxis] = useState("");
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [onlyTodo, setOnlyTodo] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await runAdminMutation(() => listFamilySetup(), {
        surface: "variants:list",
        errorMessage: "Couldn't load the collections.",
      });
      if (!alive) return;
      if (res.ok) setFamilies(res.data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const queue = useMemo(
    () => (onlyTodo ? families.filter((f) => !f.option_name) : families),
    [families, onlyTodo],
  );
  const done = families.filter((f) => f.option_name).length;
  const current = queue[Math.min(index, Math.max(queue.length - 1, 0))] ?? null;

  // Re-seed the form whenever the visible family changes.
  useEffect(() => {
    if (!current) return;
    const s = suggestForFamily(current.members.map((m) => ({ id: m.id, title: m.title })));
    setAxis(current.option_name || s.axis);
    const next: Record<string, string> = {};
    for (const m of current.members) next[m.id] = m.variant_label || s.labels[m.id] || m.title;
    setLabels(next);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function step(delta: number) {
    setIndex((i) => Math.max(0, Math.min(queue.length - 1, i + delta)));
  }

  async function apply() {
    if (!current) return;
    setSaving(true);
    const res = await runAdminMutation(
      () =>
        applyFamilySetup({
          data: {
            familyId: current.id,
            optionName: axis.trim(),
            labels: current.members.map((m) => ({ id: m.id, label: (labels[m.id] || "").trim() })),
          },
        }),
      { surface: "variants:apply", errorMessage: "Couldn't turn this collection on." },
    );
    setSaving(false);
    if (!res.ok) return;
    toast.success(`${current.title} is live as a ${axis.trim().toLowerCase()} picker.`);
    setFamilies((prev) =>
      prev.map((f) =>
        f.id === current.id
          ? {
              ...f,
              option_name: axis.trim(),
              members: f.members.map((m) => ({ ...m, variant_label: labels[m.id] || m.variant_label })),
            }
          : f,
      ),
    );
    if (onlyTodo) setIndex((i) => Math.min(i, Math.max(queue.length - 2, 0)));
    else step(1);
  }

  async function turnOff() {
    if (!current) return;
    const res = await runAdminMutation(() => clearFamilySetup({ data: { familyId: current.id } }), {
      surface: "variants:clear",
      errorMessage: "Couldn't turn this collection off.",
    });
    if (!res.ok) return;
    toast.success("Back to a plain photo gallery.");
    setFamilies((prev) =>
      prev.map((f) => (f.id === current.id ? { ...f, option_name: null } : f)),
    );
  }

  const dupe = (() => {
    const seen = new Set<string>();
    for (const m of current?.members ?? []) {
      const v = (labels[m.id] || "").trim().toLowerCase();
      if (!v) return "Every piece needs a label.";
      if (seen.has(v)) return `Two pieces are both called "${labels[m.id]}".`;
      seen.add(v);
    }
    return null;
  })();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl uppercase tracking-[0.12em]">Variant setup</h1>
        <p className="mt-3 max-w-2xl text-sm uppercase tracking-[0.08em] text-muted-foreground">
          Some products come in a set — sizes, finishes, pieces. Tell us what makes them
          different and the live product page gets a picker instead of a pile of photos.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.1em]">
          <span className="text-muted-foreground">
            {done} of {families.length} collections set up
          </span>
          <button
            type="button"
            onClick={() => {
              setOnlyTodo((v) => !v);
              setIndex(0);
            }}
            className="border border-border px-3 py-1 hover:bg-muted"
          >
            {onlyTodo ? "Showing: not done yet" : "Showing: all"}
          </button>
        </div>
      </header>

      {loading && <p className="text-sm uppercase tracking-[0.1em]">Loading…</p>}

      {!loading && !current && (
        <p className="text-sm uppercase tracking-[0.1em]">
          Nothing left in this list. Nice.
        </p>
      )}

      {current && (
        <section className="border border-border p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-xl uppercase tracking-[0.1em]">{current.title}</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {current.members.length} pieces
                {current.option_name ? ` · live as “${current.option_name}”` : " · not set up"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.1em]">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={index === 0}
                className="border border-border px-3 py-1 disabled:opacity-40"
              >
                Back
              </button>
              <span className="text-muted-foreground">
                {Math.min(index + 1, queue.length)} / {queue.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={index >= queue.length - 1}
                className="border border-border px-3 py-1 disabled:opacity-40"
              >
                Skip
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-xs uppercase tracking-[0.12em] text-muted-foreground">
              What's different between these?
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AXES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAxis(a)}
                  className={`border px-3 py-1 text-xs uppercase tracking-[0.1em] ${
                    axis.toLowerCase() === a.toLowerCase()
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {a}
                </button>
              ))}
              <input
                value={axis}
                onChange={(e) => setAxis(e.target.value)}
                placeholder="Or type your own"
                className="border border-border bg-transparent px-3 py-1 text-xs uppercase tracking-[0.1em]"
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            {current.members.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="aspect-square border border-border bg-muted">
                  {m.images[0] ? (
                    <img
                      src={withCdnWidth(m.images[0], 400)}
                      alt={m.title}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {m.title}
                </p>
                <input
                  value={labels[m.id] ?? ""}
                  onChange={(e) => setLabels((p) => ({ ...p, [m.id]: e.target.value }))}
                  className="w-full border border-border bg-transparent px-2 py-1 text-xs uppercase tracking-[0.08em]"
                />
              </div>
            ))}
          </div>

          {dupe && (
            <p className="mt-4 text-xs uppercase tracking-[0.1em] text-destructive">{dupe}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={saving || !!dupe || !axis.trim()}
              className="border border-foreground bg-foreground px-5 py-2 text-xs uppercase tracking-[0.12em] text-background disabled:opacity-40"
            >
              {saving ? "Saving…" : "Looks right — turn it on"}
            </button>
            {current.option_name && (
              <button
                type="button"
                onClick={turnOff}
                className="border border-border px-5 py-2 text-xs uppercase tracking-[0.12em] hover:bg-muted"
              >
                Turn off
              </button>
            )}
            <a
              href={`/collection/${current.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-[0.1em] underline underline-offset-4"
            >
              View live page
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

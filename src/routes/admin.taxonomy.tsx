/**
 * /admin/taxonomy — Taxonomy Studio (Task E).
 *
 * Photo-first. One tile per product. The dropdowns are loaded from the
 * reference tables so an invalid collection/category pair is unrepresentable
 * in the UI (and rejected again server-side).
 *
 * ✓ CONFIRM is a first-class gesture: agreeing with an existing assignment
 * must not require re-selecting it from a dropdown. The default view is the
 * CONFIRM queue, so without that button the studio is unworkable on open.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import { runAdminMutation } from "@/lib/admin/runAdminMutation";
import { withCdnWidth } from "@/lib/image-url";
import {
  listTaxonomyTree,
  listTaxonomyRows,
  assignTaxonomy,
  confirmTaxonomy,
  flagForOwner,
  type TaxonomyRow,
} from "@/lib/taxonomy-admin.functions";

export const Route = createFileRoute("/admin/taxonomy")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  component: TaxonomyStudio,
  head: () => ({
    meta: [{ title: "Taxonomy Studio — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

type State = "unassigned" | "needs_owner" | "confirm" | "needs_ruling" | "ruled";
type FilterId = State | "all";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "confirm", label: "Confirm" },
  { id: "unassigned", label: "Unassigned" },
  { id: "needs_ruling", label: "Needs ruling" },
  { id: "needs_owner", label: "Ask Adrienne" },
  { id: "ruled", label: "Ruled" },
  { id: "all", label: "All" },
];

const STATE_COLOR: Record<State, string> = {
  unassigned: "bg-destructive",
  needs_owner: "bg-amber-500",
  confirm: "bg-sky-500",
  needs_ruling: "bg-muted-foreground",
  ruled: "bg-emerald-600",
};

// Unassigned is the BYPASS class, not just the unfilled class.
//
// The reseed never saw the Portia/Zala/legacy rows because taxonomy_review is
// NULL — a reliable marker for "row that never went through the declared
// pipeline". A null-review row with slugs used to sort into needs_ruling and
// vanish among 600 others; now it surfaces here. Permanent detector, not a
// one-time cleanup.
function rowState(r: TaxonomyRow): State {
  if (!r.collection_slug || !r.category_slug || !r.review) return "unassigned";
  if (r.review.needs_owner) return "needs_owner";
  if (r.review.reviewed) return "ruled";
  if (r.review.source) return "confirm";
  return "needs_ruling";
}

/** Why this row is in the Unassigned queue. */
function originTag(r: TaxonomyRow): string | null {
  if (rowState(r) !== "unassigned") return null;
  if (r.review?.source === "human-deferred") return "human-deferred";
  if (!r.review) return "no-review";
  return "unfilled";
}

function TaxonomyStudio() {
  const [rows, setRows] = useState<TaxonomyRow[] | null>(null);
  const [tree, setTree] = useState<Awaited<ReturnType<typeof listTaxonomyTree>> | null>(null);
  const [filter, setFilter] = useState<FilterId>("confirm");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkCollection, setBulkCollection] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");

  const refresh = async () => {
    const [t, r] = await Promise.all([listTaxonomyTree(), listTaxonomyRows()]);
    setTree(t);
    setRows(r.rows);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = {
      all: 0,
      confirm: 0,
      unassigned: 0,
      needs_ruling: 0,
      needs_owner: 0,
      ruled: 0,
    };
    for (const r of rows ?? []) {
      c.all++;
      c[rowState(r)]++;
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (filter !== "all" && rowState(r) !== filter) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

  const categoriesFor = (collection: string) =>
    (tree?.categories ?? []).filter((c) => c.collection_slug === collection);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    const res = await runAdminMutation(fn, { surface: "taxonomy-studio" });
    setBusy(false);
    if (res.ok) {
      toast.success(done);
      setSelected(new Set());
      await refresh();
    }
  };

  const onAssignOne = (row: TaxonomyRow, collection: string, category: string) =>
    run(
      () =>
        assignTaxonomy({
          data: { ids: [row.id], collection_slug: collection, category_slug: category },
        }),
      `${row.title} → ${collection} / ${category}`,
    );

  const onConfirm = (ids: string[]) =>
    run(
      async () => {
        const res = await confirmTaxonomy({ data: { ids } });
        if (res.confirmed === 0) throw new Error("nothing confirmable in that selection");
        return res;
      },
      `${ids.length === 1 ? "Confirmed" : `Confirmed ${ids.length}`}`,
    );

  // CONFIRM ALL scopes to the currently visible filter and always skips
  // needs_owner rows (the server enforces the skip too).
  const confirmAllVisible = () => {
    const ids = visible
      .filter(
        (r) =>
          r.collection_slug && r.category_slug && !r.review?.needs_owner && !r.review?.reviewed,
      )
      .map((r) => r.id);
    if (!ids.length) return toast.info("Nothing to confirm in this view.");
    void onConfirm(ids);
  };

  if (!rows || !tree) {
    return (
      <div className="p-8 text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-lg uppercase tracking-widest">Taxonomy Studio</h1>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {counts.all} products · every change saves immediately
        </p>
      </header>

      {/* Ledger strip — one tick per product, drains as rulings land. */}
      <div className="flex h-3 w-full gap-px overflow-hidden rounded-sm">
        {rows.map((r) => (
          <span
            key={r.id}
            className={`h-full flex-1 ${STATE_COLOR[rowState(r)]}`}
            title={`${r.title} — ${rowState(r)}`}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFilter(f.id);
              setSelected(new Set());
            }}
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground"
            }`}
          >
            {f.label} {counts[f.id]}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles"
          className="ml-auto w-56 border border-border bg-transparent px-3 py-1 text-xs uppercase tracking-wider outline-none"
        />
        <button
          onClick={confirmAllVisible}
          disabled={busy}
          className="border border-border px-3 py-1 text-[10px] uppercase tracking-widest disabled:opacity-40"
        >
          ✓ Confirm all in view
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {visible.map((row) => {
          const state = rowState(row);
          const isSelected = selected.has(row.id);
          return (
            <article
              key={row.id}
              className={`space-y-2 border p-2 ${isSelected ? "border-foreground" : "border-border"}`}
            >
              <button
                type="button"
                onClick={() => toggle(row.id)}
                aria-pressed={isSelected}
                className="relative block aspect-[5/4] w-full overflow-hidden bg-muted/30"
              >
                {row.cover ? (
                  <img
                    src={withCdnWidth(row.cover, 400)}
                    alt={row.title}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground">
                    No photo
                  </span>
                )}
                <span
                  className={`absolute left-1 top-1 h-2 w-2 rounded-full ${STATE_COLOR[state]}`}
                />
              </button>

              <p className="truncate text-[11px] uppercase tracking-wider" title={row.title}>
                {row.title}
              </p>
              {originTag(row) && (
                <span className="inline-block border border-border px-1 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                  {originTag(row)}
                </span>
              )}

              <select
                value={row.collection_slug ?? ""}
                onChange={(e) => {
                  const collection = e.target.value;
                  const first = categoriesFor(collection)[0];
                  if (first) void onAssignOne(row, collection, first.slug);
                }}
                className="w-full border border-border bg-transparent px-1 py-1 text-[10px] uppercase tracking-wider"
              >
                <option value="">— collection —</option>
                {tree.collections.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={row.category_slug ?? ""}
                disabled={!row.collection_slug}
                onChange={(e) => onAssignOne(row, row.collection_slug!, e.target.value)}
                className="w-full border border-border bg-transparent px-1 py-1 text-[10px] uppercase tracking-wider disabled:opacity-40"
              >
                <option value="">— category —</option>
                {categoriesFor(row.collection_slug ?? "").map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-1">
                {state !== "ruled" &&
                  row.collection_slug &&
                  row.category_slug &&
                  !row.review?.needs_owner && (
                    <button
                      onClick={() => onConfirm([row.id])}
                      disabled={busy}
                      className="flex-1 border border-emerald-600 px-2 py-1 text-[10px] uppercase tracking-widest text-emerald-700 disabled:opacity-40"
                    >
                      ✓ Confirm
                    </button>
                  )}
                <button
                  onClick={() =>
                    run(() => flagForOwner({ data: { ids: [row.id] } }), "Flagged for Adrienne")
                  }
                  disabled={busy}
                  className="flex-1 border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground disabled:opacity-40"
                >
                  Ask
                </button>
              </div>
            </article>
          );
        })}
        {!visible.length && (
          <p className="col-span-full py-12 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Nothing in this queue.
          </p>
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 p-3 backdrop-blur">
          <span className="text-[10px] uppercase tracking-widest">{selected.size} selected</span>
          <select
            value={bulkCollection}
            onChange={(e) => {
              setBulkCollection(e.target.value);
              setBulkCategory("");
            }}
            className="border border-border bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider"
          >
            <option value="">— collection —</option>
            {tree.collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={bulkCategory}
            disabled={!bulkCollection}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="border border-border bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-40"
          >
            <option value="">— category —</option>
            {categoriesFor(bulkCollection).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            disabled={!bulkCollection || !bulkCategory || busy}
            onClick={() =>
              run(
                () =>
                  assignTaxonomy({
                    data: {
                      ids: [...selected],
                      collection_slug: bulkCollection,
                      category_slug: bulkCategory,
                    },
                  }),
                `Assigned ${selected.size}`,
              )
            }
            className="border border-foreground px-3 py-1 text-[10px] uppercase tracking-widest disabled:opacity-40"
          >
            Assign selected
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={busy}
            className="border border-emerald-600 px-3 py-1 text-[10px] uppercase tracking-widest text-emerald-700 disabled:opacity-40"
          >
            ✓ Confirm selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

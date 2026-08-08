import { mergeCategoryOptions, subcategoryOptions, CATEGORY_SUBCATEGORIES, type AdminSubcategory } from "@/lib/admin-categories";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { requireStaffOrRedirect } from "@/lib/admin-guard";
import { ProductEditDrawer } from "@/components/admin/ProductEditDrawer";
import {
  listProducts,
  getProduct,
  updateProduct,
  listDistinctCategories,
  listProductAudit,
  getMyRole,
  deleteProduct,

} from "@/lib/products-admin.functions";
import { getCollectionCatalog } from "@/lib/phase3-catalog";
import { productParent, PARENT_LABELS, type ParentId } from "@/lib/collection-parents";
import { ImageOrderEditor } from "@/components/admin/ImageOrderEditor";


// AdminShell is provided by the parent /admin layout route — do NOT re-wrap.
export const Route = createFileRoute("/admin/products")({
  ssr: false,
  beforeLoad: ({ location }) => requireStaffOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Products · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Inner,
  // `group` is the HIVE COLLECTION heading (parent) filter — the public
  // grouping (Dining, Lounge Seating…) that is DERIVED from category +
  // subcategory, not stored on the row. We resolve it to an rms_id set from
  // the baked catalog and filter server-side.
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    cat: typeof s.cat === "string" ? s.cat : "",
    sub: typeof s.sub === "string" ? s.sub : "",
    sort: (["title", "category", "subcategory", "updated"].includes(s.sort as string)
      ? s.sort
      : "title") as "title" | "category" | "subcategory" | "updated",
    ready: (s.ready === "yes" || s.ready === "no" ? s.ready : "all") as "yes" | "no" | "all",
    id: typeof s.id === "string" ? s.id : "",
    group: typeof s.group === "string" ? s.group : undefined,
  }),
});

type Row = {
  id: string; rms_id: string | null; title: string; slug: string | null;
  category: string | null; subcategory_slug: string | null; status: string;
  quantity: number | null;
  quantity_label: string | null; public_ready: boolean | null;
  images: string[] | null;
  updated_at: string; editorial_order: number | null;
};

const SORT_LABELS: Record<string, string> = {
  title: "Title A–Z",
  category: "Category, then title",
  subcategory: "Subcategory, then title",
  updated: "Recently edited",
};

const PAGE = 50;

function Inner() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const list = useServerFn(listProducts);
  const catsFn = useServerFn(listDistinctCategories);
  const queryClient = useQueryClient();

  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState(search.q);
  // Keep the box in sync when the URL changes from history nav / cleared filters.
  // Only when they actually diverge, so the debounce below can't clobber typing.
  useEffect(() => {
    setSearchInput((cur: string) => (cur === search.q ? cur : search.q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q]);

  // Live search: 250ms after the last keystroke the URL `q` updates, which
  // refires the list query. `replace: true` keeps one history entry per
  // search session instead of one per character. Enter still flushes early.
  useEffect(() => {
    if (searchInput === search.q) return;
    const t = setTimeout(() => {
      navigate({ search: (s: any) => ({ ...s, q: searchInput }), replace: true });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, search.q]);



  // Categories rarely change — cache hard so switching pages never refetches.
  const { data: cats = [] } = useQuery({
    queryKey: ["admin", "product-categories"],
    queryFn: () => catsFn(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  // HIVE COLLECTION headings are derived, not stored. Build one rms_id →
  // ParentId map from the baked catalog and reuse it for both the heading
  // filter and the per-row "Collection" column, so Adrienne can see exactly
  // which heading a piece lands under (Dining included).
  const { data: parentMap = null } = useQuery({
    queryKey: ["admin", "parent-map"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const c = await getCollectionCatalog();
      const map: Record<string, ParentId> = {};
      for (const p of c.products) {
        const parent = productParent(p);
        if (!parent) continue;
        map[p.id] = parent;
        for (const v of p.variants ?? []) map[v.id] = parent;
      }
      return map;
    },
  });

  const groupRmsIds = search.group
    ? parentMap
      ? Object.keys(parentMap).filter((id) => parentMap[id] === (search.group as ParentId))
      : null
    : null;

  const listArgs = {
    search: search.q,
    category: search.cat || undefined,
    subcategory: search.sub || undefined,
    publicReady: search.ready,
    sort: search.sort,
    rmsIds: groupRmsIds ?? undefined,
    limit: PAGE,
    offset,
  };

  const {
    data: page,
    isFetching,
    isPending,
  } = useQuery({
    queryKey: ["admin", "products", listArgs],
    // Don't fire until the group filter (if any) has resolved.
    enabled: !search.group || groupRmsIds !== null,
    queryFn: () => list({ data: listArgs }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const rows = (page?.rows ?? []) as Row[];
  const count = page?.count ?? 0;
  const loading = isPending || isFetching;

  // Warm the next page in the background so paging feels instant.
  useEffect(() => {
    if (!page || offset + PAGE >= count) return;
    const nextArgs = { ...listArgs, offset: offset + PAGE };
    queryClient.prefetchQuery({
      queryKey: ["admin", "products", nextArgs],
      queryFn: () => list({ data: nextArgs }),
      staleTime: 30_000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, offset, count]);

  useEffect(() => { setOffset(0); }, [search.q, search.cat, search.sub, search.ready, search.group, search.sort]);

  // Enter flushes the pending debounce immediately.
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (s: any) => ({ ...s, q: searchInput }), replace: true });
  };

  const searchPending = searchInput !== search.q;


  const visibleRows = rows;
  const groupLabel = search.group ? (PARENT_LABELS[search.group as ParentId] ?? search.group) : null;
  // Subcategory options follow the chosen category; with no category picked we
  // offer the union so the filter is still usable.
  const allSubs: AdminSubcategory[] = Object.values(CATEGORY_SUBCATEGORIES).flat();
  const subOptions: AdminSubcategory[] = search.cat
    ? subcategoryOptions(search.cat, search.sub || null)
    : Array.from(new Map(allSubs.map((s) => [s.id, s])).values()).sort((a, b) =>
        a.label.localeCompare(b.label),
      );
  const subLabels: Record<string, string> = Object.fromEntries(
    allSubs.map((s) => [s.id, s.label]),
  );



  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <div className="px-6 lg:px-12 pt-8 pb-24 max-w-[1500px] mx-auto">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">Admin · Inventory</p>
            <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.02em]">Products</h1>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-charcoal/55">
              {count.toLocaleString()} record{count === 1 ? "" : "s"} · edits log to activity trail
            </p>
            {groupLabel && (
              <div className="mt-3 inline-flex items-center gap-2 border border-charcoal/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                <span className="text-charcoal/60">Group filter:</span>
                <span className="text-charcoal">{groupLabel}</span>
                <span className="text-charcoal/45 tabular-nums">({count} match{count === 1 ? "" : "es"})</span>
                <button
                  type="button"
                  onClick={() => navigate({ search: (s: any) => ({ ...s, group: undefined }) })}
                  className="ml-2 text-charcoal/60 hover:text-charcoal"
                  aria-label="Clear group filter"
                >×</button>
              </div>
            )}
          </div>
          <Link
            to="/admin/new-product"
            className="inline-flex items-center gap-2 bg-charcoal text-cream px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] hover:bg-charcoal/90 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" /> New product
          </Link>
        </header>



        {/* filter row */}
        <form onSubmit={submitSearch} className="mb-6 flex flex-wrap items-center gap-3 border-y border-charcoal/10 py-3 text-[11px] uppercase tracking-[0.16em]">
          <div className="relative flex-1 min-w-[260px] flex items-center gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title, RMS id, slug"
              aria-label="Search inventory"
              className="flex-1 bg-transparent border-b border-charcoal/20 px-1 py-1 outline-none focus:border-charcoal"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  navigate({ search: (s: any) => ({ ...s, q: "" }), replace: true });
                }}
                aria-label="Clear search"
                className="text-charcoal/45 hover:text-charcoal text-[13px] leading-none px-1"
              >×</button>
            )}
            <span className="w-16 text-[9px] tracking-[0.2em] text-charcoal/40 tabular-nums">
              {searchPending || (loading && search.q) ? "…" : ""}
            </span>
          </div>

          {/* THREE-PART SORT: Category → Hive Collection heading → Subcategory */}
          <select
            value={search.cat}
            aria-label="Filter by category"
            onChange={(e) => navigate({ search: (s: any) => ({ ...s, cat: e.target.value, sub: "" }) })}
            className="bg-transparent border border-charcoal/20 px-2 py-1 text-charcoal"
          >
            <option value="">All categories</option>
            {mergeCategoryOptions(cats).map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <select
            value={search.group ?? ""}
            aria-label="Filter by Hive Collection heading"
            onChange={(e) => navigate({ search: (s: any) => ({ ...s, group: e.target.value || undefined }) })}
            className="bg-transparent border border-charcoal/20 px-2 py-1 text-charcoal"
          >
            <option value="">All collections</option>
            {PARENT_ORDER.map((p) => <option key={p} value={p}>{PARENT_LABELS[p]}</option>)}
          </select>
          <select
            value={search.sub}
            aria-label="Filter by subcategory"
            onChange={(e) => navigate({ search: (s: any) => ({ ...s, sub: e.target.value }) })}
            className="bg-transparent border border-charcoal/20 px-2 py-1 text-charcoal"
          >
            <option value="">All subcategories</option>
            {subOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select
            value={search.ready}
            aria-label="Filter by visibility"
            onChange={(e) => navigate({ search: (s: any) => ({ ...s, ready: e.target.value as "yes"|"no"|"all" }) })}
            className="bg-transparent border border-charcoal/20 px-2 py-1 text-charcoal"
          >
            <option value="all">All statuses</option>
            <option value="yes">Public-ready</option>
            <option value="no">Hidden</option>
          </select>
          <label className="flex items-center gap-2 text-charcoal/55">
            Sort
            <select
              value={search.sort}
              aria-label="Sort list"
              onChange={(e) => navigate({ search: (s: any) => ({ ...s, sort: e.target.value }) })}
              className="bg-transparent border border-charcoal/20 px-2 py-1 text-charcoal"
            >
              {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {/* Results narrow as you type; this is just a keyboard-friendly flush. */}
          <button type="submit" className="sr-only">Search</button>

        </form>

        {/* table */}
        <div className="border border-charcoal/10 bg-cream">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 border-b border-charcoal/10">
              <tr>
                <th className="text-left px-3 py-2 w-14"></th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Collection</th>
                <th className="text-left px-3 py-2">Subcategory</th>
                <th className="text-left px-3 py-2">Qty</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Public</th>
                <th className="text-left px-3 py-2">RMS</th>
              </tr>
            </thead>
            <tbody>
              {loading && visibleRows.length === 0 &&
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-charcoal/5">
                    <td className="px-3 py-2"><div className="w-10 h-10 bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-56 bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-24 bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-24 bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-24 bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-8 bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-16 bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-2 w-2 rounded-full bg-charcoal/5 animate-pulse" /></td>
                    <td className="px-3 py-2"><div className="h-3 w-10 bg-charcoal/5 animate-pulse" /></td>
                  </tr>
                ))}
              {!loading && visibleRows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-charcoal/40 text-[11px] uppercase tracking-[0.2em]">No products match</td></tr>
              )}

              {visibleRows.map((r) => {
                // Must match the public site exactly: the original photo is the
                // hero. Never fall back to upscaled_cover_url — that column is
                // retired and showing it here makes admin disagree with live.
                const cover = r.images?.[0] ?? null;
                const parent = r.rms_id ? parentMap?.[r.rms_id] : undefined;

                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate({ search: (s: any) => ({ ...s, id: r.id }) })}
                    className="border-b border-charcoal/5 hover:bg-charcoal/[0.03] cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      {cover ? <img src={cover} alt="" className="w-10 h-10 object-cover" loading="lazy" /> : <div className="w-10 h-10 bg-charcoal/5" />}
                    </td>
                    <td className="px-3 py-2 font-display text-[14px]">{r.title}</td>
                    <td className="px-3 py-2 text-charcoal/70">{r.category ?? "—"}</td>
                    <td className="px-3 py-2 text-charcoal/70">{parent ? PARENT_LABELS[parent] : "—"}</td>
                    <td className="px-3 py-2 text-charcoal/70">
                      {r.subcategory_slug ? (subLabels[r.subcategory_slug] ?? r.subcategory_slug) : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.quantity ?? "—"}{r.quantity_label ? ` ${r.quantity_label}` : ""}</td>
                    <td className="px-3 py-2 text-charcoal/70">{r.status}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${r.public_ready ? "bg-green-600" : "bg-charcoal/20"}`} />
                    </td>
                    <td className="px-3 py-2 text-[10px] text-charcoal/45 tabular-nums">{r.rms_id ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


        {/* pagination */}
        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-charcoal/60">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
            className="border border-charcoal/20 px-3 py-1 disabled:opacity-30"
          >← Prev</button>
          <span>{offset + 1}–{Math.min(offset + PAGE, count)} of {count}</span>
          <button
            disabled={offset + PAGE >= count}
            onClick={() => setOffset(offset + PAGE)}
            className="border border-charcoal/20 px-3 py-1 disabled:opacity-30"
          >Next →</button>
        </div>
      </div>

      {search.id && (
        <EditDrawer
          id={search.id}
          onClose={() => navigate({ search: (s: any) => ({ ...s, id: "" }) })}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "product-categories"] });
          }}


        />
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Edit drawer wrapper — fetches row/audit/cats/role, renders <ProductEditDrawer>.
// The photo editor (ImageOrderEditor) is launched from the drawer's onOpenPhotos.
// ---------------------------------------------------------------------------

type ProductRow = Record<string, unknown> & {
  id: string; title: string; slug?: string | null; rms_id?: string | null;
  images?: string[] | null; card_background_url?: string | null;
};

function EditDrawer({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const get = useServerFn(getProduct);
  const upd = useServerFn(updateProduct);
  const auditFn = useServerFn(listProductAudit);
  const catsFn = useServerFn(listDistinctCategories);
  const roleFn = useServerFn(getMyRole);
  const del = useServerFn(deleteProduct);

  const [row, setRow] = useState<ProductRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [audit, setAudit] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [photoEditor, setPhotoEditor] = useState(false);

  const refetch = () => {
    setLoadError(null);
    get({ data: { id } })
      .then((r) => setRow(r as ProductRow))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load this product."));
    auditFn({ data: { entityId: id, limit: 20 } }).then((r) => setAudit(r as unknown[])).catch(() => {});
  };

  useEffect(() => {
    setRow(null); setAudit([]);
    refetch();
    catsFn().then(setCats).catch(() => {});
    roleFn().then((r) => setRole(r.role === "admin" ? "admin" : "staff")).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!row) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
        <button onClick={onClose} aria-label="Close" className="flex-1 bg-charcoal/40" />
        <aside className="w-full max-w-[720px] bg-cream border-l border-charcoal/15 p-10 text-[11px] uppercase tracking-[0.22em] text-charcoal/40">
          {loadError ? (
            <div className="space-y-4 text-charcoal">
              <p className="text-destructive normal-case tracking-normal">{loadError}</p>
              <div className="flex gap-3">
                <button onClick={refetch} className="border border-charcoal/30 px-3 py-1">Retry</button>
                <button onClick={onClose} className="border border-charcoal/20 px-3 py-1">Close</button>
              </div>
            </div>
          ) : (
            "Loading…"
          )}
        </aside>
      </div>
    );
  }


  const liveUrl = typeof row.slug === "string" && row.slug
    ? `https://eclectichive.com/collection/${row.slug}`
    : undefined;

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ProductEditDrawer
        product={row as any}
        categories={cats}
        role={role}
        recentChanges={audit as never}
        categoryPriceStats={{}}
        liveUrl={liveUrl}
        sketch={null}
        onClose={onClose}
        onOpenPhotos={() => setPhotoEditor(true)}
        onDelete={async () => {
          await del({ data: { id } });
          onSaved();
          onClose();
        }}

        onPhotosSaved={(next: { images: string[]; card_background_url: string | null }) => {
          // Keep the drawer's preview + readiness checklist in step with the
          // photo editor instead of waiting for a close/reopen.
          setRow((prev) => (prev ? { ...prev, images: next.images, card_background_url: next.card_background_url } : prev));
          onSaved();
        }}

        onSave={async (patch: Record<string, unknown>) => {
          const updated = await upd({ data: { id, patch } });
          setRow(updated as ProductRow);
          onSaved();
          auditFn({ data: { entityId: id, limit: 20 } }).then((r) => setAudit(r as unknown[])).catch(() => {});
        }}
      />
      {photoEditor && (
        <ImageOrderEditor
          item={{
            id: row.id,
            rms_id: (row.rms_id as string | null) ?? null,
            title: (row.title as string) ?? "",
            images: Array.isArray(row.images) ? (row.images as string[]) : [],
            card_background_url: (row.card_background_url as string | null) ?? null,
          }}
          onClose={() => setPhotoEditor(false)}
          onSaved={(next) => {
            setRow((prev) => (prev ? { ...prev, images: next.images, card_background_url: next.card_background_url } : prev));
            onSaved();
          }}
        />
      )}
    </>
  );
}

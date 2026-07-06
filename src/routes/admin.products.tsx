import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { requireStaffOrRedirect } from "@/lib/admin-guard";
import {
  listProducts,
  getProduct,
  updateProduct,
  listDistinctCategories,
  listProductAudit,
} from "@/lib/products-admin.functions";
import { getCollectionCatalog } from "@/lib/phase3-catalog";
import { productParent, PARENT_LABELS, type ParentId } from "@/lib/collection-parents";

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
  // `group` is a BOH deep-link (per-parent category tile). We derive the
  // rms_id set for that ParentId from the baked catalog and post-filter
  // the API response client-side (see groupRmsSet below).
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    cat: typeof s.cat === "string" ? s.cat : "",
    ready: (s.ready === "yes" || s.ready === "no" ? s.ready : "all") as "yes" | "no" | "all",
    id: typeof s.id === "string" ? s.id : "",
    group: typeof s.group === "string" ? s.group : undefined,
  }),
});

type Row = {
  id: string; rms_id: string | null; title: string; slug: string | null;
  category: string | null; status: string; quantity: number | null;
  quantity_label: string | null; public_ready: boolean | null;
  images: string[] | null; upscaled_cover_url: string | null;
  updated_at: string; editorial_order: number | null;
};

const PAGE = 50;

function Inner() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const list = useServerFn(listProducts);
  const catsFn = useServerFn(listDistinctCategories);

  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(search.q);

  useEffect(() => { catsFn().then(setCats).catch(() => {}); }, [catsFn]);

  useEffect(() => {
    setLoading(true);
    list({ data: { search: search.q, category: search.cat || undefined, publicReady: search.ready, limit: PAGE, offset } })
      .then((r) => { setRows(r.rows as Row[]); setCount(r.count); })
      .finally(() => setLoading(false));
  }, [list, search.q, search.cat, search.ready, offset]);

  useEffect(() => { setOffset(0); }, [search.q, search.cat, search.ready]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (s: Record<string, unknown>) => ({ ...s, q: searchInput }) });
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-cream text-charcoal">
      <div className="px-6 lg:px-12 pt-8 pb-24 max-w-[1500px] mx-auto">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">Admin · Inventory</p>
          <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.02em]">Products</h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-charcoal/55">
            {count.toLocaleString()} record{count === 1 ? "" : "s"} · edits log to activity trail
          </p>
        </header>

        {/* filter row */}
        <form onSubmit={submitSearch} className="mb-6 flex flex-wrap items-center gap-3 border-y border-charcoal/10 py-3 text-[11px] uppercase tracking-[0.16em]">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title, RMS id, slug"
            className="flex-1 min-w-[260px] bg-transparent border-b border-charcoal/20 px-1 py-1 outline-none focus:border-charcoal"
          />
          <select
            value={search.cat}
            onChange={(e) => navigate({ search: (s: Record<string, unknown>) => ({ ...s, cat: e.target.value }) })}
            className="bg-transparent border border-charcoal/20 px-2 py-1 text-charcoal"
          >
            <option value="">All categories</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={search.ready}
            onChange={(e) => navigate({ search: (s: Record<string, unknown>) => ({ ...s, ready: e.target.value as "yes"|"no"|"all" }) })}
            className="bg-transparent border border-charcoal/20 px-2 py-1 text-charcoal"
          >
            <option value="all">All statuses</option>
            <option value="yes">Public-ready</option>
            <option value="no">Hidden</option>
          </select>
          <button type="submit" className="border border-charcoal px-3 py-1 hover:bg-charcoal hover:text-cream">Search</button>
        </form>

        {/* table */}
        <div className="border border-charcoal/10 bg-cream">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 border-b border-charcoal/10">
              <tr>
                <th className="text-left px-3 py-2 w-14"></th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Qty</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Public</th>
                <th className="text-left px-3 py-2">RMS</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-charcoal/40 text-[11px] uppercase tracking-[0.2em]">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-charcoal/40 text-[11px] uppercase tracking-[0.2em]">No products match</td></tr>
              )}
              {rows.map((r) => {
                const cover = r.upscaled_cover_url ?? (r.images?.[0] ?? null);
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate({ search: (s: Record<string, unknown>) => ({ ...s, id: r.id }) })}
                    className="border-b border-charcoal/5 hover:bg-charcoal/[0.03] cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      {cover ? <img src={cover} alt="" className="w-10 h-10 object-cover" loading="lazy" /> : <div className="w-10 h-10 bg-charcoal/5" />}
                    </td>
                    <td className="px-3 py-2 font-display text-[14px]">{r.title}</td>
                    <td className="px-3 py-2 text-charcoal/70">{r.category ?? "—"}</td>
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
          onClose={() => navigate({ search: (s: Record<string, unknown>) => ({ ...s, id: "" }) })}
          onSaved={() => {
            // refresh list
            list({ data: { search: search.q, category: search.cat || undefined, publicReady: search.ready, limit: PAGE, offset } })
              .then((r) => { setRows(r.rows as Row[]); setCount(r.count); });
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit drawer
// ---------------------------------------------------------------------------

type ProductRow = Record<string, unknown> & { id: string; title: string };

const FIELD_GROUPS: { label: string; fields: { key: string; type: "text" | "textarea" | "number" | "bool" | "url-list" | "select"; opts?: string[] }[] }[] = [
  {
    label: "Basics",
    fields: [
      { key: "title", type: "text" },
      { key: "slug", type: "text" },
      { key: "category", type: "text" },
      { key: "status", type: "select", opts: ["available", "sold", "hold", "draft"] },
      { key: "public_ready", type: "bool" },
      { key: "hidden_note", type: "text" },
    ],
  },
  {
    label: "Description",
    fields: [
      { key: "description", type: "textarea" },
      { key: "materials", type: "text" },
      { key: "origin", type: "text" },
    ],
  },
  {
    label: "Inventory",
    fields: [
      { key: "quantity", type: "number" },
      { key: "quantity_label", type: "text" },
      { key: "price", type: "number" },
      { key: "rms_id", type: "text" },
    ],
  },
  {
    label: "Dimensions",
    fields: [
      { key: "dimensions_raw", type: "text" },
      { key: "width_cm", type: "number" },
      { key: "height_cm", type: "number" },
      { key: "depth_cm", type: "number" },
      { key: "weight_kg", type: "number" },
    ],
  },
  {
    label: "Images",
    fields: [
      { key: "upscaled_cover_url", type: "text" },
      { key: "card_background_url", type: "text" },
      { key: "images", type: "url-list" },
    ],
  },
  {
    label: "Order & SEO",
    fields: [
      { key: "editorial_order", type: "number" },
      { key: "meta_title", type: "text" },
      { key: "meta_description", type: "textarea" },
      { key: "og_image", type: "text" },
    ],
  },
];

function EditDrawer({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const get = useServerFn(getProduct);
  const upd = useServerFn(updateProduct);
  const auditFn = useServerFn(listProductAudit);
  const [row, setRow] = useState<ProductRow | null>(null);
  const [patch, setPatch] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [audit, setAudit] = useState<Array<{ id: string; at: string; action: string; before: unknown; after: unknown; actor_id: string | null }>>([]);

  useEffect(() => {
    setRow(null); setPatch({}); setErr(null);
    get({ data: { id } }).then((r) => setRow(r as ProductRow)).catch((e) => setErr(String(e?.message ?? e)));
    auditFn({ data: { entityId: id, limit: 10 } }).then(setAudit).catch(() => {});
  }, [id, get, auditFn]);

  const dirty = Object.keys(patch).length > 0;
  const current = useMemo(() => ({ ...(row ?? {}), ...patch }) as ProductRow, [row, patch]);

  const setField = (key: string, val: unknown) => {
    setPatch((p) => {
      const next = { ...p };
      // if reverting to original, drop from patch
      if (row && JSON.stringify(row[key] ?? null) === JSON.stringify(val ?? null)) {
        delete next[key];
      } else {
        next[key] = val;
      }
      return next;
    });
  };

  const save = async () => {
    if (!dirty) return;
    setSaving(true); setErr(null);
    try {
      const updated = await upd({ data: { id, patch } });
      setRow(updated as ProductRow);
      setPatch({});
      onSaved();
      auditFn({ data: { entityId: id, limit: 10 } }).then(setAudit).catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button onClick={onClose} aria-label="Close" className="flex-1 bg-charcoal/40" />
      <aside className="w-full max-w-[720px] bg-cream border-l border-charcoal/15 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-cream border-b border-charcoal/10 px-6 py-4 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.24em] text-charcoal/45">Edit product</p>
            <h2 className="mt-1 font-display text-2xl truncate">{(current?.title as string) ?? "…"}</h2>
            <p className="mt-1 text-[10px] tabular-nums text-charcoal/40">{id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-charcoal/60 hover:text-charcoal px-2 py-1">Close</button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-[11px] uppercase tracking-[0.18em] border border-charcoal px-3 py-1 bg-charcoal text-cream disabled:opacity-30"
            >{saving ? "Saving…" : dirty ? `Save ${Object.keys(patch).length}` : "Saved"}</button>
          </div>
        </header>

        {err && <div className="mx-6 mt-4 p-3 border border-red-300 bg-red-50 text-[12px] text-red-800">{err}</div>}

        {!row && !err && <div className="p-10 text-[11px] uppercase tracking-[0.22em] text-charcoal/40">Loading…</div>}

        {row && (
          <div className="px-6 py-6 space-y-8">
            {FIELD_GROUPS.map((g) => (
              <section key={g.label}>
                <h3 className="text-[10px] uppercase tracking-[0.26em] text-charcoal/50 mb-3">{g.label}</h3>
                <div className="space-y-3">
                  {g.fields.map((f) => (
                    <FieldRow
                      key={f.key}
                      field={f}
                      value={current[f.key]}
                      changed={f.key in patch}
                      onChange={(v) => setField(f.key, v)}
                    />
                  ))}
                </div>
              </section>
            ))}

            <section>
              <h3 className="text-[10px] uppercase tracking-[0.26em] text-charcoal/50 mb-3">Recent activity</h3>
              {audit.length === 0 ? (
                <p className="text-[11px] text-charcoal/45">No changes logged yet.</p>
              ) : (
                <ul className="space-y-2 text-[11px]">
                  {audit.map((a) => {
                    const fields = a.after && typeof a.after === "object" ? Object.keys(a.after as Record<string, unknown>) : [];
                    return (
                      <li key={a.id} className="border-l-2 border-charcoal/15 pl-3 py-1">
                        <div className="flex justify-between gap-3">
                          <span className="uppercase tracking-[0.14em] text-charcoal/70">{a.action}</span>
                          <span className="tabular-nums text-charcoal/45">{new Date(a.at).toLocaleString()}</span>
                        </div>
                        {fields.length > 0 && (
                          <div className="text-charcoal/55 truncate">{fields.join(", ")}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function FieldRow({
  field, value, changed, onChange,
}: {
  field: { key: string; type: "text" | "textarea" | "number" | "bool" | "url-list" | "select"; opts?: string[] };
  value: unknown;
  changed: boolean;
  onChange: (v: unknown) => void;
}) {
  const label = field.key.replace(/_/g, " ");
  const cls = `w-full bg-transparent border ${changed ? "border-amber-500" : "border-charcoal/15"} px-2 py-1.5 text-[13px] focus:outline-none focus:border-charcoal`;
  return (
    <label className="grid grid-cols-[160px_1fr] gap-3 items-start">
      <span className="text-[10px] uppercase tracking-[0.18em] text-charcoal/55 pt-2">{label}</span>
      {field.type === "textarea" && (
        <textarea rows={4} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {field.type === "text" && (
        <input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)} className={cls} />
      )}
      {field.type === "number" && (
        <input
          type="number"
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={cls}
        />
      )}
      {field.type === "bool" && (
        <div className="pt-2">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        </div>
      )}
      {field.type === "select" && (
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={cls}>
          {(field.opts ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.type === "url-list" && (
        <textarea
          rows={4}
          value={Array.isArray(value) ? (value as string[]).join("\n") : ""}
          onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          placeholder="One URL per line"
          className={cls + " font-mono text-[11px]"}
        />
      )}
    </label>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, ImagePlus, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminOrRedirect } from "@/lib/admin-guard";
import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";
import {
  uploadItemImage,
  updateItemImages,
} from "@/lib/inventory-images.functions";

// ---------------------------------------------------------------------------
// /admin/upload-hero — One product, one new primary photo.
//
// Workflow: pick product → drop 4:3 render → confirm → uploads to
// `squarespace-mirror` bucket (via uploadItemImage) → prepends URL to
// inventory_items.images (via updateItemImages). Catalog re-bakes nightly /
// on demand. Cache-buster `?v=updated_at` on tile URLs already exists, so the
// new hero shows up on the live tile after the next bake without manual
// cache-bust steps.
//
// 4:3 enforcement is advisory, not blocking: we detect ratio client-side and
// surface a warning if it deviates from 4:3 ± 2%. The owner can override —
// some categories (chandeliers vertical, rugs flat-lay) intentionally break
// the rule and the staging law is enforced upstream in the generator, not
// here.
// ---------------------------------------------------------------------------

const TARGET_RATIO = 4 / 3;
const RATIO_TOLERANCE = 0.02; // ±2% counts as "4:3"

export const Route = createFileRoute("/admin/upload-hero")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Upload hero photo · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UploadHeroPage,
});

type PickerProduct = Pick<
  CollectionProduct,
  "id" | "slug" | "title" | "displayCategory" | "categorySlug" | "primaryImage"
>;

function UploadHeroPage() {
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<PickerProduct | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; url: string; deduped: boolean }
    | { kind: "err"; msg: string }
  >({ kind: "idle" });

  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useServerFn(uploadItemImage);
  const setImages = useServerFn(updateItemImages);

  // Load catalog once for the picker
  useEffect(() => {
    let cancelled = false;
    getCollectionCatalog().then((c) => {
      if (cancelled) return;
      setProducts(
        c.products.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          displayCategory: p.displayCategory,
          categorySlug: p.categorySlug,
          primaryImage: p.primaryImage,
        })),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Map<string, string>();
    products.forEach((p) => set.set(p.categorySlug, p.displayCategory));
    return Array.from(set, ([slug, label]) => ({ slug, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          (categoryFilter === "all" || p.categorySlug === categoryFilter) &&
          (q === "" ||
            p.title.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q)),
      )
      .slice(0, 200);
  }, [products, query, categoryFilter]);

  const resetFile = useCallback(() => {
    setFile(null);
    setDims(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStatus({ kind: "idle" });
  }, [preview]);

  const acceptFile = useCallback(
    (f: File) => {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (["heic", "heif"].includes(ext)) {
        setStatus({ kind: "err", msg: "HEIC isn't supported — export as JPG or PNG." });
        return;
      }
      if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type)) {
        setStatus({ kind: "err", msg: `Unsupported type: ${f.type || "unknown"}. Use JPG, PNG, WEBP, or AVIF.` });
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setStatus({ kind: "err", msg: "Over 10MB — compress or resize first." });
        return;
      }
      setFile(f);
      setStatus({ kind: "idle" });
      const url = URL.createObjectURL(f);
      setPreview(url);
      const img = new Image();
      img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
    },
    [],
  );

  const ratio = dims ? dims.w / dims.h : null;
  const ratioOk =
    ratio !== null && Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO <= RATIO_TOLERANCE;

  const handleConfirm = useCallback(async () => {
    if (!selected || !file) return;
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      // 1. Read file → base64
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(bin);

      // 2. Upload to storage (admin-gated server fn)
      const contentType = (file.type || "image/png") as
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "image/avif";
      const up = await upload({
        data: {
          id: selected.id,
          rmsId: selected.slug, // folder bucket
          filename: file.name,
          contentType,
          base64,
        },
      });

      // 3. Fetch current images for concurrency snapshot
      const { data: row, error: rowErr } = await supabase
        .from("inventory_items")
        .select("images, updated_at")
        .eq("id", selected.id)
        .single();
      if (rowErr || !row) throw new Error(rowErr?.message || "Could not load current images");
      const current = (row.images || []) as string[];
      const next = [up.url, ...current.filter((u) => u !== up.url)];

      // 4. Prepend new URL as primary
      await setImages({
        data: {
          id: selected.id,
          images: next,
          expectedLength: current.length,
          expectedUpdatedAt: row.updated_at,
        },
      });

      setStatus({ kind: "ok", url: up.url, deduped: up.deduped });
      resetFile();
    } catch (e) {
      setStatus({
        kind: "err",
        msg: e instanceof Error ? e.message : "Upload failed",
      });
    } finally {
      setBusy(false);
    }
  }, [selected, file, upload, setImages, resetFile]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-[28px] text-charcoal uppercase tracking-[0.04em]">
          Upload hero photo
        </h1>
        <p className="mt-2 text-[12px] uppercase tracking-[0.18em] text-charcoal/55">
          Pick a product · drop a 4:3 render · confirm. New image becomes the cover.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* LEFT — picker */}
        <section className="flex flex-col min-h-0">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or slug…"
                className="w-full pl-9 pr-3 py-2 text-[13px] uppercase tracking-[0.08em] border border-charcoal/15 bg-white focus:outline-none focus:border-charcoal/40"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] border border-charcoal/15 bg-white"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 max-h-[560px] overflow-y-auto border border-charcoal/10 divide-y divide-charcoal/5">
            {loading ? (
              <div className="p-4 text-[11px] uppercase tracking-[0.16em] text-charcoal/50 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading catalog…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-[11px] uppercase tracking-[0.16em] text-charcoal/50">
                No matches.
              </div>
            ) : (
              filtered.map((p) => {
                const active = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className={`w-full flex items-center gap-3 p-2 text-left hover:bg-charcoal/[0.03] transition-colors ${active ? "bg-charcoal/[0.06]" : ""}`}
                  >
                    <div className="h-12 w-12 shrink-0 bg-charcoal/[0.04] overflow-hidden">
                      {p.primaryImage?.url ? (
                        <img
                          src={p.primaryImage.url}
                          alt=""
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-charcoal truncate">{p.title}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-charcoal/45 truncate">
                        {p.displayCategory} · {p.slug}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-charcoal/40">
            {filtered.length} of {products.length} shown
          </div>
        </section>

        {/* RIGHT — selected + drop zone */}
        <section className="flex flex-col min-h-0">
          {!selected ? (
            <div className="border border-dashed border-charcoal/20 p-12 text-center text-[12px] uppercase tracking-[0.18em] text-charcoal/45">
              Pick a product to begin.
            </div>
          ) : (
            <>
              <div className="border border-charcoal/10 p-4 mb-4 flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 bg-charcoal/[0.04] overflow-hidden">
                  {selected.primaryImage?.url ? (
                    <img
                      src={selected.primaryImage.url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-charcoal/45">Current cover</div>
                  <div className="text-[15px] text-charcoal truncate">{selected.title}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-charcoal/45 truncate">{selected.slug}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelected(null); resetFile(); }}
                  className="text-charcoal/40 hover:text-charcoal"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) acceptFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                className={`relative aspect-[4/3] border-2 border-dashed cursor-pointer transition-colors flex items-center justify-center overflow-hidden bg-white ${
                  over ? "border-charcoal/60 bg-charcoal/[0.02]" : "border-charcoal/20 hover:border-charcoal/35"
                }`}
              >
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Preview"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                    {/* 4:3 safe-area overlay — only meaningful if image isn't 4:3 */}
                    {!ratioOk && (
                      <div className="absolute inset-0 ring-2 ring-amber-500/40 ring-inset pointer-events-none" />
                    )}
                  </>
                ) : (
                  <div className="text-center text-charcoal/50">
                    <ImagePlus className="h-8 w-8 mx-auto mb-3 text-charcoal/30" />
                    <div className="text-[12px] uppercase tracking-[0.18em]">Drop 4:3 render or click to choose</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-charcoal/40 mt-1">
                      JPG · PNG · WEBP · AVIF · up to 10MB
                    </div>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) acceptFile(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>

              {/* Ratio readout + actions */}
              {file && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 text-[11px] uppercase tracking-[0.16em]">
                    {dims ? (
                      ratioOk ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          4:3 · {dims.w}×{dims.h}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {ratio?.toFixed(2)}:1 · {dims.w}×{dims.h} · not 4:3
                        </span>
                      )
                    ) : (
                      <span className="text-charcoal/40">reading…</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={resetFile}
                    className="text-[11px] uppercase tracking-[0.16em] text-charcoal/55 hover:text-charcoal"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={busy}
                    className="px-5 py-2 bg-charcoal text-white text-[11px] uppercase tracking-[0.2em] hover:bg-charcoal/90 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {busy ? "Uploading…" : "Make primary"}
                  </button>
                </div>
              )}

              {status.kind === "err" && (
                <div className="mt-4 px-3 py-2 border border-red-200 bg-red-50 text-[11px] uppercase tracking-[0.14em] text-red-700">
                  {status.msg}
                </div>
              )}
              {status.kind === "ok" && (
                <div className="mt-4 px-3 py-2 border border-emerald-200 bg-emerald-50 text-[11px] uppercase tracking-[0.14em] text-emerald-700 inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {status.deduped ? "Already in storage — set as primary." : "Uploaded and set as primary."}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

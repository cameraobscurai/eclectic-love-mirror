// Inventory browser embedded inside /studio. Three modes: Browse (by
// category), Text (search by title), Visual (upload image → palette → match
// catalog by color tags). Clicked tiles pin/unpin via useInquiry().

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Image as ImageIcon, Grid as GridIcon, X, Check, Loader2, Upload } from "lucide-react";
import {
  getCollectionCatalog,
  type CollectionProduct,
  type CategoryFacet,
} from "@/lib/phase3-catalog";
import { rankByColorMatch } from "@/lib/visual-match";
import { analyzeMoodboard, type ColorInfo } from "@/lib/color-engine";
import { useInquiry } from "@/hooks/use-inquiry";
import { withCdnWidth } from "@/lib/image-url";

type Mode = "browse" | "text" | "visual";

interface Props {
  /** Seed palette from inspo uploads on /studio. If present, Visual tab
   *  auto-shows matches without requiring a second upload. */
  seedPalette?: ColorInfo[] | null;
}

const RESULT_LIMIT = 36;

export function StudioBrowser({ seedPalette }: Props) {
  const { has, toggle } = useInquiry();
  const [mode, setMode] = useState<Mode>("browse");
  const [products, setProducts] = useState<CollectionProduct[]>([]);
  const [facets, setFacets] = useState<CategoryFacet[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Text search
  const [q, setQ] = useState("");
  const [qCommitted, setQCommitted] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQCommitted(q.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [q]);

  // Visual search
  const [visualHexes, setVisualHexes] = useState<string[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualFileRef = useRef<HTMLInputElement>(null);

  // Auto-seed visual hexes from upstream palette
  useEffect(() => {
    if (seedPalette && seedPalette.length && !visualHexes) {
      setVisualHexes(seedPalette.slice(0, 5).map((c) => c.hex));
    }
  }, [seedPalette, visualHexes]);

  useEffect(() => {
    let alive = true;
    getCollectionCatalog().then((c) => {
      if (!alive) return;
      setProducts(c.products);
      setFacets(c.facets);
    });
    return () => { alive = false; };
  }, []);

  // Browse + Text filtering
  const filtered = useMemo(() => {
    let list = products;
    if (activeCat) list = list.filter((p) => p.categorySlug === activeCat);
    if (mode === "text" && qCommitted) {
      list = list
        .filter((p) => p.title.toLowerCase().includes(qCommitted))
        .sort((a, b) => {
          const ta = a.title.toLowerCase();
          const tb = b.title.toLowerCase();
          const ra = ta === qCommitted ? 0 : ta.startsWith(qCommitted) ? 1 : 2;
          const rb = tb === qCommitted ? 0 : tb.startsWith(qCommitted) ? 1 : 2;
          return ra - rb;
        });
    }
    return list.slice(0, RESULT_LIMIT);
  }, [products, activeCat, mode, qCommitted]);

  // Visual match
  const visualResults = useMemo(() => {
    if (mode !== "visual" || !visualHexes?.length) return [];
    return rankByColorMatch(products, visualHexes, RESULT_LIMIT).map((s) => s.product);
  }, [mode, visualHexes, products]);

  async function onVisualUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const url = URL.createObjectURL(file);
      try {
        const result = await analyzeMoodboard(
          [{ id: "vs", name: file.name, url }],
          canvasRef.current,
        );
        setVisualHexes(result.palette.slice(0, 5).map((c) => c.hex));
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setAnalyzeError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  const shown = mode === "visual" ? visualResults : filtered;

  return (
    <div>
      {/* Mode tabs */}
      <div className="flex gap-1 border-b border-charcoal/15 mb-5">
        <TabBtn active={mode === "browse"} onClick={() => setMode("browse")} icon={<GridIcon className="h-3 w-3" />}>Browse</TabBtn>
        <TabBtn active={mode === "text"} onClick={() => setMode("text")} icon={<Search className="h-3 w-3" />}>Search</TabBtn>
        <TabBtn active={mode === "visual"} onClick={() => setMode("visual")} icon={<ImageIcon className="h-3 w-3" />}>Visual</TabBtn>
      </div>

      {/* Mode-specific controls */}
      {mode === "browse" && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <CatPill active={!activeCat} onClick={() => setActiveCat(null)}>
            All · {products.length}
          </CatPill>
          {facets.map((f) => (
            <CatPill key={f.slug} active={activeCat === f.slug} onClick={() => setActiveCat(f.slug)}>
              {f.display} · {f.count}
            </CatPill>
          ))}
        </div>
      )}

      {mode === "text" && (
        <div className="mb-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal/40" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SEARCH THE COLLECTION…"
              className="w-full pl-9 pr-3 py-2.5 bg-transparent border border-charcoal/20 text-[11px] uppercase tracking-[0.18em] placeholder:text-charcoal/35 focus:outline-none focus:border-charcoal/60"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <CatPill active={!activeCat} onClick={() => setActiveCat(null)}>All</CatPill>
            {facets.map((f) => (
              <CatPill key={f.slug} active={activeCat === f.slug} onClick={() => setActiveCat(f.slug)}>
                {f.display}
              </CatPill>
            ))}
          </div>
        </div>
      )}

      {mode === "visual" && (
        <div className="mb-5">
          <div className="flex items-start gap-5 flex-wrap">
            <div>
              <input
                ref={visualFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onVisualUpload(f); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => visualFileRef.current?.click()}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-charcoal/30 text-[10px] uppercase tracking-[0.22em] hover:bg-charcoal hover:text-cream transition-colors disabled:opacity-40"
              >
                {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {analyzing ? "Reading…" : visualHexes ? "Upload Another" : "Upload Image"}
              </button>
              {seedPalette && seedPalette.length > 0 && (
                <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-charcoal/45">
                  Using palette from your inspo
                </p>
              )}
              {analyzeError && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-red-700/80">{analyzeError}</p>
              )}
            </div>

            {visualHexes && visualHexes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <p className="text-[9px] uppercase tracking-[0.22em] text-charcoal/45 mr-2">
                  Matching
                </p>
                {visualHexes.map((hex) => (
                  <div key={hex} className="text-center">
                    <div className="h-8 w-8 border border-charcoal/15" style={{ background: hex }} />
                    <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-charcoal/45 tabular-nums">{hex}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result grid */}
      {mode === "visual" && !visualHexes ? (
        <div className="py-16 text-center text-[11px] uppercase tracking-[0.22em] text-charcoal/40">
          Upload an image to find matching pieces
        </div>
      ) : shown.length === 0 ? (
        <div className="py-16 text-center text-[11px] uppercase tracking-[0.22em] text-charcoal/40">
          No matches
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {shown.map((p) => (
            <BrowserTile
              key={p.id}
              product={p}
              pinned={has(String(p.id))}
              onToggle={() => toggle(String(p.id))}
            />
          ))}
        </ul>
      )}

      {shown.length >= RESULT_LIMIT && (
        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
          Showing first {RESULT_LIMIT} · refine to see more
        </p>
      )}
    </div>
  );
}

function BrowserTile({
  product,
  pinned,
  onToggle,
}: {
  product: CollectionProduct;
  pinned: boolean;
  onToggle: () => void;
}) {
  const src = product.primaryImage?.url;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={pinned}
        className="group block w-full text-left"
      >
        <div className={`relative aspect-square bg-white overflow-hidden border transition-colors ${pinned ? "border-charcoal" : "border-charcoal/10 hover:border-charcoal/40"}`}>
          {src ? (
            <img
              src={withCdnWidth(src, 400)}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain p-2"
            />
          ) : (
            <div className="absolute inset-0 bg-charcoal/[0.03]" />
          )}
          <div className={`absolute top-1.5 right-1.5 h-5 w-5 grid place-items-center transition-all ${pinned ? "bg-charcoal text-cream" : "bg-cream/90 text-charcoal opacity-0 group-hover:opacity-100"}`}>
            {pinned ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 rotate-45" />}
          </div>
        </div>
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-charcoal/70 line-clamp-1">
          {product.title}
        </p>
      </button>
    </li>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.22em] border-b-2 -mb-px transition-colors ${active ? "border-charcoal text-charcoal" : "border-transparent text-charcoal/45 hover:text-charcoal"}`}
    >
      {icon}{children}
    </button>
  );
}

function CatPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] border transition-colors ${active ? "bg-charcoal text-cream border-charcoal" : "bg-transparent text-charcoal/65 border-charcoal/20 hover:border-charcoal/50"}`}
    >
      {children}
    </button>
  );
}

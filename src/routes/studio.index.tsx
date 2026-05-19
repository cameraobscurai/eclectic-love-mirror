// Public /studio — client-facing Style Brief.
// Visitor drops 1–8 inspo images, generates a palette client-side via
// analyzeMoodboard(), fills basic event details, and submits.
// Submission lands in public.inquiries (same table as /contact).

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ImagePlus, Sparkles, X, ArrowRight } from "lucide-react";

import { analyzeMoodboard, type AnalysisResult } from "@/lib/color-engine";
import { useInquiry } from "@/hooks/use-inquiry";
import { getCollectionCatalog, type CollectionProduct } from "@/lib/phase3-catalog";
import { signPublicInspoUpload, submitStyleBrief } from "@/server/style-brief.functions";
import { StudioBrowser } from "@/components/studio/StudioBrowser";

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: "Studio · Build Your Style Brief — Eclectic Hive" },
      {
        name: "description",
        content:
          "Drop inspiration images, see your palette, send your vision to Eclectic Hive — Denver's luxury event design studio.",
      },
      { property: "og:title", content: "Studio — Eclectic Hive" },
      { property: "og:description", content: "Build your style brief in minutes." },
    ],
  }),
  component: StudioPage,
});

interface InspoLocal {
  id: string;
  file: File;
  url: string; // local object URL
}

const SCOPE_OPTIONS = [
  "Full-service design + production",
  "Design + fabrication",
  "Rental from Collection",
  "Not sure yet",
] as const;
const BUDGET_RANGES = [
  "Under $25k",
  "$25k – $75k",
  "$75k – $150k",
  "$150k – $300k",
  "$300k+",
  "Not sure yet",
] as const;

const MAX_INSPO = 8;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function StudioPage() {
  const navigate = useNavigate();
  const { ids: pinnedIds, remove: unpin, clear: clearInquiry } = useInquiry();

  const [inspo, setInspo] = useState<InspoLocal[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [scope, setScope] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [vibe, setVibe] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  // Resolve pinned pieces to titles + thumbnails for the strip.
  const [catalog, setCatalog] = useState<Map<string, CollectionProduct>>(new Map());
  useEffect(() => {
    let alive = true;
    getCollectionCatalog().then(({ products }) => {
      if (!alive) return;
      const m = new Map<string, CollectionProduct>();
      for (const p of products) m.set(String(p.id), p);
      setCatalog(m);
    });
    return () => { alive = false; };
  }, []);

  // Cleanup object URLs.
  useEffect(() => {
    return () => { inspo.forEach((i) => URL.revokeObjectURL(i.url)); };
  }, [inspo]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files)
      .filter((f) => f.type.startsWith("image/") && f.size <= MAX_FILE_BYTES)
      .slice(0, MAX_INSPO - inspo.length);
    if (!arr.length) return;
    const next = arr.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      url: URL.createObjectURL(f),
    }));
    setInspo((s) => [...s, ...next]);
    setAnalysis(null); // palette stale once images change
  }

  function removeInspo(id: string) {
    setInspo((s) => {
      const t = s.find((x) => x.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return s.filter((x) => x.id !== id);
    });
    setAnalysis(null);
  }

  async function generate() {
    if (!inspo.length && !pinnedIds.length) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    const blobUrls: string[] = [];
    try {
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");

      // Pull the actual primary photo for every pinned piece and analyze it
      // pixel-by-pixel — never rely on pre-tagged colorHex. Fetch as a blob
      // so the canvas is guaranteed CORS-clean (the collection grid may have
      // cached the same URL without crossOrigin, which would taint a direct
      // <img> load).
      const pinnedProducts = pinnedIds
        .map((id) => catalog.get(id))
        .filter((p): p is CollectionProduct => Boolean(p?.primaryImage?.url));

      const pinnedFetches = await Promise.all(
        pinnedProducts.map(async (p) => {
          try {
            const res = await fetch(p.primaryImage!.url, { mode: "cors", cache: "reload" });
            if (!res.ok) return null;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            blobUrls.push(url);
            return { id: `pin:${p.id}`, name: p.title, url };
          } catch {
            return null;
          }
        }),
      );

      const moodImages = [
        ...inspo.map((i) => ({ id: i.id, name: i.file.name, url: i.url })),
        ...pinnedFetches.filter((x): x is { id: string; name: string; url: string } => Boolean(x)),
      ];

      if (!moodImages.length) {
        setAnalyzeError("Could not load selected images for analysis.");
        return;
      }

      const result = await analyzeMoodboard(moodImages, canvasRef.current);
      setAnalysis({
        palette: result.palette.slice(0, 8),
        tones: result.tones,
        insights: result.insights,
        perImage: result.perImage,
      });
    } catch (e) {
      setAnalyzeError((e as Error).message);
    } finally {
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
      setAnalyzing(false);
    }
  }

  const canSubmit = name.trim() && /^\S+@\S+\.\S+$/.test(email) && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Upload each inspo file via signed URL.
      const inspoPaths: string[] = [];
      for (const i of inspo) {
        const ext = (i.file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const { uploadUrl, storage_path } = await signPublicInspoUpload({ data: { ext } });
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": i.file.type, "x-upsert": "true" },
          body: i.file,
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        inspoPaths.push(storage_path);
      }

      // 2. Insert inquiry row.
      const { inquiryId } = await submitStyleBrief({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          eventDate: eventDate.trim(),
          scope,
          budget,
          vibe: vibe.trim(),
          paletteHex: (analysis?.palette ?? []).slice(0, 8).map((c) => c.hex),
          tones: (analysis?.tones ?? {}) as Record<string, number>,
          insightTitles: (analysis?.insights ?? []).slice(0, 6).map((i) => i.title),
          inspoPaths,
          pinnedIds,
          website,
        },
      });

      clearInquiry();
      navigate({ to: "/studio/thanks", search: { inquiry: inquiryId } });
    } catch (e) {
      setSubmitError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      {/* MASTHEAD */}
      <header className="px-6 lg:px-16 pt-20 pb-10 border-b border-charcoal/10">
        <p className="text-[10px] uppercase tracking-[0.32em] text-charcoal/45">Studio</p>
        <h1 className="mt-3 font-display text-4xl lg:text-5xl uppercase tracking-[0.04em]">
          Build Your Style Brief
        </h1>
        <p className="mt-4 max-w-xl text-[11px] uppercase tracking-[0.18em] text-charcoal/55 leading-relaxed">
          Drop the images that move you. See your palette. Send us your vision.
        </p>
      </header>

      {/* TOOLS — keep 3D viewer discoverable */}
      <nav className="px-6 lg:px-16 py-5 border-b border-charcoal/10 flex flex-wrap gap-x-8 gap-y-2 text-[10px] uppercase tracking-[0.28em]">
        <Link to="/studio/three" className="text-charcoal hover:opacity-60 inline-flex items-center gap-2">
          3D Viewer <ArrowRight className="h-3 w-3" />
        </Link>
        <Link to="/studio/lab" className="text-charcoal/55 hover:text-charcoal inline-flex items-center gap-2">
          Creative Lab
        </Link>
        <span className="text-charcoal/35 ml-auto hidden md:inline">Below: Style Brief</span>
      </nav>

      <form onSubmit={submit} className="px-6 lg:px-16 pb-24">
        {/* STEP 1 — INSPO */}
        <Step n={1} title="Drop Inspiration">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
          />
          <div
            onClick={() => inspo.length < MAX_INSPO && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className={`border border-dashed border-charcoal/25 min-h-[140px] grid place-items-center cursor-pointer transition-colors hover:border-charcoal/50 hover:bg-charcoal/[0.02] ${inspo.length >= MAX_INSPO ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex flex-col items-center gap-2 py-6">
              <ImagePlus className="h-6 w-6 text-charcoal/40" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/65">
                Drop images or click to browse
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/40">
                {inspo.length} / {MAX_INSPO} · 8MB max each
              </p>
            </div>
          </div>

          {inspo.length > 0 && (
            <div className="mt-4 grid grid-cols-4 md:grid-cols-8 gap-2">
              {inspo.map((i) => (
                <div key={i.id} className="relative aspect-square bg-charcoal/5 overflow-hidden group">
                  <img src={i.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeInspo(i.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-charcoal/80 text-cream grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </Step>

        {/* STEP 2 — BROWSE INVENTORY */}
        <Step n={2} title="Browse The Collection">
          <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/55 mb-5 max-w-xl">
            Pin pieces that fit your vision. Search by name, browse by category, or match by image.
          </p>
          <StudioBrowser seedPalette={analysis?.palette ?? null} />
        </Step>

        {/* STEP 3 — GENERATE PALETTE (from inspo + pinned furniture) */}
        <Step n={3} title="Generate Your Palette">
          <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/55 mb-4 max-w-xl">
            {pinnedIds.length > 0 && inspo.length > 0
              ? `Pulling colors from ${inspo.length} inspiration ${inspo.length === 1 ? "image" : "images"} + ${pinnedIds.length} pinned ${pinnedIds.length === 1 ? "piece" : "pieces"}.`
              : pinnedIds.length > 0
              ? `Pulling colors from your ${pinnedIds.length} pinned ${pinnedIds.length === 1 ? "piece" : "pieces"}.`
              : inspo.length > 0
              ? `Pulling colors from your ${inspo.length} inspiration ${inspo.length === 1 ? "image" : "images"}.`
              : "Pin pieces above or drop inspiration images to generate a palette."}
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={(!inspo.length && !pinnedIds.length) || analyzing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-charcoal text-cream text-[11px] uppercase tracking-[0.22em] disabled:opacity-40 hover:bg-charcoal/85 transition-colors"
          >
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {analyzing ? "Reading…" : analysis ? "Re-generate Palette" : "Generate Palette"}
          </button>
          {analyzeError && (
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-red-700/80">{analyzeError}</p>
          )}

          {analysis && (
            <div className="mt-8">
              <div className="flex gap-1">
                {analysis.palette.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex-1 group">
                    <div className="h-20 w-full" style={{ background: c.hex }} aria-label={c.hex} />
                    <p className="mt-1.5 text-[9px] uppercase tracking-[0.18em] text-charcoal/50 tabular-nums text-center">
                      {c.hex}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 max-w-xl">
                <ToneBar label="Warm" v={analysis.tones.warm} />
                <ToneBar label="Cool" v={analysis.tones.cool} />
                <ToneBar label="Light" v={analysis.tones.light} />
                <ToneBar label="Muted" v={analysis.tones.muted} />
              </div>

              {analysis.insights.slice(0, 2).length > 0 && (
                <div className="mt-6 space-y-2 max-w-xl">
                  {analysis.insights.slice(0, 2).map((ins, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-t border-charcoal/10">
                      <span className="text-base leading-none mt-0.5">{ins.icon}</span>
                      <div className="text-[11px] leading-relaxed text-charcoal/75">
                        <span className="font-display uppercase tracking-[0.14em] text-[12px] text-charcoal">{ins.title}</span>
                        <span className="block mt-0.5 normal-case font-sans text-charcoal/70">{ins.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Step>

        {/* STEP 4 — DETAILS */}
        <Step n={4} title="Your Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 max-w-2xl">
            <Field label="Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </Field>
            <Field label="Email *">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Event date">
              <input
                type="text"
                placeholder="Approx — e.g. Sept 2026"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Scope">
              <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {SCOPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Budget">
              <select value={budget} onChange={(e) => setBudget(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-6 max-w-2xl">
            <Field label="Vision Notes">
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                rows={5}
                placeholder="Mood, references, must-haves, no-gos…"
                className={`${inputCls} resize-none normal-case`}
              />
            </Field>
          </div>

          {/* Pinned pieces strip */}
          {pinnedIds.length > 0 && (
            <div className="mt-8 max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45 mb-3">
                Pieces You Pinned ({pinnedIds.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {pinnedIds.map((id) => {
                  const p = catalog.get(id);
                  return (
                    <div key={id} className="flex items-center gap-2 border border-charcoal/15 pl-1 pr-2 py-1">
                      {p?.primaryImage?.url ? (
                        <img src={p.primaryImage.url} alt="" className="w-8 h-8 object-cover bg-charcoal/5" />
                      ) : (
                        <span className="w-8 h-8 bg-charcoal/5" />
                      )}
                      <span className="text-[11px] font-sans normal-case max-w-[160px] truncate">
                        {p?.title ?? id.slice(0, 8)}
                      </span>
                      <button
                        type="button"
                        onClick={() => unpin(id)}
                        className="text-charcoal/40 hover:text-charcoal text-xs ml-1"
                        aria-label="Unpin"
                      >×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Honeypot */}
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] w-0 h-0 opacity-0"
          />

          <div className="mt-10 flex items-center gap-4 flex-wrap">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal text-cream text-[11px] uppercase tracking-[0.24em] disabled:opacity-40 hover:bg-charcoal/85 transition-colors"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              {submitting ? "Sending…" : "Submit Brief"}
            </button>
            <Link to="/contact" className="text-[10px] uppercase tracking-[0.22em] text-charcoal/55 hover:text-charcoal underline-offset-4 hover:underline">
              Or use the standard contact form
            </Link>
          </div>
          {submitError && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-red-700/80">{submitError}</p>
          )}
        </Step>
      </form>
    </div>
  );
}

// ── presentational ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-transparent border-b border-charcoal/20 px-0 py-2 text-[13px] font-sans normal-case placeholder:text-charcoal/35 focus:outline-none focus:border-charcoal/60 transition-colors";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="pt-12">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-[10px] uppercase tracking-[0.3em] text-charcoal/40 tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="font-display text-xl uppercase tracking-[0.06em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/50">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ToneBar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-[0.22em] text-charcoal/55 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{v}%</span>
      </div>
      <div className="h-1 bg-charcoal/10">
        <div className="h-full bg-charcoal" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}


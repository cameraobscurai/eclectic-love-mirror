// Public /studio — client-facing Style Brief.
// Visitor drops 1–8 inspo images, generates a palette client-side via
// analyzeMoodboard(), fills basic event details, and submits.
// Submission lands in public.inquiries (same table as /contact).

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ImagePlus, Sparkles, X, ArrowRight, Download } from "lucide-react";

import { analyzeMoodboard, type AnalysisResult } from "@/lib/color-engine";
import { useInquiry } from "@/hooks/use-inquiry";
import { getCollectionCatalog, type CollectionProduct } from "@/lib/phase3-catalog";
import { signPublicInspoUpload, submitStyleBrief } from "@/lib/style-brief.functions";
import { CollectionPicker } from "@/components/studio/CollectionPicker";
import { downloadDeckPDF } from "@/lib/board-export";

export const Route = createFileRoute("/stylebrief/")({
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
    links: [
      {
        rel: "preload",
        as: "image",
        href: "/media/stylebrief/howto-poster.jpg",
        fetchPriority: "high" as const,
      },
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
  const [downloading, setDownloading] = useState(false);
  const briefRef = useRef<HTMLElement | null>(null);


  // Form fields — hydrated from sessionStorage so a re-render, accidental
  // reload, or browser Back doesn't blank them out.
  const STORAGE_KEY = "stylebrief:contact";
  const initial = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, string>) : null;
    } catch {
      return null;
    }
  })();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? "");
  const [scope, setScope] = useState<string>(initial?.scope ?? "");
  const [budget, setBudget] = useState<string>(initial?.budget ?? "");
  const [vibe, setVibe] = useState(initial?.vibe ?? "");
  const [website, setWebsite] = useState(""); // honeypot — never persisted

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name, email, phone, eventDate, scope, budget, vibe }),
      );
    } catch {
      /* quota / private mode — non-fatal */
    }
  }, [name, email, phone, eventDate, scope, budget, vibe]);

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

  // Cleanup object URLs only on unmount. Using a ref + empty-deps effect
  // avoids the React 19 StrictMode double-mount issue where a deps-based
  // cleanup would revoke URLs immediately after creation, breaking previews.
  const inspoRef = useRef<InspoLocal[]>([]);
  useEffect(() => { inspoRef.current = inspo; }, [inspo]);
  useEffect(() => {
    return () => { inspoRef.current.forEach((i) => URL.revokeObjectURL(i.url)); };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    // Server whitelists JPEG/PNG/WebP/AVIF only. Accepting "image/*" here
    // lets iPhone HEIC through, then the server rejects mid-upload with no
    // user-visible reason. Reject at the picker with a clear message.
    const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    const raw = Array.from(files);
    const rejected = raw.filter((f) => !ALLOWED.has(f.type) || f.size > MAX_FILE_BYTES);
    const arr = raw
      .filter((f) => ALLOWED.has(f.type) && f.size <= MAX_FILE_BYTES)
      .slice(0, MAX_INSPO - inspo.length);
    if (rejected.length) {
      const heic = rejected.some((f) => /heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name));
      setSubmitError(
        heic
          ? "HEIC/HEIF not supported yet — on iPhone: Photos → Share → Options → Most Compatible, then re-upload as JPG."
          : "Some files were skipped: use JPG, PNG, WebP, or AVIF under 8 MB.",
      );
    } else {
      setSubmitError(null);
    }
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
        const { uploadUrl, storage_path } = await signPublicInspoUpload({
          data: { ext, mime: i.file.type || "application/octet-stream", size: i.file.size },
        });
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": i.file.type, "x-upsert": "false" },
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

      // 3. Fire-and-forget owner + submitter email notification with palette + inspo.
      // Failure here doesn't block the user — the inquiry is already saved.
      const pinnedSnapshots = pinnedIds
        .map((id) => catalog.get(id))
        .filter(Boolean)
        .slice(0, 50)
        .map((p) => ({
          rms_id: String(p!.id),
          title: p!.title,
          category: (p as any)?.displayCategory ?? null,
          image_url: p!.primaryImage?.url ?? null,
        }));
      fetch("/api/public/notify-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          subject: "Style Brief",
          message: vibe.trim() || null,
          project_date: eventDate.trim() || null,
          budget: budget || null,
          scope: scope || null,
          items: pinnedSnapshots,
          inquiry_id: inquiryId,
          palette: (analysis?.palette ?? []).slice(0, 8).map((c) => c.hex),
          tones: (analysis?.tones ?? {}) as Record<string, number>,
          insights: (analysis?.insights ?? []).slice(0, 6).map((i) => i.title),
          inspo_paths: inspoPaths,
        }),
      }).catch((err) => console.warn("notify-inquiry failed", err));

      clearInquiry();
      try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      navigate({ to: "/stylebrief/thanks", search: { inquiry: inquiryId } });
    } catch (e) {
      setSubmitError((e as Error).message);
      setSubmitting(false);
    }
  }

  async function downloadBrief() {
    if (!briefRef.current || downloading) return;
    setDownloading(true);
    setSubmitError(null);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const slug = (name.trim() || "brief").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brief";
      await downloadDeckPDF(briefRef.current, `eclectic-hive-${slug}-${stamp}.pdf`);
    } catch (err) {
      console.warn("brief download failed", err);
      setSubmitError(`Download failed: ${(err as Error).message || "unknown error"}`);
    } finally {
      setDownloading(false);
    }
  }

  const canDownload = !!analysis || pinnedIds.length > 0 || inspo.length > 0 || name.trim().length > 0;

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      {/* MASTHEAD */}
      <header className="fluid-canvas pt-28 lg:pt-36 pb-16 lg:pb-20 border-b border-charcoal/10">
        <p className="text-[10px] uppercase tracking-[0.32em] text-charcoal/45">Studio</p>
        <h1 className="mt-4 font-display text-4xl lg:text-6xl uppercase tracking-[0.04em]">
          BUILD YOUR STYLE BRIEF
        </h1>
        <p className="mt-5 max-w-xl text-[11px] uppercase tracking-[0.18em] text-charcoal/55 leading-relaxed">
          Drop the images that move you. See your palette. Send us your vision.
        </p>
      </header>
      {/* WALKTHROUGH — real first-person UI flow, not an abstract intro */}
      <section className="fluid-canvas pt-10 lg:pt-14 pb-10 lg:pb-14 border-b border-charcoal/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          <div className="lg:col-span-3">
            <p className="text-[10px] uppercase tracking-[0.32em] text-charcoal/45">How it works</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-charcoal/65 leading-relaxed">
              Drop. Palette. Pin. Send. A real walk-through of the form below — no extra steps.
            </p>
          </div>
          <div className="lg:col-span-9">
            <div
              className="relative w-full overflow-hidden ring-1 ring-charcoal/10 aspect-[4/5] sm:aspect-[3/2] lg:aspect-[16/9]"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--charcoal) 8%, var(--cream)) 0%, color-mix(in oklab, var(--charcoal) 4%, var(--cream)) 100%)",
              }}
            >
              <video
                src="/video/stylebrief-howto.mp4"
                poster="/media/stylebrief/howto-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="A walk-through of the Eclectic Hive style brief workflow"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      {/* TOOLS — single quiet entry to the 3D viewer */}
      <div className="fluid-canvas pt-3 pb-2 flex justify-end">
        <Link
          to="/stylebrief/three"
          className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45 hover:text-charcoal inline-flex items-center gap-2"
        >
          3D Viewer <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <form onSubmit={submit} className="fluid-canvas pb-32">

        {/* STEP 1 — INSPO */}
        <Step n={1} title="Drop Your Inspo Images">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
          />
          <div
            onClick={() => inspo.length < MAX_INSPO && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className={`border border-dashed border-charcoal/25 min-h-[200px] lg:min-h-[280px] grid place-items-center cursor-pointer transition-colors hover:border-charcoal/50 hover:bg-charcoal/[0.02] ${inspo.length >= MAX_INSPO ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex flex-col items-center gap-3 py-10 lg:py-16">
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
            <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 lg:gap-3">
              {inspo.map((i) => (
                <div key={i.id} className="relative aspect-square bg-charcoal/5 overflow-hidden group">
                  <img src={i.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeInspo(i.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-charcoal/80 text-cream grid place-items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
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
        <Step n={2} title="Browse Our Collection">
          <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/55 mb-5 max-w-xl">
            Pin pieces that fit your vision. Search by name, browse our collection, or match by image.
          </p>
          <CollectionPicker />
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
              : "Pin pieces above or drop your inspo images to generate a palette."}
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
            <div className="mt-14 space-y-14">
              {/* COMBINED PALETTE */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45 mb-3">
                  Combined Palette
                </p>
                <div className="flex gap-0.5 lg:gap-1">
                  {analysis.palette.slice(0, 8).map((c, i) => (
                    <div key={i} className="flex-1">
                      <div className="h-20 lg:h-40 lg:h-40 w-full" style={{ background: c.hex }} aria-label={c.hex} />
                      <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-charcoal/50 tabular-nums text-center">
                        {c.hex}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PER-IMAGE PALETTES */}
              {analysis.perImage.length > 1 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/45 mb-3">
                    Per Image
                  </p>
                  <div className="space-y-4">
                    {analysis.perImage.map((pi) => {
                      const inspoHit = inspo.find((i) => i.id === pi.id);
                      const pinId = pi.id.startsWith("pin:") ? pi.id.slice(4) : null;
                      const pinHit = pinId ? catalog.get(pinId) : null;
                      const thumb = inspoHit?.url ?? pinHit?.primaryImage?.url ?? null;
                      return (
                        <div key={pi.id} className="flex items-center gap-3">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-14 h-14 object-cover bg-charcoal/5 flex-shrink-0" />
                          ) : (
                            <span className="w-14 h-14 bg-charcoal/5 flex-shrink-0" />
                          )}
                          <div className="flex gap-1 flex-1">
                            {pi.colors.slice(0, 5).map((c, i) => (
                              <div key={i} className="flex-1">
                                <div className="h-10 w-full" style={{ background: c.hex }} aria-label={c.hex} />
                                <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-charcoal/50 tabular-nums text-center">
                                  {c.hex}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Step>

        {/* STEP 4 — DETAILS */}
        <Step n={4} title="Your Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 max-w-2xl">
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

          {/* BRIEF PREVIEW — editorial proposal sheet */}
          {(() => {
            const stamp = new Intl.DateTimeFormat("en-US", {
              month: "2-digit", day: "2-digit", year: "2-digit",
            }).format(new Date()).replace(/\//g, ".");
            const palette = analysis?.palette.slice(0, 8) ?? [];
            const inspoThumbs = inspo.slice(0, 6);
            const pinnedThumbs = pinnedIds.slice(0, 6).map((id) => catalog.get(id)).filter(Boolean) as CollectionProduct[];
            const Ghost = () => (
              <span className="text-charcoal/30 border-b border-dashed border-charcoal/25 pb-0.5">— REQUIRED —</span>
            );
            const rows: Array<{ label: string; node: React.ReactNode; alignTop?: boolean }> = [
              { label: "For", node: name.trim() ? <span className="text-charcoal">{name.trim()}</span> : <Ghost /> },
              { label: "Email", node: email.trim()
                ? <span className="text-charcoal normal-case tracking-normal">{email.trim()}</span>
                : <Ghost /> },
            ];
            if (phone.trim()) rows.push({ label: "Phone", node: <span className="text-charcoal tabular-nums tracking-normal normal-case">{phone.trim()}</span> });
            if (eventDate.trim()) rows.push({ label: "Event Date", node: <span className="text-charcoal tabular-nums">{eventDate.trim()}</span> });
            if (scope) rows.push({ label: "Scope", node: <span className="text-charcoal">{scope}</span> });
            if (budget) rows.push({ label: "Budget", node: <span className="text-charcoal">{budget}</span> });
            rows.push({
              label: "Your Inspo Images",
              node: (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-charcoal tabular-nums">{String(inspo.length).padStart(2, "0")}</span>
                  {inspoThumbs.length > 0 && (
                    <div className="flex gap-1">
                      {inspoThumbs.map((i) => (
                        <img key={i.id} src={i.url} alt="" className="w-7 h-7 object-cover bg-charcoal/5 border border-charcoal/10" />
                      ))}
                      {inspo.length > 6 && (
                        <span className="text-[9px] tracking-[0.18em] text-charcoal/45 self-center pl-1 tabular-nums">+{inspo.length - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              ),
            });
            rows.push({
              label: "Pinned",
              node: (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-charcoal tabular-nums">{String(pinnedIds.length).padStart(2, "0")}</span>
                  {pinnedThumbs.length > 0 && (
                    <div className="flex gap-1">
                      {pinnedThumbs.map((p) => (
                        p.primaryImage?.url
                          ? <img key={p.id} src={p.primaryImage.url} alt="" className="w-7 h-7 object-cover bg-charcoal/5 border border-charcoal/10" />
                          : <span key={p.id} className="w-7 h-7 bg-charcoal/5 border border-charcoal/10" />
                      ))}
                      {pinnedIds.length > 6 && (
                        <span className="text-[9px] tracking-[0.18em] text-charcoal/45 self-center pl-1 tabular-nums">+{pinnedIds.length - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              ),
            });
            rows.push({
              label: "Color Palette",
              alignTop: true,
              node: (
                <div>
                  <div className="flex">
                    {palette.length > 0
                      ? palette.map((c, i) => (
                          <span key={i} className="w-10 h-10 inline-block" style={{ background: c.hex }} title={c.hex} />
                        ))
                      : Array.from({ length: 8 }).map((_, i) => (
                          <span key={i} className="w-10 h-10 inline-block border border-charcoal/10 -ml-px first:ml-0" />
                        ))}
                  </div>
                  {palette.length > 0 && (
                    <div className="flex mt-1.5">
                      {palette.map((c, i) => (
                        <span key={i} className="w-10 text-center text-[9px] tracking-[0.06em] tabular-nums text-charcoal/45 normal-case">
                          {c.hex.replace("#", "").toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ),
            });
            if (vibe.trim()) {
              rows.push({
                label: "Vision",
                alignTop: true,
                node: (
                  <blockquote className="border-l border-charcoal/25 pl-4 italic font-display text-[15px] normal-case tracking-normal leading-snug text-charcoal">
                    {vibe.trim()}
                  </blockquote>
                ),
              });
            }
            return (
              <article
                ref={briefRef}
                data-board-page="1"
                className="mt-12 relative border border-charcoal/15 bg-cream px-8 lg:px-14 py-12 lg:py-16 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                {/* Top chrome */}
                <div className="absolute top-4 left-8 right-8 lg:left-14 lg:right-14 flex justify-between text-[10px] tracking-[0.32em] text-charcoal/45 tabular-nums">
                  <span>STYLE BRIEF · DRAFT</span>
                  <span>{stamp}</span>
                </div>
                {/* Bottom chrome */}
                <div className="absolute bottom-4 left-8 right-8 lg:left-14 lg:right-14 flex justify-between text-[10px] tracking-[0.32em] text-charcoal/45 tabular-nums">
                  <span>ECLECTIC HIVE · STUDIO</span>
                  <span>01 / 01</span>
                </div>

                <dl className="grid grid-cols-[90px_1fr] sm:grid-cols-[140px_1fr] lg:grid-cols-[150px_1fr] gap-x-4 sm:gap-x-6 text-[11px] uppercase tracking-[0.18em]">
                  {rows.map((row, i) => {
                    const n = String(i + 1).padStart(2, "0");
                    const border = i === 0 ? "" : "border-t border-charcoal/10 pt-3 mt-3";
                    return (
                      <Fragment key={row.label}>
                        <dt className={`text-charcoal/45 ${border} ${row.alignTop ? "self-start" : ""}`}>
                          <span className="tabular-nums tracking-normal text-charcoal/30 mr-2">{n}</span>
                          {row.label}
                        </dt>
                        <dd className={border}>{row.node}</dd>
                      </Fragment>
                    );
                  })}
                </dl>
              </article>
            );
          })()}

          <div className="mt-12">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-charcoal text-cream text-[11px] uppercase tracking-[0.24em] disabled:opacity-40 hover:bg-charcoal/85 transition-colors"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                {submitting ? "Sending…" : "Submit Brief"}
              </button>
              <button
                type="button"
                onClick={downloadBrief}
                disabled={!canDownload || downloading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-charcoal/30 text-charcoal text-[11px] uppercase tracking-[0.24em] disabled:opacity-40 hover:bg-charcoal/[0.04] transition-colors"
              >
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {downloading ? "Building PDF…" : "Download Brief"}
              </button>
            </div>
            <p className="mt-5">
              <Link to="/contact" className="text-[10px] uppercase tracking-[0.22em] text-charcoal/55 hover:text-charcoal underline-offset-4 hover:underline">
                Or use the standard contact form
              </Link>
            </p>
          </div>
          {submitError && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-red-700/80">{submitError}</p>
          )}
        </Step>
      </form>
    </div>
  )
}

// ── presentational ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-transparent border-b border-charcoal/20 px-0 py-2 text-[13px] font-sans normal-case placeholder:text-charcoal/35 focus:outline-none focus:border-charcoal/60 transition-colors";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-charcoal/10 first:border-t-0 pt-16 lg:pt-28 first:pt-16 lg:first:pt-20">
      <div className="flex items-baseline gap-5 mb-10">
        <span className="text-[10px] uppercase tracking-[0.3em] text-charcoal/40 tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="font-display text-2xl lg:text-3xl uppercase tracking-[0.04em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/50">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}




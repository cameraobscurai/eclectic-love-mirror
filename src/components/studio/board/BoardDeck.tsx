// Editorial deck renderer for /studio/<token>. All page types are local components.
import { useMemo, useRef, useState } from "react";
import type { PublicStyleBoard, PublicPinnedItem } from "@/lib/studio.functions";
import {
  buildPages,
  spansFor,
  getProductionNote,
  deriveProjectTitle,
  countWord,
  type DeckPage,
  type DeckMeta,
  type PaletteSwatch,
} from "@/lib/board-deck";
import { downloadDeckPDF } from "@/lib/board-export";

interface BoardDeckProps {
  board: PublicStyleBoard;
  preview?: boolean; // shows the download button
}

export function BoardDeck({ board, preview = false }: BoardDeckProps) {
  const meta: DeckMeta = useMemo(
    () => ({
      clientName: board.client_name || "Client",
      preparedBy: "Jill",
      date: board.sent_at
        ? new Date(board.sent_at).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        : "",
      projectTitle: deriveProjectTitle(board),
    }),
    [board],
  );

  const pages = useMemo(() => buildPages(board, meta), [board, meta]);
  const total = pages.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function onDownload() {
    if (!rootRef.current) return;
    setDownloading(true);
    try {
      const safeName = (board.client_name || "client")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await downloadDeckPDF(rootRef.current, `eclectic-hive-${safeName}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      {preview && (
        <button
          onClick={onDownload}
          disabled={downloading}
          className="fixed top-4 right-4 z-50 bg-charcoal text-cream px-4 py-2 text-[10px] uppercase tracking-[0.3em] hover:opacity-80 disabled:opacity-40 print:hidden"
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      )}
      <div ref={rootRef} className="board-deck">
        {pages.map((page, idx) => (
          <PageRenderer
            key={idx}
            page={page}
            pageNum={idx + 1}
            total={total}
            meta={meta}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Page chrome ---------------------------------------------------------

function PageChrome({ pageNum, total, meta }: { pageNum: number; total: number; meta: DeckMeta }) {
  return (
    <>
      <div className="absolute bottom-6 left-12 right-12 flex items-center justify-between text-[9px] uppercase tracking-[0.32em] text-charcoal/45 pointer-events-none z-10">
        <span>
          <span className="text-charcoal/70">Eclectic Hive</span>
          {meta.preparedBy && <> · Prepared by {meta.preparedBy}</>}
          {meta.clientName && <> · For {meta.clientName}</>}
        </span>
        <span className="font-mono tabular-nums">
          {String(pageNum).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
    </>
  );
}

// ---- Page dispatcher -----------------------------------------------------

function PageRenderer({
  page,
  pageNum,
  total,
  meta,
}: {
  page: DeckPage;
  pageNum: number;
  total: number;
  meta: DeckMeta;
}) {
  const isDark = page.kind === "cover" || page.kind === "closing" || page.kind === "section-divider";
  return (
    <section
      data-board-page={pageNum}
      className={`relative w-full ${
        isDark ? "bg-charcoal text-cream" : "bg-cream text-charcoal"
      }`}
      style={{ minHeight: "100vh", pageBreakAfter: "always" }}
    >
      {page.kind === "cover" && <CoverPage page={page} meta={meta} />}
      {page.kind === "mood-hero" && <MoodHeroPage page={page} meta={meta} />}
      {page.kind === "statement" && <StatementPage page={page} />}
      {page.kind === "palette" && <PalettePage page={page} />}
      {page.kind === "tones" && <TonesPage page={page} />}
      {page.kind === "section-divider" && <SectionDividerPage page={page} />}
      {page.kind === "production" && <ProductionPage page={page} />}
      {page.kind === "closing" && <ClosingPage page={page} />}
      {page.kind !== "cover" && (
        <PageChrome pageNum={pageNum} total={total} meta={meta} />
      )}
    </section>
  );
}

// ---- Cover ---------------------------------------------------------------

function CoverPage({
  page,
  meta,
}: {
  page: Extract<DeckPage, { kind: "cover" }>;
  meta: DeckMeta;
}) {
  const bg = page.cover?.image_url ?? null;
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {bg && (
        <img
          src={bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/30 via-transparent to-charcoal/60" />
      <div className="absolute top-12 left-12 text-[10px] uppercase tracking-[0.4em] text-cream/80">
        {meta.date}
      </div>
      <div className="absolute top-12 right-12 text-[10px] uppercase tracking-[0.4em] text-cream/80">
        Eclectic Hive
      </div>
      <div className="absolute bottom-16 left-12 right-12 flex items-end justify-between gap-12">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-cream/70 mb-6">
            Style Guide · For {meta.clientName}
          </p>
          <h1
            className="font-display text-cream leading-[0.95] tracking-tight max-w-[14ch]"
            style={{ fontSize: "clamp(2.75rem, 7vw, 6.5rem)" }}
          >
            {meta.projectTitle}
          </h1>
        </div>
        <div className="text-right text-[9px] uppercase tracking-[0.35em] text-cream/60 space-y-1 hidden md:block">
          <div>Prepared by {meta.preparedBy}</div>
          <div>Confidential</div>
        </div>
      </div>
    </div>
  );
}

// ---- Mood hero -----------------------------------------------------------

function MoodHeroPage({
  page,
  meta,
}: {
  page: Extract<DeckPage, { kind: "mood-hero" }>;
  meta: DeckMeta;
}) {
  return (
    <div className="px-6 lg:px-16 pt-24 pb-24 min-h-screen flex flex-col justify-center">
      <p className="text-[10px] uppercase tracking-[0.4em] text-charcoal/45 mb-8">
        {meta.clientName}
      </p>
      <h2
        className="font-display tracking-tight leading-[0.95] mb-14 max-w-[15ch]"
        style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
      >
        {meta.projectTitle}
      </h2>
      <div className="grid grid-cols-3 gap-3 lg:gap-6">
        {page.images.slice(0, 3).map((img, i) => (
          <div key={i} className="aspect-[4/5] overflow-hidden bg-charcoal/5">
            <img
              src={img.url}
              alt={img.alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Statement -----------------------------------------------------------

function StatementPage({ page }: { page: Extract<DeckPage, { kind: "statement" }> }) {
  return (
    <div className="px-6 lg:px-16 min-h-screen flex flex-col items-center justify-center text-center">
      <p className="text-[10px] uppercase tracking-[0.4em] text-charcoal/45 mb-10">
        {page.eyebrow}
      </p>
      <p
        className="font-display max-w-4xl leading-[1.2] text-charcoal/90"
        style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
      >
        {page.body}
      </p>
    </div>
  );
}

// ---- Palette -------------------------------------------------------------

function PalettePage({ page }: { page: Extract<DeckPage, { kind: "palette" }> }) {
  return (
    <div className="px-6 lg:px-16 pt-24 pb-24 min-h-screen">
      <p className="text-[10px] uppercase tracking-[0.4em] text-charcoal/45 mb-3">
        Palette
      </p>
      <h2
        className="font-display tracking-tight mb-12 capitalize"
        style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
      >
        {countWord(page.swatches.length)} {page.swatches.length === 1 ? "tone" : "tones"}
      </h2>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(page.swatches.length, 7)}, minmax(0, 1fr))`,
        }}
      >
        {page.swatches.map((s: PaletteSwatch, i) => (
          <div key={i} className="space-y-3">
            <div
              className="aspect-[3/4] border border-charcoal/10"
              style={{ background: s.hex }}
            />
            <div className="text-[10px] uppercase tracking-[0.28em] text-charcoal/75">
              {s.name ?? `Tone ${String(i + 1).padStart(2, "0")}`}
            </div>
            <div className="text-[10px] font-mono tabular-nums text-charcoal/45">
              {s.hex.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Tones ---------------------------------------------------------------

function TonesPage({ page }: { page: Extract<DeckPage, { kind: "tones" }> }) {
  return (
    <div className="px-6 lg:px-16 min-h-screen flex flex-col items-center justify-center text-center">
      <p className="text-[10px] uppercase tracking-[0.4em] text-charcoal/45 mb-10">
        Tone
      </p>
      <p
        className="font-display italic max-w-3xl leading-[1.1]"
        style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
      >
        {page.label}
      </p>
    </div>
  );
}

// ---- Section divider -----------------------------------------------------

function SectionDividerPage({
  page,
}: {
  page: Extract<DeckPage, { kind: "section-divider" }>;
}) {
  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-4 gap-px opacity-40">
        {page.bgImages.map((url, i) => (
          <div key={i} className="bg-charcoal/40 overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-charcoal/55" />
      <h2
        className="relative font-display text-cream tracking-tight uppercase"
        style={{ fontSize: "clamp(4rem, 14vw, 12rem)" }}
      >
        {page.word}
      </h2>
    </div>
  );
}

// ---- Production page (asymmetric grid) -----------------------------------

function ProductionPage({ page }: { page: Extract<DeckPage, { kind: "production" }> }) {
  const items = page.items;
  const spans = spansFor(items.length);
  const note = getProductionNote(page.categorySlug);

  return (
    <div className="px-6 lg:px-16 pt-24 pb-24 min-h-screen">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.4em] text-charcoal/45">
          {page.categoryLabel}
        </p>
        <p className="text-[10px] font-mono tabular-nums text-charcoal/40">
          {String(items.length).padStart(2, "0")} pieces
        </p>
      </div>
      <h2
        className="font-display tracking-tight mb-4"
        style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)" }}
      >
        The {page.categoryLabel.toLowerCase()}
      </h2>
      {note && (
        <p className="font-display italic text-charcoal/65 max-w-2xl leading-relaxed mb-12 text-[15px] lg:text-[17px]">
          {note}
        </p>
      )}
      <div
        className="grid grid-cols-12 gap-3 lg:gap-4"
        style={{ gridAutoRows: "160px" }}
      >
        {items.map((item: PublicPinnedItem, idx: number) => {
          const span = spans[idx] ?? { col: "col-span-3", row: "row-span-1" };
          return (
            <figure
              key={item.id}
              className={`${span.col} ${span.row} flex flex-col gap-2 min-h-0`}
            >
              <div className="flex-1 bg-charcoal/5 overflow-hidden min-h-0">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <figcaption className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-charcoal/70 truncate">
                  {item.title}
                </div>
                {item.note && (
                  <div className="text-[10px] font-display italic text-charcoal/55 leading-snug line-clamp-2">
                    {item.note}
                  </div>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

// ---- Closing -------------------------------------------------------------

function ClosingPage({ page }: { page: Extract<DeckPage, { kind: "closing" }> }) {
  return (
    <div className="px-6 lg:px-16 min-h-screen flex flex-col items-center justify-center text-center">
      <div
        className="font-display tracking-[0.06em] uppercase text-cream"
        style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}
      >
        Eclectic Hive
      </div>
      <p className="mt-8 text-[10px] uppercase tracking-[0.4em] text-cream/55">
        {page.body}
      </p>
      <a
        href="mailto:hello@eclectichive.com"
        className="mt-16 text-[10px] uppercase tracking-[0.4em] text-cream/80 border border-cream/30 px-6 py-3 hover:bg-cream hover:text-charcoal transition-colors"
      >
        Reply to Jill
      </a>
    </div>
  );
}

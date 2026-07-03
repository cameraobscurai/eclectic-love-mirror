import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";
import { renderUrl } from "@/lib/storage-image";
import { VIGNETTES, type Vignette } from "@/content/vignettes";
import { composeSeating, type ComposeResult } from "@/lib/compose-seating";
import { useInquiry, INQUIRY_MAX } from "@/hooks/use-inquiry";

// ─────────────────────────────────────────────────────────────────────────────
// Format factors — seats-per-guest by event shape.
// ─────────────────────────────────────────────────────────────────────────────

type FormatId = "cocktail" | "mixed" | "lounge-dinner";
type FormatDef = { id: FormatId; label: string; factor: number; hint: string };

const FORMATS: FormatDef[] = [
  { id: "cocktail", label: "Cocktail", factor: 0.35, hint: "Standing crowd, a few landing spots." },
  { id: "mixed", label: "Mixed", factor: 0.55, hint: "Standing + seating pockets." },
  { id: "lounge-dinner", label: "Lounge dinner", factor: 0.85, hint: "Everyone off their feet." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/compose")({
  loader: () => getCollectionCatalog(),
  head: () => ({
    meta: [
      { title: "Compose — Eclectic Hive" },
      {
        name: "description",
        content:
          "Guest count in, lounge composition out. A working sketchpad that respects live stock.",
      },
      { property: "og:title", content: "Compose — Eclectic Hive" },
      {
        property: "og:description",
        content:
          "Guest count in, lounge composition out. A working sketchpad that respects live stock.",
      },
    ],
  }),
  component: ComposePage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseStock(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const n = parseInt(String(raw).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

function ComposePage() {
  const payload = Route.useLoaderData();
  const products = payload.products as CollectionProduct[];

  // Build id → product + stock lookups; warn on any vignette that references
  // an unknown rms_id or a piece with null stock. Vignettes with problems
  // are still shown but excluded from placement.
  const { productById, stockByRmsId, healthyVignettes } = useMemo(() => {
    const map = new Map<string, CollectionProduct>();
    for (const p of products) map.set(p.id, p);

    const stock: Record<string, number> = {};
    const healthy: Vignette[] = [];

    for (const v of VIGNETTES) {
      let ok = true;
      for (const rmsId of Object.keys(v.need)) {
        const prod = map.get(rmsId);
        if (!prod) {
          // eslint-disable-next-line no-console
          console.warn(`[compose] vignette "${v.id}" references unknown rms_id: ${rmsId}`);
          ok = false;
          continue;
        }
        const s = parseStock(prod.stockedQuantity);
        if (s == null) {
          // eslint-disable-next-line no-console
          console.warn(
            `[compose] vignette "${v.id}" piece ${rmsId} (${prod.title}) has null stock`,
          );
          ok = false;
          continue;
        }
        stock[rmsId] = s;
      }
      if (ok) healthy.push(v);
    }

    return { productById: map, stockByRmsId: stock, healthyVignettes: healthy };
  }, [products]);

  const [guests, setGuests] = useState<number>(80);
  const [formatId, setFormatId] = useState<FormatId>("mixed");
  const format = FORMATS.find((f) => f.id === formatId)!;
  const target = Math.round(guests * format.factor);

  const result: ComposeResult = useMemo(
    () => composeSeating(target, healthyVignettes, stockByRmsId),
    [target, healthyVignettes, stockByRmsId],
  );

  const inquiry = useInquiry();

  const handleAddToInquiry = () => {
    const rmsIds = Object.keys(result.usedByRmsId);
    const remainingSlots = Math.max(0, INQUIRY_MAX - inquiry.count);
    const alreadyIn = rmsIds.filter((id) => inquiry.has(id));
    const toAdd = rmsIds.filter((id) => !inquiry.has(id));

    if (remainingSlots === 0) {
      toast("Inquiry list full", {
        description: `Already at ${INQUIRY_MAX} pieces. Review at /contact.`,
      });
      return;
    }

    const actuallyAdding = toAdd.slice(0, remainingSlots);
    for (const id of actuallyAdding) inquiry.add(id);

    const overflow = toAdd.length - actuallyAdding.length;
    if (overflow > 0) {
      toast("Partial add", {
        description: `Added ${actuallyAdding.length}. ${overflow} skipped — inquiry cap is ${INQUIRY_MAX}.`,
      });
    } else if (actuallyAdding.length > 0) {
      const dupNote = alreadyIn.length > 0 ? ` (${alreadyIn.length} already in list)` : "";
      toast("Added to inquiry", {
        description: `${actuallyAdding.length} piece${actuallyAdding.length === 1 ? "" : "s"} added${dupNote}.`,
      });
    } else {
      toast("Already in your inquiry", {
        description: "Every piece from this composition is already on your list.",
      });
    }
  };

  return (
    <main className="bg-cream text-charcoal min-h-screen">
      {/* ─────────── Header ─────────── */}
      <header
        className="border-b px-6 sm:px-10 lg:px-16 pt-24 sm:pt-32 pb-10 sm:pb-14"
        style={{ borderColor: "var(--hairline)" }}
      >
        <div className="max-w-[1400px] mx-auto">
          <p
            className="text-charcoal/55 mb-6"
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Tool · Compose
          </p>
          <h1
            className="font-display text-charcoal"
            style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", lineHeight: 1.05, letterSpacing: "-0.01em" }}
          >
            Guest count in.<br />
            Composition out.
          </h1>
          <p
            className="mt-6 max-w-2xl text-charcoal/70"
            style={{ fontSize: "1rem", lineHeight: 1.55 }}
          >
            A working sketchpad. Pick a guest count and a format; we&apos;ll stack
            curated vignettes against live stock. The result is a starting point
            — the design team refines it with you.
          </p>
        </div>
      </header>

      {/* ─────────── Controls ─────────── */}
      <section className="px-6 sm:px-10 lg:px-16 py-10 sm:py-14">
        <div
          className="max-w-[1400px] mx-auto grid gap-10 lg:gap-14"
          style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
        >
          <div className="grid gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Guests */}
            <div>
              <Eyebrow>Guests</Eyebrow>
              <div className="mt-4 flex items-baseline gap-6">
                <input
                  type="number"
                  min={20}
                  max={300}
                  step={10}
                  value={guests}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isFinite(n)) setGuests(Math.max(20, Math.min(300, n)));
                  }}
                  className="bg-transparent border-none outline-none font-display text-charcoal w-[6ch]"
                  style={{
                    fontSize: "clamp(3rem, 7vw, 5.5rem)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
                <span
                  className="text-charcoal/55"
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  20 – 300
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                step={10}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                className="mt-6 w-full accent-charcoal"
              />
            </div>

            {/* Format */}
            <div>
              <Eyebrow>Format</Eyebrow>
              <div className="mt-4 flex flex-col gap-3">
                {FORMATS.map((f) => {
                  const active = f.id === formatId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormatId(f.id)}
                      className="text-left px-4 py-3 transition-colors"
                      style={{
                        border: `1px solid var(--hairline)`,
                        background: active ? "rgba(26,26,26,0.04)" : "transparent",
                        transition: "background var(--dur-med) var(--ease-editorial)",
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span
                          className="text-charcoal"
                          style={{
                            fontSize: "0.72rem",
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                          }}
                        >
                          {f.label}
                        </span>
                        <span
                          className="text-charcoal/55"
                          style={{
                            fontSize: "0.72rem",
                            letterSpacing: "0.22em",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          ×{f.factor.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-charcoal/60" style={{ fontSize: "0.85rem" }}>
                        {f.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Target line */}
          <div
            className="pt-8 border-t flex flex-wrap items-baseline gap-x-8 gap-y-3"
            style={{ borderColor: "var(--hairline)" }}
          >
            <Stat label="Target seats" value={String(target)} />
            <Stat
              label="Composed seats"
              value={String(result.totalSeats)}
              muted={result.capped}
            />
            <Stat
              label="Pieces used"
              value={String(Object.values(result.usedByRmsId).reduce((a, b) => a + b, 0))}
            />
          </div>

          {/* Honesty state */}
          {result.capped && (
            <div
              className="px-5 py-4"
              style={{
                border: `1px solid var(--hairline)`,
                background: "rgba(26,26,26,0.03)",
              }}
            >
              <p
                className="text-charcoal"
                style={{ fontSize: "0.95rem", lineHeight: 1.55 }}
              >
                <strong className="font-normal" style={{ letterSpacing: "0.02em" }}>
                  Stock seats {result.totalSeats} — target was {target}.
                </strong>{" "}
                Shift to a lower-density format, drop the guest count, or{" "}
                <Link
                  to="/contact"
                  className="underline decoration-charcoal/30 hover:decoration-charcoal"
                >
                  talk to the design team
                </Link>{" "}
                about custom fabrication.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─────────── Composition ─────────── */}
      <section
        className="px-6 sm:px-10 lg:px-16 pb-16 border-t"
        style={{ borderColor: "var(--hairline)" }}
      >
        <div className="max-w-[1400px] mx-auto pt-10 sm:pt-14">
          <Eyebrow>Composition</Eyebrow>
          {result.placed.length === 0 ? (
            <p className="mt-6 text-charcoal/60" style={{ fontSize: "0.95rem" }}>
              No vignettes can be placed against current stock. Adjust guest count or format.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.placed.map(({ vignette, count }) => (
                <VignetteCard
                  key={vignette.id}
                  vignette={vignette}
                  count={count}
                  productById={productById}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─────────── Pull sheet ─────────── */}
      {Object.keys(result.usedByRmsId).length > 0 && (
        <section
          className="px-6 sm:px-10 lg:px-16 pb-20 border-t"
          style={{ borderColor: "var(--hairline)" }}
        >
          <div className="max-w-[1400px] mx-auto pt-10 sm:pt-14">
            <Eyebrow>Pull sheet</Eyebrow>
            <table
              className="mt-6 w-full text-left"
              style={{
                borderCollapse: "collapse",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr
                  className="text-charcoal/55"
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  <th className="py-3 pr-4 font-normal">Piece</th>
                  <th className="py-3 pr-4 font-normal">Used</th>
                  <th className="py-3 pr-4 font-normal">Of stock</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.usedByRmsId).map(([rmsId, used]) => {
                  const p = productById.get(rmsId);
                  const stock = stockByRmsId[rmsId] ?? 0;
                  const left = stock - used;
                  return (
                    <tr
                      key={rmsId}
                      className="border-t"
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      <td className="py-3 pr-4">
                        <span className="text-charcoal">{p?.title ?? rmsId}</span>
                      </td>
                      <td className="py-3 pr-4 text-charcoal/80">{used}</td>
                      <td className="py-3 pr-4 text-charcoal/60">
                        {left} left of {stock}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-10 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleAddToInquiry}
                className="px-6 py-3 text-cream bg-charcoal transition-opacity hover:opacity-85"
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                Add these pieces to my inquiry
              </button>
              <Link
                to="/contact"
                className="px-6 py-3 text-charcoal transition-colors hover:bg-charcoal/[0.04]"
                style={{
                  border: `1px solid var(--hairline)`,
                  fontSize: "0.72rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                Talk to the design team
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-charcoal/55"
      style={{
        fontSize: "0.7rem",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </p>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p
        className="text-charcoal/55"
        style={{
          fontSize: "0.68rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        className={muted ? "text-charcoal/60" : "text-charcoal"}
        style={{
          fontSize: "1.6rem",
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
          marginTop: "0.35rem",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function VignetteCard({
  vignette,
  count,
  productById,
}: {
  vignette: Vignette;
  count: number;
  productById: Map<string, CollectionProduct>;
}) {
  const pieces = Object.entries(vignette.need).map(([rmsId, qty]) => ({
    rmsId,
    qty,
    product: productById.get(rmsId),
  }));

  // Hydration-safe: only render srcset-transformed URLs post-mount so SSR
  // matches. First paint uses the original URL.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <article
      className="flex flex-col"
      style={{ border: `1px solid var(--hairline)` }}
    >
      {/* Thumbnail row — up to 3 previews */}
      <div className="grid grid-cols-3" style={{ borderBottom: `1px solid var(--hairline)` }}>
        {pieces.slice(0, 3).map(({ rmsId, product }) => {
          const raw = product?.primaryImage?.url ?? null;
          const src = raw && mounted ? renderUrl(raw, { width: 480, quality: 72 }) : raw;
          return (
            <div
              key={rmsId}
              className="aspect-square bg-cream/60 overflow-hidden flex items-center justify-center"
              style={{ borderRight: `1px solid var(--hairline)` }}
            >
              {src ? (
                <img
                  src={src}
                  alt={product?.title ?? rmsId}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-charcoal/40 px-2 text-center"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
                >
                  {product?.title ?? rmsId}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            className="text-charcoal"
            style={{ fontSize: "1.05rem", letterSpacing: "-0.005em" }}
          >
            {vignette.name}
          </h3>
          <span
            className="text-charcoal/55"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ×{count}
          </span>
        </div>
        <p
          className="mt-2 text-charcoal/60"
          style={{ fontSize: "0.7rem", letterSpacing: "0.22em", textTransform: "uppercase", fontVariantNumeric: "tabular-nums" }}
        >
          Seats {vignette.seats * count}
        </p>
        {vignette.note && (
          <p className="mt-3 text-charcoal/70" style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
            {vignette.note}
          </p>
        )}
        <ul
          className="mt-4 pt-4 space-y-1.5 text-charcoal/65"
          style={{
            borderTop: `1px solid var(--hairline)`,
            fontSize: "0.78rem",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pieces.map(({ rmsId, qty, product }) => (
            <li key={rmsId} className="flex justify-between gap-3">
              <span className="truncate">{product?.title ?? rmsId}</span>
              <span className="text-charcoal/50">×{qty * count}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

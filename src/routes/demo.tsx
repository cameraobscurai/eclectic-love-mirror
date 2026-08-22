/**
 * /demo — Tier 1 review page.
 *
 * One screen, arrow keys, five minutes. Each slide is a shipped fix; slides
 * with a receipt show BEFORE/AFTER on a toggle rather than two side-by-side
 * thumbnails, so the change is a state swap on one surface instead of a
 * spot-the-difference exercise.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Tier 1 Review — Eclectic Hive" },
      {
        name: "description",
        content:
          "Five-minute review of the Tier 1 fixes: taxonomy studio, cover baseline, and a live admin edit round-trip receipt.",
      },
      { property: "og:title", content: "Tier 1 Review — Eclectic Hive" },
      {
        property: "og:description",
        content: "Five-minute review of the shipped Tier 1 fixes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemoPage,
});

type Slide = {
  label: string;
  line: string;
  before?: { src: string; caption: string };
  after?: { src: string; caption: string };
  stat?: string[];
  to?: { href: string; label: string };
};

const SLIDES: Slide[] = [
  {
    label: "Edit reaches the live site",
    line: "Notes typed in the admin drawer, published, live — no engineer.",
    before: { src: "/receipts/round-trip-1-before.png", caption: "22:03 UTC — live, no notes" },
    after: {
      src: "/receipts/round-trip-2-after-live.png",
      caption: "22:12 UTC — live, notes present",
    },
  },
  {
    label: "Publish is the gate",
    line: "Nothing moves until Publish. Then everything moves, in 27 seconds.",
    before: { src: "/receipts/round-trip-0-admin-drawer.png", caption: "Drawer — SAVED" },
    after: { src: "/receipts/round-trip-3-restored.png", caption: "Reverted live, no code deploy" },
  },
  {
    label: "Taxonomy Studio",
    line: "10 collections, 33 categories. Confirm, reassign, or flag — one tile at a time.",
    to: { href: "/admin/taxonomy", label: "Open the studio" },
  },
  {
    label: "Cover baseline",
    line: "Every cover measured. One mechanism behind most of it.",
    stat: ["636 measured", "309 defective", "281 one root cause"],
  },
  {
    label: "Inventory admin",
    line: "Sort by category, heading, subcategory. Add products, reorder photos, unpublish.",
    to: { href: "/admin/products", label: "Open inventory" },
  },
];

function DemoPage() {
  const [i, setI] = useState(0);
  const [showAfter, setShowAfter] = useState(true);
  const slide = SLIDES[i];

  const go = useCallback((d: number) => {
    setI((p) => Math.min(SLIDES.length - 1, Math.max(0, p + d)));
    setShowAfter(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " ") {
        e.preventDefault();
        setShowAfter((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const frame = showAfter ? slide.after : slide.before;

  return (
    <main className="min-h-[100dvh] bg-background px-5 py-10 text-foreground md:px-12">
      <header className="mx-auto flex max-w-5xl items-baseline justify-between">
        <h1 className="text-xs uppercase tracking-[0.3em]">Tier 1 — Review</h1>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {String(i + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </header>

      <section className="mx-auto mt-10 max-w-5xl">
        <h2 className="text-balance text-2xl uppercase tracking-[0.12em] md:text-3xl">
          {slide.label}
        </h2>
        <p className="mt-3 max-w-xl text-pretty text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {slide.line}
        </p>

        {frame && (
          <figure className="mt-8">
            <div className="flex items-center gap-2">
              {(["before", "after"] as const).map((k) => {
                const active = (k === "after") === showAfter;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setShowAfter(k === "after")}
                    className={`min-h-11 px-4 text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 active:scale-[0.97] ${
                      active
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 overflow-hidden border border-border">
              <img
                src={frame.src}
                alt={`${slide.label} — ${showAfter ? "after" : "before"}`}
                className="block w-full"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {frame.caption}
            </figcaption>
          </figure>
        )}

        {slide.stat && (
          <dl className="mt-8 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
            {slide.stat.map((s) => (
              <div key={s} className="bg-background p-6">
                <dd className="text-lg uppercase tracking-[0.1em] tabular-nums">{s}</dd>
              </div>
            ))}
          </dl>
        )}

        {slide.to && (
          <Link
            to={slide.to.href}
            className="mt-8 inline-flex min-h-11 items-center border border-foreground px-5 text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 active:scale-[0.97]"
          >
            {slide.to.label}
          </Link>
        )}
      </section>

      <nav className="mx-auto mt-12 flex max-w-5xl items-center gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i === 0}
          className="min-h-11 border border-border px-5 text-[10px] uppercase tracking-[0.25em] disabled:opacity-30 active:scale-[0.97]"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i === SLIDES.length - 1}
          className="min-h-11 border border-foreground px-5 text-[10px] uppercase tracking-[0.25em] disabled:opacity-30 active:scale-[0.97]"
        >
          Next
        </button>
        <div className="ml-auto flex gap-1">
          {SLIDES.map((s, n) => (
            <button
              key={s.label}
              type="button"
              aria-label={s.label}
              onClick={() => {
                setI(n);
                setShowAfter(true);
              }}
              className={`h-1 w-8 ${n === i ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>
      </nav>
    </main>
  );
}

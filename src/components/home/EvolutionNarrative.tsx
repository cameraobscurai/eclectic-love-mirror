import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * EvolutionNarrative
 * ------------------
 * Sticky single-fold manifesto. The visible card stays pinned at the
 * vertical center of the viewport while the page scrolls. Scroll
 * progress drives which line is "active" — only one line at a time is
 * full-opacity, every other is dimmed (precise switch-style highlight,
 * à la obscura.works — no soft gradient).
 *
 * Optional `footer` slot renders after the manifesto inside the same
 * sticky frame, so CTAs can ride the end of the arc.
 */

type Line = { text: string; emphasis?: "section" | "brand" | "closer" };

const LINES: Line[] = [
  { text: "Evolution", emphasis: "section" },
  { text: "Growth doesn't happen all at once." },
  { text: "It happens in phases." },
  { text: "There's a beginning that's rooted in curiosity." },
  { text: "A time where things expand and start to take shape." },
  { text: "A shift toward refining what actually matters." },
  { text: "A moment where letting go becomes necessary." },
  { text: "And space to step back and see all of it clearly." },
  { text: "This isn't a reinvention. It's a refinement." },
  { text: "A deeper understanding of what holds weight." },
  { text: "We are artists. Designers. Craftsmen." },
  { text: "We are Eclectic Hive", emphasis: "brand" },
  { text: "This is our evolution.", emphasis: "closer" },
];

const STEP_VH = 22; // shorter scroll distance per line — keeps it tight

export function EvolutionNarrative({ footer }: { footer?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFooter, setShowFooter] = useState(false);

  const BODY_LINES = LINES.filter((l) => l.emphasis !== "section");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const total = BODY_LINES.length;

    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const distance = el.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(distance, 1));
      const progress = distance > 0 ? scrolled / distance : 0;

      // Reserve last ~15% for footer reveal. Map remaining 0..0.85 across lines.
      const lineProgress = Math.min(progress / 0.85, 1);
      const idx = Math.min(total - 1, Math.floor(lineProgress * total));
      setActiveIndex(idx);
      setShowFooter(progress > 0.82);
    };

    onScroll();
    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [BODY_LINES.length]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal"
      style={{ height: `${BODY_LINES.length * STEP_VH + 60}vh` }}
    >
      <div className="sticky top-0 h-screen w-full flex items-center justify-center px-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6 md:mb-8">
            <h2
              id="evolution-heading"
              className="font-brand uppercase text-charcoal/85"
              style={{
                fontWeight: 400,
                letterSpacing: "0.32em",
                fontSize: "clamp(0.7rem, 1vw, 0.875rem)",
              }}
            >
              Evolution
            </h2>
            <div className="mt-3 h-px w-12 bg-charcoal/30" />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            {BODY_LINES.map((line, i) => {
              const active = i === activeIndex;
              const isBrand = line.emphasis === "brand";
              return (
                <p
                  key={i}
                  className={cn(
                    "font-brand text-charcoal transition-all duration-300 ease-out",
                    isBrand ? "uppercase tracking-[0.18em]" : "italic",
                  )}
                  style={{
                    fontWeight: 400,
                    fontSize: isBrand
                      ? "clamp(1.15rem, 2.4vw, 1.7rem)"
                      : "clamp(0.95rem, 1.6vw, 1.25rem)",
                    lineHeight: 1.3,
                    opacity: active ? 1 : 0.18,
                    transform: active ? "translateY(0)" : "translateY(2px)",
                  }}
                >
                  {line.text}
                </p>
              );
            })}
          </div>

          {footer && (
            <div
              className="mt-8 md:mt-10 transition-all duration-500 ease-out"
              style={{
                opacity: showFooter ? 1 : 0,
                transform: showFooter ? "translateY(0)" : "translateY(8px)",
                pointerEvents: showFooter ? "auto" : "none",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

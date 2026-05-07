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

const BODY_LINES = LINES.filter((line) => line.emphasis !== "section");
const STEP_VH = 26; // each line gets real airtime before the next switches in
const FOOTER_REVEAL_AT = 0.9;
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export function EvolutionNarrative({ footer }: { footer?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const total = BODY_LINES.length;

    const updateActiveLine = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const distance = Math.max(el.offsetHeight - vh, 1);
      const progress = clamp01(-rect.top / distance);

      // Stable hold: floor(progress * total) so each line owns an equal
      // band of scroll. Center-bias by adding 0.5 step so the switch
      // feels anchored to the line's reading position, not its top edge.
      const lineProgress = clamp01(progress / FOOTER_REVEAL_AT);
      const idx = Math.min(total - 1, Math.floor(lineProgress * total));
      const footerVisible = progress >= FOOTER_REVEAL_AT;
      setActiveIndex((current) => (current === idx ? current : idx));
      setShowFooter((current) => (current === footerVisible ? current : footerVisible));
    };

    updateActiveLine();
    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateActiveLine();
        ticking = false;
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="evolution-heading"
      data-active-line={activeIndex}
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

          <div className="space-y-3 md:space-y-3.5">
            {BODY_LINES.map((line, i) => {
              const active = i === activeIndex;
              const isBrand = line.emphasis === "brand";
              return (
                <p
                  key={i}
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "font-brand text-charcoal transition-[opacity,color,transform] duration-300 ease-out will-change-[opacity,transform]",
                    isBrand ? "uppercase tracking-[0.18em]" : "italic",
                  )}
                  style={{
                    fontWeight: 400,
                    fontSize: isBrand
                      ? "clamp(1.15rem, 2.4vw, 1.7rem)"
                      : "clamp(0.95rem, 1.6vw, 1.25rem)",
                    lineHeight: 1.35,
                    opacity: active ? 1 : 0.12,
                    color: active ? "var(--charcoal)" : "var(--charcoal)",
                    transform: active ? "translateX(0)" : "translateX(-2px)",
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

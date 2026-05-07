import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * EvolutionNarrative
 * ------------------
 * Sticky single-fold manifesto with progressive reveal.
 *
 * Each line fades from dim → bright as the scroll position passes it,
 * then STAYS bright. The reader accumulates the manifesto line by line
 * instead of being held hostage to a single active line. Mirrors
 * droflower's PretextScrollReveal feel (read-through pacing) and
 * obscura's restraint (no flashy transforms).
 */

type Line = { text: string; emphasis?: "section" | "brand" | "closer" };

const LINES: Line[] = [
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
  { text: "This is our evolution.", emphasis: "closer" },
];

// Tighter scroll budget so older readers don't feel trapped.
// Total scroll = LINES.length * STEP_VH + tail. ~16vh per line + 40vh tail
// gives ~2.2 screens of scroll for the whole arc on desktop, ~2 on mobile.
const STEP_VH_DESKTOP = 16;
const STEP_VH_MOBILE = 14;
const FOOTER_REVEAL_AT = 0.86;
const DIM_OPACITY = 0.18;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

export function EvolutionNarrative({ footer }: { footer?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [showFooter, setShowFooter] = useState(false);
  const [stepVh, setStepVh] = useState(STEP_VH_DESKTOP);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncBreakpoint = () => {
      setStepVh(window.innerWidth < 768 ? STEP_VH_MOBILE : STEP_VH_DESKTOP);
    };
    syncBreakpoint();

    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const distance = Math.max(el.offsetHeight - vh, 1);
      const p = clamp01(-rect.top / distance);
      setProgress(p);
      setShowFooter(p >= FOOTER_REVEAL_AT);
    };

    update();
    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", () => {
      syncBreakpoint();
      handler();
    });
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  const total = LINES.length;
  // Reveal lines across the first FOOTER_REVEAL_AT of scroll.
  // Each line owns a band of width 1/total. Inside that band we ease
  // from DIM_OPACITY → 1. Once past, the line stays at 1.
  const lineProgress = clamp01(progress / FOOTER_REVEAL_AT);
  const reveal = lineProgress * total;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal"
      style={{ height: `${total * stepVh + 50}vh` }}
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
            {LINES.map((line, i) => {
              // Per-line opacity: dim until reveal reaches this index,
              // then ease up to full across one band, then stays at 1.
              const local = clamp01(reveal - i);
              const opacity = DIM_OPACITY + (1 - DIM_OPACITY) * local;
              const isClose = line.emphasis === "closer";
              return (
                <p
                  key={i}
                  className={cn(
                    "font-brand text-charcoal italic transition-opacity duration-200 ease-out will-change-[opacity]",
                    isClose && "not-italic uppercase tracking-[0.18em]",
                  )}
                  style={{
                    fontWeight: 400,
                    fontSize: isClose
                      ? "clamp(1rem, 1.9vw, 1.4rem)"
                      : "clamp(0.95rem, 1.6vw, 1.25rem)",
                    lineHeight: 1.4,
                    opacity,
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

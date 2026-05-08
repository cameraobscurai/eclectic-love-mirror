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
const STEP_VH_DESKTOP = 14;
const STEP_VH_MOBILE = 12;
// Lead-in: portion of scroll before any line begins revealing.
// Lets the section fully settle into center before the manifesto activates.
const LEAD_IN = 0.08;
const FOOTER_REVEAL_AT = 0.82;
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
  // Reveal lines across the first FOOTER_REVEAL_AT of scroll. Each line is
  // assigned a center scroll-position; brightness is a smooth function of
  // distance from that center. WINDOW (in line-units) controls how many
  // lines crossfade simultaneously — larger = silkier wave, smaller = more
  // staircase. 1.6 lines wide gives a flowing read-through on mobile that
  // matches droflower's PretextScrollReveal feel without the per-character
  // canvas measurement (overkill for our line count).
  const lineProgress = clamp01((progress - LEAD_IN) / (FOOTER_REVEAL_AT - LEAD_IN));
  const reveal = lineProgress * total;
  const WINDOW = 1.6;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal"
      style={{ height: `${total * stepVh + 50}vh` }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col">
        {/* scrim removed: cards sit on paper, darkening here clashed. */}
        {/* Manifesto fills available height and centers; footer always reserves
            its own space at the bottom so the last manifesto lines never
            collide with the CTA row. Footer fades in once revealed. */}
        <div className="flex-1 min-h-0 flex items-center w-full">
          <div className="fluid-canvas grid grid-cols-12" style={{ columnGap: "clamp(1.5rem, 3vw, 4rem)" }}>
            {/* Left rail — section label, pinned to top of the column */}
            <aside className="col-span-12 md:col-span-3 md:pt-1">
              <div className="flex md:block items-center gap-3">
                <h2
                  id="evolution-heading"
                  className="font-brand uppercase text-charcoal/85"
                  style={{
                    fontWeight: 400,
                    letterSpacing: "0.36em",
                    fontSize: "clamp(0.65rem, 0.85vw, 0.78rem)",
                  }}
                >
                  Evolution
                </h2>
                <div className="hidden md:block mt-4 h-px w-10 bg-charcoal/30" />
                <div className="md:hidden h-px flex-1 bg-charcoal/20" />
              </div>
            </aside>

            {/* Manifesto column — baseline grid, no centered alignment */}
            <div className="col-span-12 md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-5">
              <div className="space-y-5 md:space-y-6">
                {LINES.map((line, i) => {
                  // Distance from this line's reveal centroid (in line-units).
                  // 0 = perfectly active, ≥WINDOW = past, ≤-WINDOW = upcoming.
                  // Once a line is past its center, it locks at full brightness
                  // (read-through accumulation, never dims back).
                  const delta = reveal - i;
                  const local = delta >= 0 ? 1 : clamp01(1 + delta / WINDOW);
                  const opacity = DIM_OPACITY + (1 - DIM_OPACITY) * local;
                  const isClose = line.emphasis === "closer";
                  // Closer line: letter-spacing relaxes from 0.20em → 0.16em as
                  // it brightens, mirroring the wordmark's intro gesture.
                  const closerTracking = isClose
                    ? `${(0.2 - 0.04 * local).toFixed(3)}em`
                    : undefined;
                  return (
                    <p
                      key={i}
                      className={cn(
                        "font-brand text-charcoal italic ease-out will-change-[opacity]",
                        isClose
                          ? "not-italic uppercase pt-2 transition-[opacity,letter-spacing] duration-[1400ms]"
                          : "transition-opacity duration-200",
                      )}
                      style={{
                        fontWeight: 400,
                        fontSize: isClose
                          ? "clamp(1.05rem, 0.7rem + 0.55vw, 1.35rem)"
                          : "clamp(1.05rem, 0.7rem + 0.55vw, 1.4rem)",
                        lineHeight: 1.5,
                        opacity,
                        letterSpacing: closerTracking,
                      }}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {footer && (
          <div
            className="shrink-0 pb-6 md:pb-10 transition-all duration-500 ease-out"
            style={{
              opacity: showFooter ? 1 : 0,
              transform: showFooter ? "translateY(0)" : "translateY(8px)",
              pointerEvents: showFooter ? "auto" : "none",
            }}
          >
            <div className="fluid-canvas">{footer}</div>
          </div>
        )}
      </div>
    </section>
  );
}

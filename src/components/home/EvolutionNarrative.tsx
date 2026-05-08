import { useEffect, useRef, useState, type ReactNode } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * EvolutionNarrative
 * ------------------
 * Sticky single-fold manifesto with progressive reveal.
 *
 * Performance note: the per-line opacity ramp + closer letter-spacing + footer
 * pre-warm scrim are driven by a single CSS custom property `--p` (0→1) that
 * we write into the section root from a Framer MotionValue. React renders the
 * subtree once; everything else is `calc()` in the style attribute. No
 * setState per scroll frame, no per-line reconciliation.
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

const STEP_VH_DESKTOP = 16;
const STEP_VH_MOBILE = 14;
const LEAD_IN = 0.1;
const FOOTER_REVEAL_AT = 0.78;
const DIM_OPACITY = 0.18;

export function EvolutionNarrative({ footer }: { footer?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [showFooter, setShowFooter] = useState(false);
  const [stepVh, setStepVh] = useState(STEP_VH_DESKTOP);

  // Track viewport breakpoint once; named handler so removeEventListener works.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      setStepVh(window.innerWidth < 768 ? STEP_VH_MOBILE : STEP_VH_DESKTOP);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // Single subscription. Writes `--p` into the section root each frame; no React state.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.setProperty("--p", p.toFixed(4));
    const next = p >= FOOTER_REVEAL_AT;
    setShowFooter((curr) => (curr === next ? curr : next));
  });

  const total = LINES.length;
  const span = 1 / (FOOTER_REVEAL_AT - LEAD_IN); // multiplier inside calc

  return (
    <section
      ref={sectionRef}
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal"
      style={{
        height: `${total * stepVh + 50}vh`,
        // initial value; replaced each frame via setProperty
        ["--p" as string]: "0",
        ["--dim" as string]: String(DIM_OPACITY),
        ["--lead" as string]: String(LEAD_IN),
        ["--span" as string]: String(span),
        ["--total" as string]: String(total),
      }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col px-6 md:px-10 lg:px-16">
        {/* Pre-warm scrim — opacity derived from --p in CSS, no React updates. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[30vh]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(26,26,26,0) 0%, rgba(26,26,26,1) 100%)",
            // 0 until p=0.78, then ramps to 0.10 by p=1
            opacity: "calc(clamp(0, (var(--p) - 0.78) / 0.22, 1) * 0.1)" as unknown as number,
          }}
        />
        <div className="flex-1 min-h-0 flex items-center w-full">
          <div className="mx-auto w-full max-w-6xl grid grid-cols-12 gap-6 md:gap-10 lg:gap-16">
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

            <div className="col-span-12 md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-5">
              <div className="space-y-5 md:space-y-6">
                {LINES.map((line, i) => {
                  const isClose = line.emphasis === "closer";
                  // local = clamp((p - lead) * span - i, 0, 1)
                  const local = `clamp(0, (var(--p) - var(--lead)) * var(--span) - ${i}, 1)`;
                  const opacity = `calc(var(--dim) + (1 - var(--dim)) * ${local})`;
                  const letterSpacing = isClose
                    ? `calc((0.2 - 0.04 * ${local}) * 1em)`
                    : undefined;
                  return (
                    <p
                      key={i}
                      className={cn(
                        "font-brand text-charcoal italic",
                        isClose ? "not-italic uppercase pt-2" : "",
                      )}
                      style={{
                        fontWeight: 400,
                        fontSize: isClose
                          ? "clamp(1rem, 1.6vw, 1.25rem)"
                          : "clamp(1rem, 1.55vw, 1.3rem)",
                        lineHeight: 1.5,
                        opacity: opacity as unknown as number,
                        letterSpacing,
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
              contentVisibility: "auto",
              containIntrinsicSize: "200px",
            }}
          >
            <div className="mx-auto w-full max-w-6xl">{footer}</div>
          </div>
        )}
      </div>
    </section>
  );
}

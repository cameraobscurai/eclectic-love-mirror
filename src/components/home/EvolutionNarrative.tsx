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

// ─────────────────────────────────────────────────────────────────────────
// ANIMATION SCHEDULE — single source of truth.
//
// Total scroll budget = LINES.length * STEP_VH + tail. Section is pinned
// (sticky) for the entire run. Progress (0→1) is normalized across that
// budget, then split into three phases:
//
//   ┌─────────────┬──────────────────────────────────────┬───────────────┐
//   │   ENTER     │              READ (HOLD)             │   CONTINUE    │
//   │  0 → 0.10   │            0.10 → 0.82               │  0.82 → 1.00  │
//   └─────────────┴──────────────────────────────────────┴───────────────┘
//
//   ENTER (10%): section pins to top of viewport. Eyebrow rule + label
//     fade in. Manifesto column lifts from y+8 → y0 and goes from 0 → 1
//     opacity as a block (lines themselves still dim). Reader is given a
//     beat to settle before reading begins.
//
//   READ (72%): per-line wave reveal. Each line owns a centroid at
//     `i / total` inside the READ band, plus a WINDOW of crossfade so 1.5
//     lines are mid-transition at any moment. Once a line passes its
//     centroid, it LOCKS at full brightness (read-through accumulation,
//     never dims back). Cubic ease-out inside the window.
//
//   CONTINUE (18%): manifesto holds. Closer line's tracking relaxes from
//     0.20em → 0.16em (mirrors wordmark intro gesture). Footer (CTA stack)
//     rises in with a 60ms-per-card stagger handled inside DestinationStack.
//
// Per-line vertical rhythm: tracked by GAP_REM (clamped). Lines have a
// subtle baseline-shift on reveal (+4px → 0) so the wave reads as motion,
// not just opacity flicker.
// ─────────────────────────────────────────────────────────────────────────

const STEP_VH_DESKTOP = 14;
const STEP_VH_MOBILE = 13;

// Phase budgets expressed in VIEWPORT HEIGHTS (vh), not as fractions of the
// total scroll budget. Anchoring to the section's real viewport position
// keeps the pacing consistent regardless of how tall the pinned scroll
// container ends up — adding/removing lines no longer warps the intro or
// the footer reveal.
//
//   ENTER_VH    : scroll distance for the block-fade in (section top
//                 reaching viewport top → manifesto fully present).
//   CONTINUE_VH : scroll distance reserved at the end for the footer
//                 reveal (last viewport-ish before sticky releases).
//   READ_VH     : whatever remains between ENTER and CONTINUE — the per-
//                 line wave fills this band exactly.
const ENTER_VH = 0.5;
const CONTINUE_VH = 1.0;

// Line-wave shape inside READ band.
const WINDOW = 1.5;          // line-units of crossfade overlap
const DIM_OPACITY = 0.16;    // resting brightness for upcoming lines
const REVEAL_LIFT_PX = 6;    // baseline shift during a line's reveal

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
// Cubic ease-out — gentle landing on each line's full brightness.
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
// Smoothstep — soft phase-boundary transitions (no hard cuts).
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export function EvolutionNarrative({ footer }: { footer?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  // Scroll position expressed in VIEWPORT HEIGHTS past the moment the
  // section top reaches the viewport top. 0 = section just pinned;
  // (sectionHeight - vh) / vh = sticky about to release.
  const [scrolledVh, setScrolledVh] = useState(0);
  const [travelVh, setTravelVh] = useState(1);
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
      // Distance the section top has moved past the viewport top, in vh.
      const sVh = Math.max(-rect.top, 0) / vh;
      // Total available pinned travel, in vh.
      const tVh = Math.max((el.offsetHeight - vh) / vh, 0.0001);
      setScrolledVh(sVh);
      setTravelVh(tVh);
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

  // Anchor phases to the section's real viewport position, in vh units.
  // Clamp the read band so very short sections still get a sensible split.
  const readVh = Math.max(travelVh - ENTER_VH - CONTINUE_VH, 1);

  // ── ENTER (0 → ENTER_VH of pinned travel) ───────────────────────────
  const enterT = smooth(scrolledVh / ENTER_VH);
  const blockOpacity = enterT;
  const blockLift = (1 - enterT) * 8; // px

  // ── READ (ENTER_VH → ENTER_VH + readVh): per-line wave ──────────────
  const readT = clamp01((scrolledVh - ENTER_VH) / readVh);
  const reveal = readT * total;

  // ── CONTINUE (last CONTINUE_VH of travel): hold + footer reveal ─────
  const continueT = smooth((scrolledVh - ENTER_VH - readVh) / CONTINUE_VH);
  const showFooter = continueT > 0.05;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal"
      style={{ height: `${total * stepVh + 50}vh` }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col">
        <div className="flex-1 min-h-0 flex items-center w-full">
          <div
            className="fluid-canvas grid grid-cols-12"
            style={{ columnGap: "clamp(1.5rem, 3vw, 4rem)" }}
          >
            {/* Left rail — section label. Fades in across the ENTER phase
                so it lands together with the manifesto block. */}
            <aside
              className="col-span-12 md:col-span-3 md:pt-1"
              style={{
                opacity: blockOpacity,
                transform: `translateY(${blockLift}px)`,
                transition: "none",
              }}
            >
              <div className="flex md:block items-center gap-3 mb-6 md:mb-0">
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
                <div
                  className="md:hidden h-px flex-1 bg-charcoal/20 origin-left"
                  style={{ transform: `scaleX(${enterT})` }}
                />
              </div>
            </aside>

            {/* Manifesto column.
                Outer wrapper handles the ENTER block-fade. Inner stack
                handles per-line READ wave. */}
            <div
              className="col-span-12 md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-5"
              style={{
                opacity: blockOpacity,
                transform: `translateY(${blockLift}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  // Tighter rhythm on mobile (less vertical air per line),
                  // generous on desktop. Driven by a single clamp so the
                  // manifesto always fits one viewport.
                  gap: "clamp(0.95rem, 0.6rem + 1vw, 1.6rem)",
                }}
              >
                {LINES.map((line, i) => {
                  // Per-line wave inside the READ band.
                  // delta = how far past this line's centroid the reveal
                  // pointer has traveled, in line-units.
                  const delta = reveal - i;
                  // Reveal progress 0→1 across the WINDOW; locks at 1
                  // once past so prior lines never dim back.
                  const raw =
                    delta >= 0 ? 1 : clamp01(1 + delta / WINDOW);
                  const eased = easeOut(raw);

                  const opacity = DIM_OPACITY + (1 - DIM_OPACITY) * eased;
                  const lift = (1 - eased) * REVEAL_LIFT_PX;

                  const isClose = line.emphasis === "closer";
                  // Closer line: tracking relaxes 0.20em → 0.16em as it
                  // brightens — the same gesture used by the wordmark.
                  const closerTracking = isClose
                    ? `${(0.2 - 0.04 * eased).toFixed(3)}em`
                    : undefined;

                  return (
                    <p
                      key={i}
                      className={cn(
                        "font-brand text-charcoal italic will-change-[opacity,transform]",
                        isClose && "not-italic uppercase pt-2",
                      )}
                      style={{
                        fontWeight: 400,
                        fontSize: isClose
                          ? "clamp(1.05rem, 0.7rem + 0.55vw, 1.35rem)"
                          : "clamp(1.05rem, 0.7rem + 0.55vw, 1.4rem)",
                        lineHeight: 1.5,
                        opacity,
                        letterSpacing: closerTracking,
                        transform: `translateY(${lift}px)`,
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

        {/* Footer (destination cards) — CONTINUE phase. Rises in over the
            last 18% of scroll, after every line has resolved. Smoothstepped
            opacity + translate keep it from popping. */}
        {footer && (
          <div
            className="shrink-0 pb-6 md:pb-10"
            style={{
              opacity: continueT,
              transform: `translateY(${(1 - continueT) * 14}px)`,
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


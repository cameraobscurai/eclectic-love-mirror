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
  { text: "A time where things expand" },
  { text: "and start to take shape." },
  { text: "A shift toward refining what actually matters." },
  { text: "A moment where letting go becomes necessary." },
  { text: "And space to step back" },
  { text: "and see all of it clearly." },
  { text: "This isn't a reinvention." },
  { text: "It's a refinement." },
  { text: "A deeper understanding of what holds weight." },
  { text: "Of what lasts." },
  { text: "We are artists." },
  { text: "Designers." },
  { text: "Craftsmen." },
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

const STEP_VH_DESKTOP = 5;
const STEP_VH_MOBILE = 6;

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
const ENTER_VH_DESKTOP = 0.18;
const ENTER_VH_MOBILE = 0.3;
// Footer no longer animates, so the tail just needs a beat of breathing
// room after the closer line lands before sticky releases. Small + tight.
const CONTINUE_VH_DESKTOP = 0.12;
const CONTINUE_VH_MOBILE = 0.15;

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
  const [metrics, setMetrics] = useState({ scrolledVh: 0, travelVh: 1 });
  const [stepVh, setStepVh] = useState(STEP_VH_DESKTOP);
  const lastRef = useRef({ scrolledVh: 0, travelVh: 1 });

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
      // Lead-in: how far before the section pins we start counting.
      // Bumped on desktop so the dim manifesto is already visible while
      // the filmstrip tail is still on screen — kills the dead white gap.
      // Scale lead-in with viewport height so tall monitors don't show a
      // dead white band between the filmstrip tail and the dim manifesto.
      const isDesk = window.innerWidth >= 768;
      const LEAD_IN_VH = isDesk
        ? Math.min(0.32 + Math.max(vh - 900, 0) / 1400, 0.6)
        : 0.15;
      const sVh = Math.max(-rect.top / vh + LEAD_IN_VH, 0);
      const tVh = Math.max((el.offsetHeight - vh) / vh, 0.0001);
      // Skip re-render unless change is meaningful (~0.3vh ≈ 3px).
      const last = lastRef.current;
      if (
        Math.abs(sVh - last.scrolledVh) < 0.003 &&
        Math.abs(tVh - last.travelVh) < 0.003
      ) {
        return;
      }
      lastRef.current = { scrolledVh: sVh, travelVh: tVh };
      setMetrics({ scrolledVh: sVh, travelVh: tVh });
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

  const { scrolledVh, travelVh } = metrics;
  const total = LINES.length;
  const isMobile = stepVh === STEP_VH_MOBILE;
  // Tall-viewport bias: the taller the window, the more "dead air" sits
  // between the filmstrip tail and the manifesto's optical center. Shrink
  // ENTER (so the per-line wave starts sooner) and stretch the lookahead
  // (so the active line resolves earlier in the read band). Computed once
  // per render — no extra state, no layout thrash.
  const vhPx =
    typeof window !== "undefined" ? window.innerHeight : 900;
  // 0 at vh<=900, 1 at vh>=1300. Smooth ramp between.
  const tallBias = clamp01((vhPx - 900) / 400);
  const ENTER_VH = isMobile
    ? ENTER_VH_MOBILE
    : ENTER_VH_DESKTOP - 0.08 * tallBias; // 0.18 → 0.10
  const CONTINUE_VH = isMobile ? CONTINUE_VH_MOBILE : CONTINUE_VH_DESKTOP;

  // READ band budget in viewports — driven by line count + per-line step.
  const readBudgetVh = (total * stepVh) / 100;

  // Section is sized to fit one viewport of pinned display + the full
  // ENTER + READ + CONTINUE scroll travel. This guarantees the footer
  // reveal phase is actually reachable on every breakpoint.
  const sectionVh = (1 + ENTER_VH + readBudgetVh + CONTINUE_VH) * 100;

  // Anchor phases to the section's real viewport position, in vh units.
  const readVh = Math.max(travelVh - ENTER_VH - CONTINUE_VH, 1);

  // ── ENTER ────────────────────────────────────────────────────────────
  const enterT = smooth(scrolledVh / ENTER_VH);
  // Floor the block opacity so the manifesto is *present* (dim) before it
  // fully resolves — no more empty white pre-roll between filmstrip and copy.
  const blockOpacity = 0.35 + 0.65 * enterT;
  const blockLift = (1 - enterT) * 8; // px

  // ── READ: per-line wave ─────────────────────────────────────────────
  // Lookahead bias (in line-units): shifts each line's centroid earlier so
  // a line reaches full brightness slightly before it physically reaches
  // the optical center. Counteracts the perceived lag from sticky pinning
  // + smoothed scroll. Tuned by feel — 0.7 lands the highlight on the
  // line you're actively reading.
  const READ_LOOKAHEAD = 0.7 + 0.6 * tallBias; // 0.7 → 1.3 on tall screens
  const readT = clamp01((scrolledVh - ENTER_VH) / readVh);
  const reveal = readT * total + READ_LOOKAHEAD;

  // ── CONTINUE: footer is static ──────────────────────────────────────
  // The footer (DestinationStack) used to rise in over the closing
  // window. We removed that transition: stacking a second scroll-driven
  // animation on top of sticky release is what produced the perceived
  // hitch. Now the footer just sits flat under the manifesto and sticky
  // releases cleanly the moment the closer line resolves.
  const showFooter = true;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal"
      style={{ height: `${sectionVh}vh` }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col">
        {/* Pull manifesto above geometric center — optical center sits ~42%
            from the top, and it closes the gap to the filmstrip tail. */}
        <div className="flex-1 min-h-0 flex items-start w-full pt-[3vh] md:pt-[5vh]">
          <div className="fluid-canvas w-full">
            <div
              className="mx-auto flex flex-col items-center text-center"
              style={{
                maxWidth: "min(54rem, 92vw)",
                opacity: blockOpacity,
                transform: `translateY(${blockLift}px)`,
              }}
            >
              {/* Centered EVOLUTION label with hairline rules on either side */}
              <div className="flex items-center justify-center gap-4 md:gap-5 mb-5 md:mb-8 w-full">
                <div
                  className="h-px bg-charcoal/25 flex-1 max-w-[4rem] md:max-w-[6rem] origin-right"
                  style={{ transform: `scaleX(${enterT})` }}
                />
                <h2
                  id="evolution-heading"
                  className="font-brand uppercase text-charcoal/85"
                  style={{
                    fontWeight: 400,
                    letterSpacing: "0.42em",
                    fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                  }}
                >
                  Evolution
                </h2>
                <div
                  className="h-px bg-charcoal/25 flex-1 max-w-[4rem] md:max-w-[6rem] origin-left"
                  style={{ transform: `scaleX(${enterT})` }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(0.1rem, 0.35vh, 0.4rem)",
                  width: "100%",
                }}
              >
                {LINES.map((line, i) => {
                  const delta = reveal - i;
                  const raw = delta >= 0 ? 1 : clamp01(1 + delta / WINDOW);
                  const eased = easeOut(raw);

                  const opacity = DIM_OPACITY + (1 - DIM_OPACITY) * eased;
                  const lift = (1 - eased) * REVEAL_LIFT_PX;

                  const isClose = line.emphasis === "closer";
                  const isBrand = line.emphasis === "brand";
                  const closerTracking = isClose
                    ? `${(0.2 - 0.04 * eased).toFixed(3)}em`
                    : isBrand
                      ? "0.04em"
                      : undefined;

                  return (
                    <p
                      key={i}
                      className={cn(
                        "font-brand text-charcoal will-change-[opacity,transform]",
                        isClose && "uppercase",
                      )}
                      style={{
                        fontWeight: 400,
                        fontStyle: isClose ? "normal" : "italic",
                        // vh-based sizing keeps the entire 17-line manifesto
                        // inside the sticky viewport regardless of breakpoint.
                        // Bumped 2026-05-08 per owner — script reads a touch
                        // larger; closer line still slightly smaller for rhythm.
                        fontSize: isClose
                          ? "clamp(1rem, 1.98vh, 1.68rem)"
                          : "clamp(1.05rem, 2.14vh, 1.83rem)",
                        lineHeight: 1.25,
                        marginTop: isClose ? "0.6rem" : isBrand ? "0.4rem" : 0,
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

        {/* Footer (destination cards) — flat. No scroll-driven transition
            here; it would compete with the sticky release and produce a
            visible hitch. Cards are simply present under the manifesto. */}
        {footer && (
          <div className="shrink-0 pb-6 md:pb-10 -mt-[7vh] md:mt-0">
            <div className="fluid-canvas">{footer}</div>
          </div>
        )}
      </div>
    </section>
  );
}


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

type Line = { text: string; emphasis?: "closer"; stanzaBreak?: boolean };

// Stanza breaks define where the manifesto takes a breath. Anything that
// isn't flagged sits on the standard line-rhythm. No other per-line spacing
// overrides anywhere — the grid is the grid.
const LINES: Line[] = [
  { text: "Growth doesn't happen all at once." },
  { text: "It happens in phases." },
  { text: "There's a beginning that's rooted in curiosity.", stanzaBreak: true },
  { text: "A time where things expand" },
  { text: "and start to take shape." },
  { text: "A shift toward refining what actually matters.", stanzaBreak: true },
  { text: "A moment where letting go becomes necessary." },
  { text: "And space to step back" },
  { text: "and see all of it clearly.", stanzaBreak: true },
  { text: "This isn't a reinvention." },
  { text: "It's a refinement." },
  { text: "A deeper understanding of what holds weight." },
  { text: "Of what lasts.", stanzaBreak: true },
  { text: "We are artists." },
  { text: "Designers." },
  { text: "Craftsmen." },
  { text: "This is our evolution.", emphasis: "closer", stanzaBreak: true },
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
const STEP_VH_MOBILE = 5;

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
const ENTER_VH_MOBILE = 0.18;
// Footer no longer animates, so the tail just needs a beat of breathing
// room after the closer line lands before sticky releases. Small + tight.
const CONTINUE_VH_DESKTOP = 0.12;
const CONTINUE_VH_MOBILE = 0.05;

// Line-wave shape inside READ band.
// WINDOW widened so the dim → bright transition feels like prose unfolding,
// not a hard cursor. DIM raised so upcoming copy reads as "quiet, present"
// rather than ghosted — the latter looks like a layout bug at first glance.
const WINDOW = 2.4;          // line-units of crossfade overlap
const DIM_OPACITY = 0.32;    // resting brightness for upcoming lines
const REVEAL_LIFT_PX = 6;    // baseline shift during a line's reveal

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
// Cubic ease-out — gentle landing on each line's full brightness.
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
// Smoothstep — soft phase-boundary transitions (no hard cuts).
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

// Total vertical "line-units" the poem occupies: one per line + 0.8 per
// stanza break (matches --stanza-gap below). Used to derive the max
// per-line font-size that still clears the footer on short viewports.
const STANZA_BREAKS = LINES.filter((l) => l.stanzaBreak).length;
const POEM_LINE_UNITS = LINES.length + 0.8 * STANZA_BREAKS;

export function EvolutionNarrative({ footer }: { footer?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  // Scroll position expressed in VIEWPORT HEIGHTS past the moment the
  // section top reaches the viewport top. 0 = section just pinned;
  // (sectionHeight - vh) / vh = sticky about to release.
  const [metrics, setMetrics] = useState({ scrolledVh: 0, travelVh: 1 });
  const [stepVh, setStepVh] = useState(STEP_VH_DESKTOP);
  const [mounted, setMounted] = useState(false);
  // Max font-size (px) the poem can use without overflowing the available
  // area between the eyebrow rule and the footer links. Measured live so
  // the manifesto stays fluid on any viewport — never clips behind cards.
  const [poemMaxPx, setPoemMaxPx] = useState(20);
  const lastRef = useRef({ scrolledVh: 0, travelVh: 1 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const recompute = () => {
      const vh = window.innerHeight;
      const footerH = footerRef.current?.offsetHeight ?? 0;
      const eyebrowH = eyebrowRef.current?.offsetHeight ?? 0;
      // Available vertical space for the poem block, with a small safety
      // margin so descenders + lift transform never kiss the cards.
      const SAFETY_PX = 24;
      const available = Math.max(vh - footerH - eyebrowH - SAFETY_PX, 120);
      // line-height multiplier is 1.4 (see --line-height below). Each
      // line-unit costs (fontSize * 1.4) px.
      const maxPx = available / (POEM_LINE_UNITS * 1.4);
      setPoemMaxPx(maxPx);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (footerRef.current) ro.observe(footerRef.current);
    if (eyebrowRef.current) ro.observe(eyebrowRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [mounted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);

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
        : 0.34;
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
    const onResize = () => {
      syncBreakpoint();
      handler();
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", onResize);
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
  // Gate viewport-derived values behind `mounted` so SSR and the first client
  // render compute identical styles. Otherwise the client computes tallBias
  // from real innerHeight while SSR used the 900 fallback, producing a
  // hydration mismatch on every line's opacity/transform.
  const vhPx = mounted && typeof window !== "undefined" ? window.innerHeight : 900;
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
  const blockOpacity = 0.6 + 0.4 * enterT;
  const blockLift = (1 - enterT) * 8; // px

  // ── READ: per-line wave ─────────────────────────────────────────────
  // Lookahead bias (in line-units): shifts each line's centroid earlier so
  // a line reaches full brightness slightly before it physically reaches
  // the optical center. Counteracts the perceived lag from sticky pinning
  // + smoothed scroll. Tuned by feel — 0.7 lands the highlight on the
  // line you're actively reading.
  const READ_LOOKAHEAD = isMobile ? 1.1 : 0.7 + 0.6 * tallBias;
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
        <div className="flex-1 min-h-0 flex items-center w-full">
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
              <div
                ref={eyebrowRef}
                className="flex items-center justify-center gap-4 md:gap-5 mb-8 md:mb-8 w-full"
              >
                <div
                  className="h-px flex-1 max-w-[4rem] md:max-w-[6rem] origin-right"
                  style={{ background: "var(--hairline)", transform: `scaleX(${enterT})` }}
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
                  className="h-px flex-1 max-w-[4rem] md:max-w-[6rem] origin-left"
                  style={{ background: "var(--hairline)", transform: `scaleX(${enterT})` }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                  // Size against width AND a live JS-measured height cap.
                  // poemMaxPx is derived from real footer + eyebrow heights
                  // each resize, so the 17-line manifesto + 5 stanza breaks
                  // always clear the destination cards on any viewport — no
                  // clipping. Never grows past the original clamp ceiling.
                  ["--line-size" as string]: `min(clamp(0.78rem, 0.55rem + 0.5vw, 1.2rem), ${poemMaxPx}px)`,
                  ["--line-height" as string]: "1.4",
                  ["--stanza-gap" as string]: "calc(var(--line-size) * var(--line-height) * 0.8)",
                  fontSize: "var(--line-size)",
                  lineHeight: "var(--line-height)",
                  maxWidth: "min(42rem, 86vw)",
                }}
              >
                {LINES.map((line, i) => {
                  const delta = reveal - i;
                  // Read-through accumulation: dim → 1.0 over WINDOW line-units,
                  // then locks bright. WINDOW widened to 2.4 so the wave reads
                  // as prose unfolding rather than a hard cursor; DIM raised
                  // to 0.32 so upcoming copy is "quiet, present" not ghosted.
                  const raw = delta >= 0 ? 1 : clamp01(1 + delta / WINDOW);
                  const eased = easeOut(raw);
                  const opacity = DIM_OPACITY + (1 - DIM_OPACITY) * eased;
                  const lift = (1 - eased) * REVEAL_LIFT_PX;

                  const isClose = line.emphasis === "closer";
                  const closerTracking = isClose
                    ? `${(0.2 - 0.04 * eased).toFixed(3)}em`
                    : undefined;

                  return (
                    <p
                      key={i}
                      className={cn(
                        "font-brand text-charcoal will-change-[opacity,transform] text-center",
                        isClose && "uppercase",
                      )}
                      style={{
                        fontWeight: 400,
                        fontStyle: isClose ? "normal" : "italic",
                        marginTop: line.stanzaBreak && i > 0 ? "var(--stanza-gap)" : 0,
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
          <div ref={footerRef} className="shrink-0 pb-6 md:pb-10 mt-0">
            <div className="fluid-canvas">{footer}</div>
          </div>
        )}
      </div>
    </section>
  );
}


import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * EvolutionNarrative
 * ------------------
 * Scroll-driven manifesto with PRECISE single-line highlighting (à la
 * obscura.works). The line whose vertical center is closest to the
 * viewport center is "active" — full opacity. Everything else snaps to a
 * dim baseline. No soft gradient where 3 lines look half-bright at once.
 */

type Line = { text: string; emphasis?: "section" | "brand" | "closer" };

const LINES: Line[] = [
  { text: "Evolution", emphasis: "section" },
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
  { text: "We are Eclectic Hive", emphasis: "brand" },
  { text: "This is our evolution.", emphasis: "closer" },
];

export function EvolutionNarrative() {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const recompute = () => {
      const vCenter = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      lineRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - vCenter);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActiveIndex(best);
    };

    recompute();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        recompute();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recompute);
    };
  }, []);

  return (
    <section
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal py-24 md:py-36 px-6"
    >
      <div className="mx-auto max-w-3xl">
        {LINES.map((line, i) => (
          <NarrativeLine
            key={i}
            line={line}
            active={i === activeIndex}
            registerRef={(el) => (lineRefs.current[i] = el)}
          />
        ))}
      </div>
    </section>
  );
}

function NarrativeLine({
  line,
  active,
  registerRef,
}: {
  line: Line;
  active: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  if (line.emphasis === "section") {
    return (
      <div
        ref={registerRef}
        className="mb-8 md:mb-12 transition-opacity duration-300"
        style={{ opacity: active ? 1 : 0.55 }}
      >
        <h2
          id="evolution-heading"
          className="font-brand uppercase text-charcoal/85"
          style={{
            fontWeight: 400,
            letterSpacing: "0.32em",
            fontSize: "clamp(0.7rem, 1vw, 0.875rem)",
          }}
        >
          {line.text}
        </h2>
        <div className="mt-3 h-px w-12 bg-charcoal/30" />
      </div>
    );
  }

  const isBrand = line.emphasis === "brand";
  const isCloser = line.emphasis === "closer";

  return (
    <div
      ref={registerRef}
      className={cn(
        "py-2 md:py-2.5 transition-all duration-300 ease-out",
        (isBrand || isCloser) && "mt-6 md:mt-10",
      )}
      style={{
        opacity: active ? 1 : 0.18,
        transform: active ? "translateY(0)" : "translateY(2px)",
      }}
    >
      <p
        className={cn(
          "font-brand text-charcoal",
          isBrand ? "uppercase tracking-[0.18em]" : "italic",
        )}
        style={{
          fontWeight: 400,
          fontSize: isBrand
            ? "clamp(1.6rem, 3.6vw, 2.75rem)"
            : "clamp(1.35rem, 2.6vw, 2.1rem)",
          lineHeight: 1.25,
        }}
      >
        {line.text}
      </p>
    </div>
  );
}

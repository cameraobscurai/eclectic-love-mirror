import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * EvolutionNarrative
 * ------------------
 * Scroll-driven manifesto. Each line dims-in/dims-out as it enters and
 * leaves the viewport center, so the reader always has one "active" thought.
 *
 * - Pure visual; no behavior. Skips the highlight under reduced-motion.
 * - Section eyebrow + final brand-mark closer book-end the arc.
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
  const reduced = useReducedMotion();

  return (
    <section
      aria-labelledby="evolution-heading"
      className="relative bg-paper text-charcoal py-32 md:py-48 px-6"
    >
      <div className="mx-auto max-w-3xl">
        {LINES.map((line, i) => (
          <NarrativeLine key={i} line={line} index={i} reduced={!!reduced} />
        ))}
      </div>
    </section>
  );
}

function NarrativeLine({ line, index, reduced }: { line: Line; index: number; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  // Track this line's progress through the viewport.
  // 0 = just entering at the bottom; 1 = just exited at the top.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "end 10%"],
  });

  // Bell curve: dim → bright → dim, peaking when the line crosses center.
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.45, 0.55, 1],
    [0.18, 1, 1, 0.18],
  );
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [16, 0, -8]);

  if (line.emphasis === "section") {
    return (
      <motion.div
        ref={ref}
        style={reduced ? undefined : { opacity, y }}
        className="mb-10 md:mb-16"
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
        <div className="mt-4 h-px w-12 bg-charcoal/30" />
      </motion.div>
    );
  }

  const isBrand = line.emphasis === "brand";
  const isCloser = line.emphasis === "closer";

  return (
    <motion.div
      ref={ref}
      style={reduced ? undefined : { opacity, y }}
      className={cn(
        "py-3 md:py-4",
        (isBrand || isCloser) && "mt-8 md:mt-12",
      )}
    >
      <p
        className={cn(
          "font-brand text-charcoal",
          isBrand
            ? "uppercase tracking-[0.18em]"
            : isCloser
              ? "italic"
              : "italic",
        )}
        style={{
          fontWeight: 400,
          fontSize: isBrand
            ? "clamp(1.6rem, 3.6vw, 2.75rem)"
            : "clamp(1.35rem, 2.6vw, 2.1rem)",
          lineHeight: 1.3,
        }}
      >
        {line.text}
      </p>
    </motion.div>
  );
}

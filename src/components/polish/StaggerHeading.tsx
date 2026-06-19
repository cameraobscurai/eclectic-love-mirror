import { motion, useReducedMotion, type Variants } from "framer-motion";
import { createElement, type CSSProperties } from "react";

// Editorial heading reveal — splits text by lines (default) or words and
// staggers each segment with a soft fade + 14px rise. Triggers on first
// scroll-in via whileInView, respects prefers-reduced-motion.
//
// Usage:
//   <StaggerHeading
//     as="h1"
//     lines={["IMAGINED.", "DESIGNED.", "REALIZED."]}
//     className="page-title text-charcoal"
//   />
//   <StaggerHeading as="h2" text="BRING A PROJECT TO THE ATELIER." mode="words" />

type Props = {
  as?: "h1" | "h2" | "h3";
  text?: string;
  lines?: string[];
  mode?: "lines" | "words";
  className?: string;
  style?: CSSProperties;
  delay?: number;
  id?: string;
};

const container: Variants = {
  hidden: {},
  show: (delay: number = 0) => ({
    transition: { staggerChildren: 0.09, delayChildren: delay },
  }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

export function StaggerHeading({
  as = "h1",
  text,
  lines,
  mode = "lines",
  className,
  style,
  delay = 0,
  id,
}: Props) {
  const reduced = useReducedMotion();

  // Derive segments. If `lines` is supplied, render line-by-line with <br/>
  // semantics preserved. Otherwise split `text` by mode.
  const segments: string[] = lines
    ? lines
    : mode === "words"
      ? (text ?? "").split(/(\s+)/).filter((s) => s.length > 0)
      : [text ?? ""];

  // Reduced motion: render plain heading, no animation, full a11y string.
  if (reduced) {
    const plain = lines ? lines.join(" ") : text ?? "";
    return createElement(
      as,
      { className, style, id, "aria-label": plain },
      lines
        ? lines.map((l, i) => (
            <span key={i}>
              {l}
              {i < lines.length - 1 ? <br /> : null}
            </span>
          ))
        : plain,
    );
  }

  const a11yLabel = lines ? lines.join(" ") : text ?? "";
  const MotionTag = motion[as] as typeof motion.h1;

  return (
    <MotionTag
      id={id}
      className={className}
      style={style}
      aria-label={a11yLabel}
      variants={container}
      custom={delay}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
    >
      {segments.map((seg, i) => {
        const isLine = !!lines || mode === "lines";
        // Whitespace tokens shouldn't animate — keep layout stable.
        if (/^\s+$/.test(seg)) return <span key={i} aria-hidden>{seg}</span>;
        return (
          <span
            key={i}
            aria-hidden
            style={{
              display: isLine ? "block" : "inline-block",
              overflow: "hidden",
              // inline-block words need a small breathing space
              ...(isLine ? {} : { paddingRight: "0.01em" }),
            }}
          >
            <motion.span
              variants={item}
              style={{ display: "inline-block", willChange: "transform, opacity" }}
            >
              {seg}
            </motion.span>
          </span>
        );
      })}
    </MotionTag>
  );
}

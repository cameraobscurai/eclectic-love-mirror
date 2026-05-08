import { Link } from "@tanstack/react-router";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";


/**
 * DestinationStack
 * ----------------
 * Editorial adaptation of droflower's ParallaxDepthReveal: three destination
 * cards begin stacked + scaled down + tilted in 3D, then resolve into a clean
 * row as the section centers in the viewport.
 *
 * Restraint dial (vs droflower):
 *   - rotateX max 10° (was 12°)
 *   - rotateZ ±3° (was ±6°)
 *   - scale floor 0.86 (was 0.72)
 *   - paper background, hairline border, no rounded corners
 *
 * Mobile + reduced-motion: skip the 3D entirely. Static row, simple
 * stagger-fade so the page still glues together.
 */

export interface Destination {
  href: string;
  label: string;
  title: string;
}

interface DestinationStackProps {
  destinations: ReadonlyArray<Destination>;
}

function useCardTransforms(
  progress: MotionValue<number>,
  index: number,
  total: number,
) {
  const center = (total - 1) / 2;
  const offset = index - center; // -1, 0, 1 for 3 cards
  const absOffset = Math.abs(offset);

  // Resolution lands a touch before the section fully arrives so the cards
  // settle, then breathe — they don't slam in at the very last frame.
  const endPoint = 0.7 + absOffset * 0.08;
  const holdEnd = 0.18;

  // Horizontal pull toward center (outers slide in, middle stays put).
  const stackX = -offset * 28;
  const x = useTransform(progress, [0, holdEnd, endPoint], [stackX, stackX * 0.96, 0]);

  // Vertical lift — back cards sit lower so the stack reads like a fan.
  const stackY = (total - 1 - index) * 18;
  const y = useTransform(progress, [0, holdEnd, endPoint], [stackY, stackY * 0.94, 0]);

  // Gentle scale — never below 0.86 so the cards still feel like cards.
  const startScale = 0.86 + index * 0.04;
  const scale = useTransform(progress, [0, holdEnd, endPoint], [startScale, startScale + 0.01, 1]);

  // Tone-down rotateZ ±3°.
  const stackRotateZ = offset * 3;
  const rotateZ = useTransform(progress, [0, holdEnd, endPoint], [stackRotateZ, stackRotateZ * 0.95, 0]);

  // Editorial 3D tilt — 8° max, falls to 0 on resolve.
  const rotateX = useTransform(progress, [0, holdEnd, endPoint], [8, 7.5, 0]);

  // Opacity fan — back card dimmest, front card already half-visible.
  const startOpacity = 0.25 + index * 0.18;
  const opacity = useTransform(
    progress,
    [0, holdEnd, endPoint * 0.55, endPoint],
    [startOpacity, startOpacity + 0.05, 0.85, 1],
  );

  // Arrow + hairline reveal trails the card resolution.
  const detailReveal = useTransform(progress, [endPoint * 0.85, endPoint], [0, 1]);

  return { x, y, scale, rotateZ, rotateX, opacity, detailReveal };
}

function DestinationCard({
  dest,
  index,
  total,
  progress,
  isStatic,
}: {
  dest: Destination;
  index: number;
  total: number;
  progress: MotionValue<number>;
  isStatic: boolean;
}) {
  const { x, y, scale, rotateZ, rotateX, opacity, detailReveal } =
    useCardTransforms(progress, index, total);

  const numberLabel = String(index + 1).padStart(2, "0");

  const inner = (
    <Link
      to={dest.href}
      preload="viewport"
      aria-label={`${dest.title} — ${dest.label}`}
      className="group block h-full w-full bg-paper outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40"
    >
      <div
        className="relative flex h-full flex-col justify-between"
        style={{
          paddingInline: "clamp(1.25rem, 0.5rem + 1vw, 2rem)",
          paddingBlock: "clamp(1.5rem, 0.8rem + 1vw, 2.25rem)",
        }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="font-brand uppercase text-charcoal/45"
            style={{
              fontWeight: 400,
              letterSpacing: "0.32em",
              fontSize: "clamp(0.6rem, 0.7vw, 0.7rem)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {numberLabel} / {String(total).padStart(2, "0")}
          </span>
          <motion.svg
            style={isStatic ? undefined : { opacity: detailReveal }}
            className="h-3.5 w-3.5 shrink-0 text-charcoal/60 transition-transform duration-500 ease-out group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.25}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </motion.svg>
        </div>

        <div className="mt-6 md:mt-10">
          <h3
            className="font-brand uppercase text-charcoal"
            style={{
              fontWeight: 500,
              letterSpacing: "0.04em",
              fontSize: "clamp(1.1rem, 1.6vw, 1.45rem)",
              lineHeight: 1,
            }}
          >
            {dest.title}
          </h3>
          <p
            className="mt-2 font-brand uppercase text-charcoal/55 truncate"
            style={{
              fontWeight: 400,
              letterSpacing: "0.18em",
              fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
            }}
          >
            {dest.label}
          </p>
        </div>

        {/* hairline that draws in on resolve */}
        <motion.div
          aria-hidden
          className="absolute left-5 right-5 md:left-7 md:right-7 top-0 h-px bg-charcoal/20 origin-left"
          style={
            isStatic
              ? { transform: "scaleX(1)" }
              : { scaleX: detailReveal }
          }
        />
      </div>
    </Link>
  );

  if (isStatic) {
    return (
      <div
        className="border border-charcoal/12"
        style={{
          height: "clamp(148px, 9rem + 3vw, 13rem)",
          animation: `dest-fade 700ms ${index * 80}ms ease-out both`,
        }}
      >
        {inner}
      </div>
    );
  }

  return (
    <motion.div
      className="border border-charcoal/12 gpu-accelerated"
      style={{
        height: "clamp(148px, 9rem + 3vw, 13rem)",
        x,
        y,
        scale,
        rotateZ,
        rotateX,
        opacity,
        zIndex: total - index,
        transformStyle: "preserve-3d",
        transformOrigin: "center center",
        willChange: "transform, opacity",
      }}
    >
      {inner}
    </motion.div>
  );
}

export function DestinationStack({ destinations }: DestinationStackProps) {
  // Cards always render in their resolved state with a gentle stagger-fade.
  // The previous 3D parallax entrance overlapped the Evolution sticky
  // release, producing a perceived hitch. Static is calmer and more
  // editorial — the cards are simply there when you arrive.
  const dummyProgress = useScroll().scrollYProgress; // unused, kept for type stability

  return (
    <div
      className="relative grid grid-cols-1 md:grid-cols-3"
      style={{ gap: "clamp(0.75rem, 0.4rem + 0.6vw, 1.25rem)" }}
    >
      <style>{`
        @keyframes dest-fade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {destinations.map((dest, i) => (
        <DestinationCard
          key={dest.href}
          dest={dest}
          index={i}
          total={destinations.length}
          progress={dummyProgress}
          isStatic
        />
      ))}
    </div>
  );
}

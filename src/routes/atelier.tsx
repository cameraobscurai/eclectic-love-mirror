import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { MediaAperture } from "@/components/media-aperture";
import { AtelierTeam } from "@/components/atelier/team";
import { HeroImage, heroPreloadLink } from "@/components/hero-image";
import atelierHero from "@/assets/atelier-hero.png?preset=hero";
import atelierStudioWide from "@/assets/atelier-studio-wide.png";
import imaginedTent from "@/assets/atelier/imagined-tent-sketch.png";
import designedSofa from "@/assets/atelier/designed-sofa-wireframe.png";
import realizedCeremony from "@/assets/atelier/realized-aspen-ceremony.webp";
import fabricationStillLife from "@/assets/atelier/fabrication-still-life.png";
import fabricationFoliage from "@/assets/atelier/fabrication-foliage-study.png";
import fabricationTentTriptych from "@/assets/atelier/fabrication-tent-triptych.png";
import workbenchChairSketch from "@/assets/atelier/workbench-chair-sketch.png";
import warehouseStudioCollage from "@/assets/atelier/studio-collage.png";

// ---------------------------------------------------------------------------
// Atelier by The Hive — operational proof page
//
// Six sections in fixed order:
//   1. Hero
//   2. THE HIVE       (real staff module)
//   3. The Artist's Studio
//   4. Scope + Fabrication (interactive hover reveal — Pass 3)
//   5. Atelier Approach    (scroll-pinned triptych — Pass 3)
//   6. CTA
// ---------------------------------------------------------------------------

interface SpaceImage {
  src: string;
  alt: string;
}

const SPACE_IMAGES: SpaceImage[] = [];

const CAPABILITIES = [
  "LOUNGE FURNITURE",
  "BARS + COCKTAIL TABLES",
  "LIGHTING",
  "TABLEWARE",
  "DINING TABLES + CHAIRS",
  "CUSTOM DESIGN + FABRICATION",
  "STAGE DESIGN",
  "DRAPE",
  "ACCENTS + STYLING",
  "PRODUCTION MANAGEMENT",
];

// (Removed: per-capability image swap was overengineered. The original
// three-square material board sits below the list as quiet evidence.)

const APPROACH_STEPS = [
  {
    number: "01",
    label: "IMAGINED",
    image: {
      src: imaginedTent,
      alt: "Hand-drawn pencil sketch — interior of a tented event with draped panels and a central tree.",
    },
  },
  {
    number: "02",
    label: "DESIGNED",
    image: {
      src: designedSofa,
      alt: "Technical line drawing of a fringed sofa — design phase rendering.",
    },
  },
  {
    number: "03",
    label: "REALIZED",
    image: {
      src: realizedCeremony,
      alt: "Realized installation — outdoor ceremony aisle framed by autumn aspens in the Colorado mountains.",
    },
  },
] as const;

export const Route = createFileRoute("/atelier")({
  head: () => ({
    meta: [
      {
        title: "Atelier by The Hive — Design + Fabrication | Eclectic Hive",
      },
      {
        name: "description",
        content:
          "Atelier by The Hive: designers, producers, and a fabrication house. Imagined. Designed. Realized.",
      },
      {
        property: "og:title",
        content: "Atelier by The Hive — Eclectic Hive",
      },
      {
        property: "og:description",
        content: "Imagined. Designed. Realized. Design + fabrication studio.",
      },
      {
        property: "og:image",
        content: atelierHero.img.src,
      },
      {
        name: "twitter:image",
        content: atelierHero.img.src,
      },
    ],
    links: [heroPreloadLink(atelierHero)],
  }),
  component: AtelierPage,
});

function AtelierPage() {
  const reduced = useReducedMotion();

  // --- Hero parallax (item 3) ---------------------------------------------
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroImageY = useTransform(heroProgress, [0, 1], ["0%", "18%"]);
  const heroTextY = useTransform(heroProgress, [0, 1], ["0%", "-8%"]);

  // --- Fabrication list hover (item 1) ------------------------------------
  // Tracks the currently-hovered/focused row so we can highlight the number,
  // label, and slide in the bottom accent line. Null = no row engaged.
  const [fabHover, setFabHover] = useState<number | null>(null);

  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{ paddingTop: "var(--nav-h)" }}
    >
      {/* 1. HERO */}
      <section
        ref={heroRef}
        className="px-6 lg:px-12 overflow-hidden"
        style={{
          paddingTop: "clamp(64px, 7vw, 112px)",
          paddingBottom: "clamp(48px, 5vw, 80px)",
        }}
      >
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-12 gap-10 md:gap-12 items-end">
          <motion.div
            className="md:col-span-7"
            style={reduced ? undefined : { y: heroTextY, willChange: "transform" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              ATELIER BY THE HIVE
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.26em] text-charcoal/75 max-w-[44ch]">
              WE ARE DESIGNERS, PRODUCERS, AND A FABRICATION HOUSE.
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] uppercase tracking-[0.04em]">
              Imagined.
              <br />
              Designed.
              <br />
              Realized.
            </h1>
            <p className="mt-8 text-xs uppercase tracking-[0.22em] text-charcoal/70 leading-[1.8] max-w-[52ch]">
              The Atelier is where design authorship, material exploration, and fabrication converge — through process &amp; intention.
            </p>
          </motion.div>
          <div className="md:col-span-5">
            <motion.div
              className="relative w-full overflow-hidden"
              style={
                reduced
                  ? { aspectRatio: "4/5" }
                  : { aspectRatio: "4/5", y: heroImageY, willChange: "transform" }
              }
            >
              <HeroImage
                source={atelierHero}
                alt="Atelier moodboard — figure study and material swatches behind glass."
                focalPoint={{ x: 50, y: 45 }}
                scrim="none"
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. THE HIVE */}
      <Section eyebrow="02 — THE HIVE">
        <AtelierTeam />
      </Section>

      {/* 3. THE ARTIST'S STUDIO */}
      <Section eyebrow="THE ARTIST'S STUDIO">
        {SPACE_IMAGES.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-3">
            {SPACE_IMAGES.slice(0, 3).map((img, i) => (
              <div key={i} className="aspect-[4/5] bg-white overflow-hidden">
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-12">
              <MediaAperture
                ratio="16/9"
                src={atelierStudioWide}
                alt="The Atelier — interior view of the studio with the elevated container office, lounge seating, and plant-lined floor."
                label="STUDIO"
                lazy={false}
                sizes="(min-width: 1024px) 1280px, 100vw"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <MediaAperture
                ratio="4/5"
                src={workbenchChairSketch}
                alt="Pencil sketch of a chair design with measurement annotations, hung as a draped canvas in the workbench."
                label="WORKBENCH"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <MediaAperture
                ratio="4/5"
                src={warehouseStudioCollage}
                alt="Black-and-white collage — studio interiors, fabrication in progress, and a finished tasseled stool."
                label="WAREHOUSE"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </div>
          </>
        )}
      </Section>

      {/* 4. THE FABRICATION — list with hover state, then the original
          three-image board underneath. Image swap was overengineered; the
          three plates work better as their own quiet evidence row. */}
      <Section eyebrow="THE FABRICATION">
        <ul style={{ borderColor: "var(--archive-rule)" }}>
          {CAPABILITIES.map((item, i) => {
            const isActive = fabHover === i;
            return (
              <li
                key={item}
                onMouseEnter={() => setFabHover(i)}
                onFocus={() => setFabHover(i)}
                onMouseLeave={() => setFabHover(null)}
                onBlur={() => setFabHover(null)}
                className="relative py-4 flex items-baseline gap-6 border-t first:border-t-0 cursor-default transition-colors duration-300"
                style={{ borderColor: "var(--archive-rule)" }}
                tabIndex={0}
              >
                {/* Sliding 1px accent line — origin left, scaleX 0 → 1 */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 right-0 bottom-0 h-px origin-left transition-transform duration-300 ease-out"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--charcoal) 20%, transparent)",
                    transform: isActive ? "scaleX(1)" : "scaleX(0)",
                  }}
                />
                <span
                  className={
                    "text-[10px] tracking-[0.22em] tabular-nums w-8 transition-colors duration-300 " +
                    (isActive ? "text-charcoal/85" : "text-charcoal/40")
                  }
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={
                    "text-[13px] tracking-[0.18em] uppercase transition-colors duration-300 " +
                    (isActive ? "text-charcoal" : "text-charcoal/85")
                  }
                >
                  {item}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Original material board — sketch · pattern study · realized. */}
        <div className="mt-12 grid grid-cols-3 gap-3">
          <MediaAperture
            ratio="1/1"
            src={fabricationStillLife}
            alt="Charcoal still-life study — glassware and florals."
            sizes="(min-width: 1024px) 30vw, 33vw"
          />
          <MediaAperture
            ratio="1/1"
            src={fabricationFoliage}
            alt="Watercolor pattern study — foliage and birds."
            sizes="(min-width: 1024px) 30vw, 33vw"
          />
          <MediaAperture
            ratio="1/1"
            src={fabricationTentTriptych}
            alt="Sketch to render to realized photo — a tented dining install across three stages."
            sizes="(min-width: 1024px) 30vw, 33vw"
          />
        </div>
      </Section>

      {/* 5. ATELIER APPROACH — scroll-pinned triptych (Pass 3 item 2) */}
      <Section eyebrow="ATELIER APPROACH">
        {reduced ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {APPROACH_STEPS.map((step) => (
              <ApproachStep
                key={step.number}
                number={step.number}
                label={step.label}
                image={step.image}
              />
            ))}
          </div>
        ) : (
          <ApproachScrollPin steps={APPROACH_STEPS} />
        )}
      </Section>

      {/* 6. CTA */}
      <section className="px-6 lg:px-12 mt-24">
        <div className="max-w-[1400px] mx-auto">
          <div
            className="border-t pt-12"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              BEGIN
            </p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] uppercase tracking-[0.04em] max-w-2xl">
              Bring a project to the Atelier.
            </h2>
            <Link
              to="/contact"
              className="mt-8 inline-block text-xs uppercase tracking-[0.22em] border border-charcoal px-6 py-3 hover:bg-charcoal hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              START A CONVERSATION
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 lg:px-12 mt-24">
      <div className="max-w-[1400px] mx-auto">
        <div
          className="border-t pt-10"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50 mb-10">
            {eyebrow}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

function ApproachStep({
  number,
  label,
  image,
}: {
  number: string;
  label: string;
  image?: { src: string; alt: string };
}) {
  return (
    <div>
      <MediaAperture
        ratio="3/4"
        src={image?.src}
        alt={image?.alt}
        sizes="(min-width: 768px) 30vw, 100vw"
      />
      <p
        className="mt-6 pt-4 font-display text-2xl text-charcoal/45 tabular-nums border-t"
        style={{ borderColor: "var(--archive-rule)" }}
      >
        {number}
      </p>
      <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.06em]">
        {label}
      </h3>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scroll-pinned approach triptych (Pass 3 item 2)
//
// Outer container is 300vh tall; inner is sticky and fills the viewport
// minus the nav. Scroll progress maps to active step (0/1/2). Each card
// crossfades + drifts on the y-axis. Number+label stagger 120ms behind the
// image. Reduced-motion bypasses this entirely.
// ---------------------------------------------------------------------------
function ApproachScrollPin({
  steps,
}: {
  steps: ReadonlyArray<{
    number: string;
    label: string;
    image: { src: string; alt: string };
  }>;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div ref={outerRef} className="relative" style={{ height: "300vh" }}>
      <div
        className="sticky flex items-center"
        style={{
          top: "var(--nav-h)",
          height: "calc(100vh - var(--nav-h))",
        }}
      >
        <div className="relative w-full max-w-3xl mx-auto" style={{ aspectRatio: "3/4" }}>
          {steps.map((step, i) => (
            <ApproachScrollCard
              key={step.number}
              step={step}
              index={i}
              total={steps.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ApproachScrollCard({
  step,
  index,
  total,
  progress,
}: {
  step: { number: string; label: string; image: { src: string; alt: string } };
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  // Each step owns a slice of [0, 1]; window centered on its slice with
  // crossfade ramps on either side. All offsets must stay in [0,1] AND be
  // strictly monotonic — framer-motion's WAAPI animator throws otherwise.
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const slice = 1 / total;
  const center = slice * (index + 0.5);
  const halfFade = slice * 0.6;
  const inStart = clamp01(center - halfFade - slice * 0.5);
  const inEnd = clamp01(center - slice * 0.5 + halfFade * 0.5);
  const outStart = clamp01(center + slice * 0.5 - halfFade * 0.5);
  const outEnd = clamp01(center + halfFade + slice * 0.5);

  // Text trails the image by ~120ms — shift each breakpoint slightly later,
  // then clamp again so the last card's outEnd doesn't escape [0,1].
  const SHIFT = 0.02;
  const tInStart = clamp01(inStart + SHIFT);
  const tInEnd = clamp01(inEnd + SHIFT);
  const tOutStart = clamp01(outStart + SHIFT);
  const tOutEnd = clamp01(outEnd + SHIFT);

  const opacity = useTransform(
    progress,
    [inStart, inEnd, outStart, outEnd],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    progress,
    [inStart, inEnd, outStart, outEnd],
    [24, 0, 0, -24]
  );
  const textOpacity = useTransform(
    progress,
    [tInStart, tInEnd, tOutStart, tOutEnd],
    [0, 1, 1, 0]
  );
  const textY = useTransform(
    progress,
    [tInStart, tInEnd, tOutStart, tOutEnd],
    [24, 0, 0, -24]
  );

  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ opacity, willChange: "opacity, transform" }}
    >
      <motion.div
        className="relative w-full overflow-hidden bg-white"
        style={{ aspectRatio: "3/4", y, willChange: "transform" }}
      >
        <img
          src={step.image.src}
          alt={step.image.alt}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </motion.div>
      <motion.div
        style={{ opacity: textOpacity, y: textY, willChange: "opacity, transform" }}
      >
        <p
          className="mt-6 pt-4 font-display text-2xl text-charcoal/45 tabular-nums border-t"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          {step.number}
        </p>
        <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.06em]">
          {step.label}
        </h3>
      </motion.div>
    </motion.div>
  );
}

import type { GalleryImage, GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryProjectSpread
//
// A real magazine spread per project. Rule-driven sequence built from the
// plate count: cover → diptych → full-bleed → quote → triptych → detail
// strip → cycle. Photos do the work, layout supports them.
// ---------------------------------------------------------------------------

interface Props {
  project: GalleryProject;
}

type Block =
  | { kind: "single"; plate: GalleryImage }
  | { kind: "diptych"; plates: [GalleryImage, GalleryImage] }
  | { kind: "triptych"; plates: [GalleryImage, GalleryImage, GalleryImage] }
  | { kind: "quote"; plate: GalleryImage }
  | { kind: "detailStrip"; plates: GalleryImage[] };

function buildSequence(plates: GalleryImage[], summary: string): Block[] {
  // Skip the cover (plate 0) — it's rendered separately as the hero.
  const rest = plates.slice(1);
  const blocks: Block[] = [];
  let i = 0;
  let sliceCount = 0;

  // Pattern repeats every 6 plates: diptych(2), single(1), quote(1), triptych(3)
  // = 7 plates per pattern. Pad with detailStrip when leftover.
  while (i < rest.length) {
    const remaining = rest.length - i;

    if (remaining >= 2 && sliceCount % 4 === 0) {
      blocks.push({ kind: "diptych", plates: [rest[i], rest[i + 1]] });
      i += 2;
    } else if (sliceCount % 4 === 1) {
      blocks.push({ kind: "single", plate: rest[i] });
      i += 1;
    } else if (sliceCount % 4 === 2) {
      // Quote uses the photograph as a backing plate with summary overlaid.
      // Only insert quote on the first cycle so it doesn't repeat the copy.
      if (sliceCount === 2 && summary) {
        blocks.push({ kind: "quote", plate: rest[i] });
      } else {
        blocks.push({ kind: "single", plate: rest[i] });
      }
      i += 1;
    } else if (remaining >= 3) {
      blocks.push({
        kind: "triptych",
        plates: [rest[i], rest[i + 1], rest[i + 2]],
      });
      i += 3;
    } else {
      // Tail — use whatever is left as a detail strip (1–3 plates).
      blocks.push({ kind: "detailStrip", plates: rest.slice(i) });
      i = rest.length;
    }
    sliceCount += 1;
  }

  return blocks;
}

export function GalleryProjectSpread({ project }: Props) {
  const cover = project.heroImage;
  const blocks = buildSequence(project.detailImages.length > 0 ? project.detailImages : [cover], project.summary);

  return (
    <article className="text-cream">
      {/* Cover plate — full-bleed, title overlaid */}
      <header className="relative w-full overflow-hidden bg-[color-mix(in_oklab,var(--cream)_4%,var(--charcoal))]">
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          <img
            src={cover.src}
            alt={cover.alt}
            loading="eager"
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/0 to-charcoal/30"
          />
          <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-12">
            <div className="flex items-baseline justify-between gap-6 text-[10px] uppercase tracking-[0.3em] text-cream/80">
              <span className="tabular-nums">{project.number}</span>
              <span>{project.region} · {project.kind} · {project.year}</span>
            </div>
            <div>
              <h1 className="font-display text-[clamp(3rem,8vw,7rem)] leading-[0.95] tracking-[-0.015em]">
                {project.name}
              </h1>
              <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-cream/70">
                {project.location} · {String(project.detailImages.length).padStart(2, "0")} Plates
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Lede paragraph — quiet intro, sets the room before the spreads start */}
      <section className="px-6 lg:px-12 py-20 lg:py-28">
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          <p className="lg:col-span-2 text-[10px] uppercase tracking-[0.3em] text-cream/45">
            The Environment
          </p>
          <p className="lg:col-span-8 lg:col-start-4 font-display text-[clamp(1.5rem,2.4vw,2.25rem)] leading-[1.25] tracking-[-0.005em] text-cream/90">
            {project.summary}
          </p>
        </div>
      </section>

      {/* Editorial blocks */}
      <div className="space-y-20 lg:space-y-32">
        {blocks.map((block, idx) => (
          <SpreadBlock key={idx} block={block} index={idx} project={project} />
        ))}
      </div>
    </article>
  );
}

function SpreadBlock({
  block,
  index,
  project,
}: {
  block: Block;
  index: number;
  project: GalleryProject;
}) {
  switch (block.kind) {
    case "single":
      // Alternate full-bleed (every 3rd) vs centered max-width.
      if (index % 3 === 0) {
        return (
          <figure className="w-full">
            <img
              src={block.plate.src}
              alt={block.plate.alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block w-full h-auto"
            />
          </figure>
        );
      }
      return (
        <figure className="px-6 lg:px-12">
          <div className="max-w-[1300px] mx-auto">
            <img
              src={block.plate.src}
              alt={block.plate.alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block w-full h-auto"
            />
          </div>
        </figure>
      );

    case "diptych":
      return (
        <div className="px-6 lg:px-12">
          <div className="max-w-[1500px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {block.plates.map((p) => (
              <figure key={p.src} className="overflow-hidden">
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="block w-full h-auto"
                />
              </figure>
            ))}
          </div>
        </div>
      );

    case "triptych":
      return (
        <div className="px-6 lg:px-12">
          <div className="max-w-[1500px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {block.plates.map((p) => (
              <figure key={p.src} className="overflow-hidden">
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="block w-full h-auto"
                />
              </figure>
            ))}
          </div>
        </div>
      );

    case "quote":
      return (
        <section className="relative w-full overflow-hidden">
          <div className="relative w-full" style={{ aspectRatio: "21 / 9" }}>
            <img
              src={block.plate.src}
              alt={block.plate.alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-charcoal/55"
            />
            <div className="absolute inset-0 flex items-center justify-center px-6 lg:px-12">
              <blockquote className="max-w-3xl text-center font-display text-[clamp(1.5rem,3vw,2.75rem)] leading-[1.2] tracking-[-0.005em] text-cream italic">
                “{project.region}, {project.year} — an environment composed in plates.”
              </blockquote>
            </div>
          </div>
        </section>
      );

    case "detailStrip":
      return (
        <div className="px-6 lg:px-12">
          <div className="max-w-[1500px] mx-auto grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {block.plates.map((p) => (
              <figure key={p.src} className="overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="block w-full h-full object-cover"
                />
              </figure>
            ))}
          </div>
        </div>
      );
  }
}

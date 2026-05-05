interface GalleryHeroProps {
  total: number;
}

export function GalleryHero({ total }: GalleryHeroProps) {
  return (
    <section className="pt-32 pb-12 lg:pt-40 lg:pb-16 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div>
            <p className="text-cream/40 text-xs uppercase tracking-[0.3em] mb-4">
              Selected Work — {String(total).padStart(2, "0")} Environments
            </p>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-cream font-light tracking-tight uppercase">
              The Gallery
            </h1>
          </div>
          <p className="text-cream/50 text-base lg:text-lg max-w-md leading-relaxed uppercase tracking-[0.08em]">
            Cinematic event environments designed, fabricated, and produced
            from Denver, Colorado. A small number of projects each year.
          </p>
        </div>
      </div>
    </section>
  );
}

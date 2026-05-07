interface GalleryHeroProps {
  total: number;
}

export function GalleryHero({ total }: GalleryHeroProps) {
  return (
    <section className="pt-36 pb-14 lg:pt-44 lg:pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <p className="text-cream/45 text-[10px] uppercase tracking-[0.32em] mb-6">
          Selected Work · {String(total).padStart(2, "0")}
        </p>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-cream font-light tracking-[-0.005em] uppercase leading-[0.95]">
          The Gallery
        </h1>
      </div>
    </section>
  );
}

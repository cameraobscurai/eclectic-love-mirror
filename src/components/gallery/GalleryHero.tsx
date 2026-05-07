interface GalleryHeroProps {
  total: number;
}

export function GalleryHero({ total }: GalleryHeroProps) {
  return (
    <section className="pt-28 pb-8 lg:pt-32 lg:pb-10 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <p className="text-cream/45 text-[10px] uppercase tracking-[0.32em] mb-6">
          Selected Work · {String(total).padStart(2, "0")}
        </p>
        <h1 className="page-title text-cream">
          The Gallery
        </h1>
      </div>
    </section>
  );
}

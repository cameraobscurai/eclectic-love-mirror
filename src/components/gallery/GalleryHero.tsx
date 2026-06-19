import { StaggerHeading } from "@/components/polish/StaggerHeading";

interface GalleryHeroProps {
  total: number;
}

export function GalleryHero({ total }: GalleryHeroProps) {
  return (
    <section className="pt-24 pb-8 lg:pt-32 lg:pb-12 px-6 lg:px-12">
      <div className="max-w-[1600px] mx-auto">
        <p className="text-cream/45 text-[10px] uppercase tracking-[0.32em] mb-6">
          <span className="tabular-nums">01</span> — Selected Work · {String(total).padStart(2, "0")}
        </p>
        <StaggerHeading
          as="h1"
          text="The Gallery"
          mode="words"
          className="page-title text-cream"
        />
      </div>
    </section>
  );
}

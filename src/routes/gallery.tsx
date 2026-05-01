import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "The Gallery — Selected Work | Eclectic Hive" },
      { name: "description", content: "Selected work from Eclectic Hive: cinematic event environments, weddings, galas, and installations." },
      { property: "og:title", content: "The Gallery — Eclectic Hive" },
      { property: "og:description", content: "Selected work from Eclectic Hive." },
    ],
  }),
  component: GalleryPage,
});
function GalleryPage() {
  return (
    <main className="min-h-screen bg-charcoal text-cream pt-32 pb-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-cream/50">The Gallery</p>
        <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,7rem)] leading-[0.95]">Selected Work</h1>
        <p className="mt-10 max-w-2xl text-lg leading-relaxed text-cream/70">
          Distorted-card gallery coming next — for Amangiri, Lynden Lane, and more.
        </p>
      </div>
    </main>
  );
}

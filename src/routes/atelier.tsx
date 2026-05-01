import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/atelier")({
  head: () => ({
    meta: [
      { title: "Atelier by The Hive — Design + Fabrication | Eclectic Hive" },
      { name: "description", content: "Atelier by The Hive: custom design and fabrication for cinematic event environments." },
      { property: "og:title", content: "Atelier by The Hive — Eclectic Hive" },
      { property: "og:description", content: "Custom design + fabrication for luxury events." },
    ],
  }),
  component: AtelierPage,
});
function AtelierPage() {
  return (
    <main className="min-h-screen bg-cream text-charcoal pt-32 pb-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal/50">Atelier by The Hive</p>
        <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,7rem)] leading-[0.95]">Design <em>+</em> Fabrication</h1>
        <p className="mt-10 max-w-2xl text-lg leading-relaxed text-charcoal/70">
          A working studio where concept becomes object. Bespoke pieces, custom installations, and signature
          environments built in-house for cinematic events.
        </p>
      </div>
    </main>
  );
}

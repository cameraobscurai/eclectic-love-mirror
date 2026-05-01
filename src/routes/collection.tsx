import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Hive Signature Collection — Inventory | Eclectic Hive" },
      { name: "description", content: "Browse the Hive Signature Collection: a curated inventory of furniture, objects, and bespoke pieces for events." },
      { property: "og:title", content: "Hive Signature Collection — Eclectic Hive" },
      { property: "og:description", content: "Signature inventory of luxury event furniture and objects." },
    ],
  }),
  component: CollectionPage,
});
function CollectionPage() {
  return (
    <main className="min-h-screen bg-cream text-charcoal pt-32 pb-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal/50">Hive Signature Collection</p>
        <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,7rem)] leading-[0.95]">The Collection</h1>
        <p className="mt-10 max-w-2xl text-lg leading-relaxed text-charcoal/70">
          Inventory grid coming next — wired to your Supabase once you connect it.
        </p>
      </div>
    </main>
  );
}

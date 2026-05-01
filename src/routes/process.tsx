import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/process")({
  head: () => ({
    meta: [{ title: "Process — Eclectic Hive" }, { name: "description", content: "How we work: discovery, design, fabrication, install." }],
  }),
  component: () => (
    <main className="min-h-screen bg-cream text-charcoal pt-32 pb-32">
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal/50">Process</p>
        <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,6rem)] leading-[0.95]">How we work.</h1>
      </div>
    </main>
  ),
});

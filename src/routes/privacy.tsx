import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy — Eclectic Hive" }],
  }),
  component: () => (
    <main
      className="min-h-screen bg-cream text-charcoal pt-32 pb-32"
      style={{ paddingTop: "calc(var(--nav-h) + 2rem)" }}
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal/50">Privacy</p>
        <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,6rem)] leading-[0.95]">Privacy.</h1>
      </div>
    </main>
  ),
});

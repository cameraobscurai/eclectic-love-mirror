import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/studio/lab")({
  head: () => ({
    meta: [
      { title: "Creative Lab · Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LabPage,
});

function LabPage() {
  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header className="px-6 lg:px-16 pt-10 pb-6 border-b border-charcoal/10 flex items-center justify-between">
        <Link to="/admin/studio" className="text-[10px] uppercase tracking-[0.28em] text-charcoal/50 hover:text-charcoal inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> Studio
        </Link>
        <div className="flex items-baseline gap-3">
          <Sparkles className="h-4 w-4 text-charcoal/60" />
          <h1 className="font-display text-2xl uppercase tracking-[0.04em]">Lab</h1>
          <span className="text-[9px] uppercase tracking-[0.28em] px-2 py-1 border border-charcoal/15 text-charcoal/40">Soon</span>
        </div>
      </header>

      <section className="px-6 lg:px-16 py-16">
        <div className="border border-dashed border-charcoal/20 aspect-video grid place-items-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/40">Empty</p>
        </div>
      </section>
    </div>
  );
}


import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/studio/lab")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
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
      <header className="px-6 lg:px-16 pt-12 pb-10 border-b border-charcoal/10">
        <Link to="/studio" className="text-[10px] uppercase tracking-[0.24em] text-charcoal/55 hover:text-charcoal inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> Studio
        </Link>
        <div className="mt-6 flex items-baseline gap-4">
          <Sparkles className="h-5 w-5 text-charcoal/60" />
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Creative Lab</h1>
          <span className="text-[9px] uppercase tracking-[0.28em] px-2 py-1 border border-charcoal/15 text-charcoal/40">Soon</span>
        </div>
        <p className="mt-3 max-w-xl text-[11px] uppercase tracking-[0.18em] text-charcoal/55">
          Mood, palette, generative exploration. The room behind the room.
        </p>
      </header>

      <section className="px-6 lg:px-16 py-20">
        <div className="border border-dashed border-charcoal/20 aspect-video grid place-items-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/40">Workspace placeholder</p>
        </div>
      </section>
    </div>
  );
}

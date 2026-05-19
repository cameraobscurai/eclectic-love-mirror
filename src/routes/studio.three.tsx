import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box } from "lucide-react";
import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/studio/three")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "3D Models · Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ThreePage,
});

function ThreePage() {
  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header className="px-6 lg:px-16 pt-12 pb-10 border-b border-charcoal/10">
        <Link to="/studio" className="text-[10px] uppercase tracking-[0.24em] text-charcoal/55 hover:text-charcoal inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" /> Studio
        </Link>
        <div className="mt-6 flex items-baseline gap-4">
          <Box className="h-5 w-5 text-charcoal/60" />
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">3D Models</h1>
          <span className="text-[9px] uppercase tracking-[0.28em] px-2 py-1 border border-charcoal/15 text-charcoal/40">Soon</span>
        </div>
        <p className="mt-3 max-w-xl text-[11px] uppercase tracking-[0.18em] text-charcoal/55">
          Drop a glTF / USDZ, walk the piece, share a viewer link.
        </p>
      </header>

      <section className="px-6 lg:px-16 py-20">
        <div className="border border-dashed border-charcoal/20 aspect-video grid place-items-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-charcoal/40">Viewer placeholder</p>
        </div>
      </section>
    </div>
  );
}

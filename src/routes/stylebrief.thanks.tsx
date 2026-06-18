import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Check } from "lucide-react";

export const Route = createFileRoute("/stylebrief/thanks")({
  validateSearch: (s) => z.object({ inquiry: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Brief Received · Studio — Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ThanksPage,
});

function ThanksPage() {
  return (
    <div className="min-h-screen bg-cream text-charcoal grid place-items-center px-6 pt-[10vh]">
      <div className="max-w-md text-center">
        <div className="mx-auto w-10 h-10 border border-charcoal/30 grid place-items-center mb-6">
          <Check className="h-4 w-4" />
        </div>
        <h1 className="font-display text-3xl uppercase tracking-[0.06em]">
          Brief Received
        </h1>
        <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-charcoal/60 leading-relaxed">
          We'll be in touch within 24 hours.
        </p>
        <div className="mt-10 flex items-center justify-center gap-6">
          <Link
            to="/collection"
            className="text-[10px] uppercase tracking-[0.24em] text-charcoal/60 hover:text-charcoal underline-offset-4 hover:underline"
          >
            Browse Collection
          </Link>
          <Link
            to="/"
            className="text-[10px] uppercase tracking-[0.24em] text-charcoal/60 hover:text-charcoal underline-offset-4 hover:underline"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

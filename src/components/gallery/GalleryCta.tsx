import { Link } from "@tanstack/react-router";

export function GalleryCta() {
  return (
    <section className="py-16 lg:py-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-cream/40 text-xs uppercase tracking-[0.3em] mb-6">
          — Next
        </p>
        <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-cream font-light uppercase tracking-[0.18em] leading-[1.2] mb-10">
          Considering an environment of your own?
        </h2>
        <Link
          to="/contact"
          className="group inline-flex items-center gap-3 px-8 py-4 bg-cream text-charcoal text-xs uppercase tracking-[0.2em] hover:bg-sand transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/60"
        >
          Begin a conversation
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}

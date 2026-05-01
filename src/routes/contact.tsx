import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Eclectic Hive" },
      { name: "description", content: "Get in touch with Eclectic Hive — luxury event design, fabrication, and rental from Denver, Colorado." },
      { property: "og:title", content: "Contact — Eclectic Hive" },
      { property: "og:description", content: "Inquiries: hello@eclectichive.com." },
    ],
  }),
  component: ContactPage,
});
function ContactPage() {
  return (
    <main className="min-h-screen bg-cream text-charcoal pt-32 pb-32">
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal/50">Contact</p>
        <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,6rem)] leading-[0.95]">Let's begin.</h1>
        <p className="mt-10 text-lg leading-relaxed text-charcoal/70">
          Tell us about your event. We'll respond within two business days.
        </p>
        <div className="mt-12 space-y-4 text-charcoal/80">
          <p>
            <span className="block text-xs uppercase tracking-[0.2em] text-charcoal/40">Email</span>
            <a className="editorial-link" href="mailto:hello@eclectichive.com">hello@eclectichive.com</a>
          </p>
          <p>
            <span className="block text-xs uppercase tracking-[0.2em] text-charcoal/40">Studio</span>
            Denver, Colorado
          </p>
        </div>
      </div>
    </main>
  );
}

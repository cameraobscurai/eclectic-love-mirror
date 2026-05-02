import { createFileRoute } from "@tanstack/react-router";

const FAQ_ITEMS = [
  {
    q: "What we offer",
    a: "Full-service design, fabrication, and production — or rental-only access to the Hive Signature Collection. Engagements include space planning + CAD, 3-D modeling, vendor management, on-site logistics, and run of show.",
  },
  {
    q: "How to begin a proposal",
    a: "After a consultation call we'll prepare a one to two-page Style Guide that visually summarizes the design direction. A non-refundable Creative Services Fee and signed contract secures the date and unlocks the full proposal and detailed estimate.",
  },
  {
    q: "Travel",
    a: "Eclectic Hive is a destination design house. Projects take us domestic and international — desert, mountains, and the Caribbean. Travel fees include accommodations, per diems, and mileage.",
  },
  {
    q: "Minimums",
    a: "We don't set fixed minimums. Availability shifts with the team's existing committed work and the seasonality of inquiries. Each opportunity is reviewed together to make sure we can deliver the requested scope.",
  },
];

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Eclectic Hive" },
      {
        name: "description",
        content:
          "Get in touch with Eclectic Hive — luxury event design, fabrication, and rental from Denver, Colorado.",
      },
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
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal/50">
          CONTACT
        </p>
        <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,6rem)] leading-[0.95] uppercase tracking-[0.04em]">
          Let's begin.
        </h1>
        <p className="mt-10 text-lg leading-relaxed text-charcoal/70">
          Tell us about your event. We'll respond within two business days.
        </p>
        <div className="mt-12 space-y-4 text-charcoal/80">
          <p>
            <span className="block text-xs uppercase tracking-[0.22em] text-charcoal/40">
              EMAIL
            </span>
            <a className="editorial-link" href="mailto:hello@eclectichive.com">
              hello@eclectichive.com
            </a>
          </p>
          <p>
            <span className="block text-xs uppercase tracking-[0.22em] text-charcoal/40">
              STUDIO
            </span>
            Denver, Colorado
          </p>
        </div>

        {/* FAQ — anchor target for /contact#faq */}
        <section id="faq" className="mt-24 scroll-mt-32">
          <div
            className="border-t pt-10"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              FREQUENTLY ASKED
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight">
              Working with the studio.
            </h2>

            <ul
              className="mt-10 divide-y"
              style={{ borderColor: "var(--archive-rule)" }}
            >
              {FAQ_ITEMS.map((item) => (
                <li
                  key={item.q}
                  className="border-t first:border-t-0"
                  style={{ borderColor: "var(--archive-rule)" }}
                >
                  <details className="group">
                    <summary className="flex items-baseline justify-between gap-4 py-5 cursor-pointer list-none focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream">
                      <span className="font-display text-xl tracking-tight">
                        {item.q}
                      </span>
                      <span
                        aria-hidden
                        className="text-charcoal/45 text-lg transition-transform group-open:rotate-45 select-none"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-6 max-w-2xl text-[15px] leading-relaxed text-charcoal/75">
                      {item.a}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

const JOBS = [
  {
    title: "Fabricator & Set Design",
    location: "Denver, Colorado",
    href: "https://www.indeed.com/viewjob?cmp=Eclectic-Hive-Event-Design&t=Project+Manager&jk=78a3e58fbf2fb6ef&q=eclectic+hive&xpse=SoCh67I3gsoOyZATiL0LbzkdCdPP&xfps=acdca76f-3ee8-442e-b170-a7793731cd9e&xkcb=SoBR67M3gsXxZpxXYp0KbzkdCdPP&vjs=3",
  },
  {
    title: "Project Manager - Events",
    location: "Denver, Colorado",
    href: "https://www.indeed.com/viewjob?cmp=Eclectic-Hive-Event-Design&t=Set+Designer&jk=af09123fee4150ab&q=eclectic+hive&xpse=SoBX67I3gsoPNggNDz0LbzkdCdPP&xfps=8058ef96-2784-47ea-a402-5c066345a650&xkcb=SoDl67M3gsXxZpxXYp0KbzkdCdPP&vjs=3",
  },
] as const;

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Eclectic Hive" },
      {
        name: "description",
        content:
          "Join Eclectic Hive. Open roles in fabricator & set design and project management for events in Denver, Colorado.",
      },
      { property: "og:title", content: "Careers — Eclectic Hive" },
      {
        property: "og:description",
        content:
          "Join Eclectic Hive. Open roles in fabricator & set design and project management for events in Denver, Colorado.",
      },
      { property: "og:url", content: "https://eclectichive.com/careers" },
    ],
    links: [{ rel: "canonical", href: "https://eclectichive.com/careers" }],
  }),
  component: CareersPage,
});

function CareersPage() {
  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{ paddingTop: "calc(var(--nav-h) + 2rem)" }}
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <header className="pb-12">
          <p className="text-[11px] uppercase tracking-[0.32em] text-charcoal/50">
            Join the hive
          </p>
          <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,6rem)] leading-[0.95]">
            Careers.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-[1.75] text-charcoal/70">
            We build cinematic, art-forward environments for weddings, galas, and
            corporate events. If you craft with precision and think in scale, we
            want to hear from you.
          </p>
        </header>

        <section className="border-t border-charcoal/15 pt-10">
          <h2 className="text-[11px] uppercase tracking-[0.28em] text-charcoal/55 mb-8">
            Open positions
          </h2>

          <div className="space-y-6">
            {JOBS.map((job) => (
              <a
                key={job.href}
                href={job.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border border-charcoal/15 bg-white/40 hover:bg-white transition-colors duration-300"
              >
                <div className="px-6 py-6 sm:px-8 sm:py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl tracking-[0.02em] text-charcoal">
                      {job.title}
                    </h3>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-charcoal/55">
                      {job.location}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.28em] text-charcoal/70 group-hover:text-charcoal transition-colors">
                    View on Indeed →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="border-t border-charcoal/15 pt-10 mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.28em] text-charcoal/55 mb-4">
            Don't see a fit?
          </h2>
          <p className="text-[15px] leading-[1.75] text-charcoal/80">
            Send your portfolio and a note about what you bring to the team.
          </p>
          <p className="mt-4">
            <a
              href="mailto:info@eclectichive.com?subject=Careers%20%7C%20Eclectic%20Hive"
              className="text-[11px] uppercase tracking-[0.28em] border-b border-charcoal/40 pb-1 hover:border-charcoal transition-colors"
            >
              EMAIL US →
            </a>
          </p>
          <p className="mt-6">
            <Link
              to="/contact"
              className="text-[11px] uppercase tracking-[0.28em] no-underline border-b border-charcoal/40 pb-1 hover:border-charcoal transition-colors"
            >
              CONTACT FORM →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

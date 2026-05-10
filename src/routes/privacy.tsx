import { createFileRoute, Link } from "@tanstack/react-router";

const EFFECTIVE_DATE = "May 10, 2026";

const SECTION_LABEL =
  "text-[11px] uppercase tracking-[0.28em] text-charcoal/55 mb-4";
const SECTION_WRAP = "border-t border-charcoal/15 pt-10";
const PROSE =
  "text-[15px] leading-[1.75] text-charcoal/80 space-y-4 [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-charcoal/30 hover:[&_a]:decoration-charcoal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Eclectic Hive" },
      {
        name: "description",
        content:
          "How Eclectic Hive collects, uses, and protects information from visitors and clients of eclectichive.com.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{ paddingTop: "calc(var(--nav-h) + 2rem)" }}
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <header className="pb-12">
          <p className="text-[11px] uppercase tracking-[0.32em] text-charcoal/50">
            PRIVACY
          </p>
          <h1 className="mt-6 font-brand text-[clamp(3rem,8vw,6rem)] leading-[0.95]">
            Privacy.
          </h1>
          <p className="mt-8 text-[11px] uppercase tracking-[0.28em] text-charcoal/55">
            EFFECTIVE {EFFECTIVE_DATE.toUpperCase()}
          </p>
        </header>

        {/* Intro */}
        <section className={SECTION_WRAP}>
          <div className={PROSE}>
            <p>
              Eclectic Hive (&ldquo;Eclectic Hive,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is an event design and
              production studio based in Denver, Colorado. This Privacy Policy
              explains how we collect, use, and share information when you visit{" "}
              <a href="https://eclectichive.com">eclectichive.com</a>, send us
              an inquiry, or otherwise engage with our studio.
            </p>
            <p>
              By using our site or contacting us, you agree to the practices
              described below.
            </p>
          </div>
        </section>

        {/* Information we collect */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>INFORMATION WE COLLECT</h2>
          <div className={PROSE}>
            <p>
              <strong>Information you give us.</strong> When you submit a
              contact or inquiry form, we collect the details you choose to
              share &mdash; typically your name, email address, phone number,
              event date, location, and a description of your project. If you
              email us directly, we receive whatever information is in that
              correspondence.
            </p>
            <p>
              <strong>Information collected automatically.</strong> Like most
              websites, we automatically log basic technical information when
              you visit, including your IP address, browser type, device, pages
              viewed, and referring site. This is used to keep the site
              running well and to understand, in aggregate, how visitors use it.
            </p>
            <p>
              <strong>Cookies.</strong> We use a small number of cookies and
              similar technologies that are either essential to the site
              functioning or that help us measure traffic. Most browsers let
              you refuse or delete cookies; doing so may affect how the site
              behaves.
            </p>
          </div>
        </section>

        {/* How we use it */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW WE USE INFORMATION</h2>
          <div className={PROSE}>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Respond to inquiries and prepare proposals.</li>
              <li>
                Communicate with you about your project, contracts, scheduling,
                and invoicing.
              </li>
              <li>
                Operate, maintain, and improve our website and our services.
              </li>
              <li>
                Comply with legal obligations and protect our rights, our
                clients, and our team.
              </li>
            </ul>
            <p>
              We do not use your information for automated decision-making and
              we do not sell personal information.
            </p>
          </div>
        </section>

        {/* Sharing */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW WE SHARE INFORMATION</h2>
          <div className={PROSE}>
            <p>
              We share information only with the parties needed to run the
              studio and the website:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Service providers</strong> who host our website,
                deliver email, store files, process payments, or provide
                analytics, all under reasonable confidentiality terms.
              </li>
              <li>
                <strong>Production partners</strong> &mdash; vendors,
                fabricators, venues, and contractors &mdash; only to the extent
                needed to deliver your event.
              </li>
              <li>
                <strong>Legal and safety</strong> disclosures when required by
                law, subpoena, or to protect rights, property, or safety.
              </li>
              <li>
                <strong>Business transfers</strong> in connection with a
                merger, acquisition, or sale of assets.
              </li>
            </ul>
          </div>
        </section>

        {/* Retention */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>DATA RETENTION</h2>
          <div className={PROSE}>
            <p>
              We retain inquiry and client information for as long as our
              relationship is active and for a reasonable period afterward to
              maintain records, complete tax and accounting obligations, and
              support repeat clients. You may request deletion at any time
              (see &ldquo;Your Rights&rdquo; below).
            </p>
          </div>
        </section>

        {/* Rights */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>YOUR CHOICES &amp; RIGHTS</h2>
          <div className={PROSE}>
            <p>
              You may ask us to access, correct, or delete the personal
              information we hold about you, and you may opt out of marketing
              messages at any time by replying to any email or writing to us
              directly.
            </p>
            <p>
              <strong>California residents.</strong> California law gives you
              the right to request the categories of personal information we
              have collected about you, the purposes for which it was used,
              and the right to request deletion, subject to certain exceptions.
              We will not discriminate against you for exercising these rights.
              To make a request, email{" "}
              <a href="mailto:info@eclectichive.com">info@eclectichive.com</a>.
            </p>
          </div>
        </section>

        {/* Security */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>SECURITY</h2>
          <div className={PROSE}>
            <p>
              We use reasonable administrative, technical, and physical
              safeguards to protect the information we collect. No method of
              transmission or storage is fully secure, and we cannot guarantee
              absolute security.
            </p>
          </div>
        </section>

        {/* Children */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CHILDREN</h2>
          <div className={PROSE}>
            <p>
              Our site is not directed to children under 13, and we do not
              knowingly collect personal information from children. If you
              believe a child has provided us with personal information, please
              contact us and we will delete it.
            </p>
          </div>
        </section>

        {/* Third-party links */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>THIRD-PARTY LINKS</h2>
          <div className={PROSE}>
            <p>
              Our site may link to third-party websites. We are not responsible
              for their content or privacy practices, and we encourage you to
              read their policies before sharing information.
            </p>
          </div>
        </section>

        {/* Changes */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CHANGES TO THIS POLICY</h2>
          <div className={PROSE}>
            <p>
              We may update this Privacy Policy from time to time. When we do,
              we will revise the effective date at the top of this page.
              Material changes will be highlighted on the site or communicated
              directly when appropriate.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CONTACT US</h2>
          <div className={PROSE}>
            <p>
              Questions, requests, or concerns about this policy or your
              information? We would rather hear from you than not.
            </p>
            <p>
              Eclectic Hive
              <br />
              Denver, Colorado
              <br />
              <a href="mailto:info@eclectichive.com">info@eclectichive.com</a>
            </p>
            <p className="pt-4">
              <Link
                to="/contact"
                className="text-[11px] uppercase tracking-[0.28em] no-underline border-b border-charcoal/40 pb-1 hover:border-charcoal"
              >
                START A CONVERSATION →
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

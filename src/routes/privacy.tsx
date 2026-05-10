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
          "Privacy Policy for Eclectic Hive: how we collect, use, disclose, retain, and protect personal information.",
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
            PRIVACY POLICY
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
              describes how we collect, use, disclose, and safeguard personal
              information when you visit{" "}
              <a href="https://eclectichive.com">eclectichive.com</a> (the
              &ldquo;Site&rdquo;), submit an inquiry, or otherwise interact
              with our studio (collectively, the &ldquo;Services&rdquo;).
            </p>
            <p>
              By accessing the Site or providing information to us, you
              acknowledge that you have read and understood this Privacy
              Policy. If you do not agree with its terms, please do not use
              the Services.
            </p>
          </div>
        </section>

        {/* Information we collect */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>INFORMATION WE COLLECT</h2>
          <div className={PROSE}>
            <p>
              <strong>Information you provide.</strong> We collect information
              you submit through inquiry forms, email, or other communications,
              which may include your name, email address, telephone number,
              event date, event location, budget range, and project details.
            </p>
            <p>
              <strong>Information collected automatically.</strong> When you
              access the Site, we and our service providers may automatically
              collect certain technical information, including IP address,
              device identifiers, browser type and version, operating system,
              referring URLs, pages viewed, and timestamps.
            </p>
            <p>
              <strong>Cookies and similar technologies.</strong> We use
              cookies, pixels, and similar technologies that are strictly
              necessary for the Site to function and, where applicable, to
              measure traffic and performance. You may manage cookies through
              your browser settings; disabling certain cookies may impair
              functionality.
            </p>
          </div>
        </section>

        {/* How we use it */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW WE USE INFORMATION</h2>
          <div className={PROSE}>
            <p>We process personal information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To respond to inquiries and provide proposals, quotes, and other requested information.</li>
              <li>To negotiate, perform, and administer contracts, including scheduling, invoicing, and event delivery.</li>
              <li>To operate, maintain, secure, and improve the Site and Services.</li>
              <li>To prevent fraud, enforce our terms, and protect the rights, property, and safety of Eclectic Hive, our clients, and our personnel.</li>
              <li>To comply with applicable laws, regulations, and legal process.</li>
            </ul>
            <p>
              We do not sell personal information, and we do not engage in
              automated decision-making that produces legal or similarly
              significant effects.
            </p>
          </div>
        </section>

        {/* Sharing */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>HOW WE DISCLOSE INFORMATION</h2>
          <div className={PROSE}>
            <p>
              We disclose personal information only as described below and
              under appropriate confidentiality obligations:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Service providers</strong> that perform functions on
                our behalf, including website hosting, email delivery, file
                storage, analytics, and payment processing.
              </li>
              <li>
                <strong>Production partners</strong>, including vendors,
                fabricators, venues, and contractors, solely to the extent
                necessary to design and deliver your event.
              </li>
              <li>
                <strong>Legal, regulatory, and safety</strong> disclosures
                where required by law, subpoena, court order, or other legal
                process, or where we believe disclosure is necessary to
                protect rights, property, or safety.
              </li>
              <li>
                <strong>Business transactions</strong> in connection with a
                merger, acquisition, financing, reorganization, or sale of
                assets, subject to customary confidentiality protections.
              </li>
            </ul>
          </div>
        </section>

        {/* Retention */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>DATA RETENTION</h2>
          <div className={PROSE}>
            <p>
              We retain personal information for as long as necessary to
              fulfill the purposes for which it was collected, including to
              provide the Services, maintain business records, resolve
              disputes, and comply with legal, tax, accounting, and
              regulatory obligations. When information is no longer required,
              we will delete or anonymize it in accordance with our retention
              practices.
            </p>
          </div>
        </section>

        {/* Rights */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>YOUR CHOICES &amp; RIGHTS</h2>
          <div className={PROSE}>
            <p>
              Subject to applicable law, you may request access to, correction
              of, or deletion of personal information we hold about you, and
              you may opt out of marketing communications at any time by
              following the unsubscribe instructions in any message or by
              contacting us directly.
            </p>
            <p>
              <strong>California residents.</strong> The California Consumer
              Privacy Act, as amended, provides California residents with
              certain rights regarding their personal information, including
              the right to know what categories and specific pieces of
              personal information we have collected, the sources from which
              it was collected, the business or commercial purposes for
              collection, and the categories of third parties with whom it is
              shared; the right to request deletion or correction; and the
              right to opt out of the sale or sharing of personal information.
              We do not sell or share personal information as those terms are
              defined under California law. We will not discriminate against
              you for exercising these rights. To submit a verifiable consumer
              request, contact{" "}
              <a href="mailto:info@eclectichive.com">info@eclectichive.com</a>.
            </p>
          </div>
        </section>

        {/* Security */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>SECURITY</h2>
          <div className={PROSE}>
            <p>
              We maintain reasonable administrative, technical, and physical
              safeguards designed to protect personal information against
              unauthorized access, disclosure, alteration, and destruction.
              However, no method of transmission over the internet or method
              of electronic storage is completely secure, and we cannot
              guarantee absolute security.
            </p>
          </div>
        </section>

        {/* Children */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CHILDREN&apos;S PRIVACY</h2>
          <div className={PROSE}>
            <p>
              The Services are not directed to children under 13, and we do
              not knowingly collect personal information from children under
              13. If we become aware that we have collected such information
              without verifiable parental consent, we will take steps to
              delete it promptly.
            </p>
          </div>
        </section>

        {/* Third-party links */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>THIRD-PARTY LINKS &amp; SERVICES</h2>
          <div className={PROSE}>
            <p>
              The Site may contain links to third-party websites, products,
              or services that are not operated by Eclectic Hive. We are not
              responsible for the content, privacy practices, or security of
              any third party. We encourage you to review the privacy
              policies of any third party before providing personal
              information.
            </p>
          </div>
        </section>

        {/* International */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>INTERNATIONAL USERS</h2>
          <div className={PROSE}>
            <p>
              The Services are operated from the United States. If you access
              the Services from outside the United States, you understand and
              agree that your information may be transferred to, stored, and
              processed in the United States, where data protection laws may
              differ from those in your jurisdiction.
            </p>
          </div>
        </section>

        {/* Changes */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CHANGES TO THIS POLICY</h2>
          <div className={PROSE}>
            <p>
              We may update this Privacy Policy from time to time. The
              effective date at the top of this page indicates when the
              policy was last revised. Material changes will be posted on
              this page and, where appropriate, communicated through other
              channels. Your continued use of the Services following any
              update constitutes acceptance of the revised policy.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className={`${SECTION_WRAP} mt-12`}>
          <h2 className={SECTION_LABEL}>CONTACT US</h2>
          <div className={PROSE}>
            <p>
              For questions or requests regarding this Privacy Policy or our
              handling of personal information, please contact:
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
                CONTACT FORM →
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
